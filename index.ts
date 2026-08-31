#! /usr/bin/env bun

import { cancel, confirm, intro, isCancel, log, outro, select, spinner } from '@clack/prompts';
import { $ } from 'bun';
import { blue, blueBright, bold, gray, green, yellow } from 'picocolors';

import {
  detectPackageManager,
  getGloballyInstalledPMs,
  hasGlobalInstallation,
  installDependencies,
  type PM,
} from './utils';

enum Template {
  ReactTypeScript = 'react-typescript',
  ReactNativeTypeScript = 'react-native-typescript',
  TypeScript = 'typescript',
  JavaScript = 'javascript',
}

type PluginEntry = {
  name: string;
  packageName: string;
  templates: Template[];
};

const PLUGINS = [
  {
    name: 'React Doctor',
    packageName: 'oxlint-plugin-react-doctor',
    templates: [Template.ReactTypeScript, Template.ReactNativeTypeScript],
  },
  {
    name: 'Golden',
    packageName: 'oxlint-plugin-golden',
    templates: [Template.ReactTypeScript, Template.ReactNativeTypeScript, Template.TypeScript],
  },
] satisfies PluginEntry[];

async function main() {
  const argv = process.argv.slice(2);
  let template = argv[0] as Template | undefined;

  intro(bold(blueBright(`oxc-configs`)) + ' ' + gray('•') + ' ' + blue(`OXC toolset pre-made/opinionated configs`));

  if (!template) {
    const selectedTemplate = await select<Template>({
      message: 'Select an OXC toolset configs template to download:',
      options: [
        {
          value: Template.ReactTypeScript,
          label: 'React + TypeScript',
        },
        {
          value: Template.ReactNativeTypeScript,
          label: 'React Native + TypeScript',
        },
        {
          value: Template.TypeScript,
          label: 'TypeScript',
        },
        {
          value: Template.JavaScript,
          label: 'JavaScript',
        },
      ],
      showInstructions: false,
    });

    if (isCancel(selectedTemplate)) {
      cancel('No template has been selected.');
      process.exit(0);
    }

    template = selectedTemplate;
  }

  if (!template || !Object.values(Template).includes(template)) {
    log.error(`Unknown template: ${bold(template)}\n`);
    process.exit(1);
  }

  const packageJson = Bun.file('./package.json');
  const packageJsonExist = await packageJson.exists();
  const packageJsonContent = packageJsonExist ? await packageJson.json() : null;
  const devDependencies = packageJsonContent?.devDependencies ?? {};
  const hasOxcToolsInstalled = 'oxlint' in devDependencies && 'oxfmt' in devDependencies;
  const hasOxcTSGoLintInstalled = 'oxlint-tsgolint' in devDependencies;
  const missingPlugins = PLUGINS.filter(
    plugin =>
      plugin.templates.some(pluginTemplate => pluginTemplate === template) && !(plugin.packageName in devDependencies)
  );
  const missingPluginsMessage =
    missingPlugins.length > 0
      ? yellow(`(Missing dependencies: ${missingPlugins.map(plugin => `${plugin.name} Oxlint plugin`).join(', ')})`)
      : '';

  const installDeps = await confirm({
    message: `Do you want to ${hasOxcToolsInstalled ? 'update' : 'install'} OXC dependencies? ${missingPluginsMessage}`,
    vertical: true,
  });

  if (isCancel(installDeps)) {
    cancel(`Dependencies ${hasOxcToolsInstalled ? 'update' : 'installation'} process has been cancelled.`);
    process.exit(0);
  }

  if (installDeps) {
    let pm = await detectPackageManager();

    if (!pm) {
      const pms = await getGloballyInstalledPMs();
      const selectedPM = await select<PM>({
        message: 'The current project has no lockfile. Which package manager would you like to use?',
        options: Object.entries(pms)
          .map(([pm, isInstalled]) => {
            if (isInstalled) {
              return {
                value: pm,
                label: pm,
              };
            }
            return undefined;
          })
          .filter((option): option is { value: PM; label: PM } => option !== undefined),
      });

      if (isCancel(selectedPM)) {
        cancel('Installation preparation has been cancelled.');
        process.exit(0);
      }

      pm = selectedPM;
    }

    if (!(await hasGlobalInstallation(pm))) {
      cancel(`A ${pm} lockfile was detected, but ${pm} does not appear to be installed.`);
      process.exit(1);
    }

    let includeTypeAwareLinting = hasOxcTSGoLintInstalled;

    if (template !== Template.JavaScript && !hasOxcTSGoLintInstalled) {
      const typeAware = await confirm({
        message: 'Do you want to enable type-aware linting?',
        vertical: true,
      });

      if (isCancel(typeAware)) {
        cancel('OXC dependencies setup process has been cancelled.');
        process.exit(0);
      }

      includeTypeAwareLinting = typeAware;
    }

    await installDependencies(pm, buildOxcDependencies(template, includeTypeAwareLinting), hasOxcToolsInstalled);
  }

  await fetchConfigsFromRepo(template, '.oxfmtrc.json');
  await fetchConfigsFromRepo(template, '.oxlintrc.json');

  await $`bunx oxfmt@latest .oxfmtrc.json .oxlintrc.json`.quiet();

  outro(green('All done!'));
}

function buildOxcDependencies(template: Template, includeTypeAwareLinting: boolean): string[] {
  return [
    'oxlint',
    'oxfmt',
    ...(includeTypeAwareLinting ? ['oxlint-tsgolint'] : []),
    ...PLUGINS.filter(plugin => plugin.templates.some(pluginTemplate => pluginTemplate === template)).map(
      plugin => plugin.packageName
    ),
  ];
}

async function fetchConfigsFromRepo(template: Template, fileName: string) {
  let replaceFile: boolean | symbol = true;

  if (await Bun.file(fileName).exists()) {
    replaceFile = await confirm({
      message: `${bold(fileName)} already exists. Do you want to replace it with the template?`,
      vertical: true,
    });

    if (isCancel(replaceFile)) {
      cancel('Config file replacement has been cancelled.');
      process.exit(0);
    }
  }

  if (!replaceFile) {
    log.info(`Skipping ${bold(fileName)} config file.`);
  } else {
    const progress = spinner();
    progress.start(`Fetching ${bold(fileName)} config file...`);

    const configContent = await fetch(
      `https://raw.githubusercontent.com/simek/oxc-configs/HEAD/${template}/${fileName}`
    );

    const config = await configContent.json();
    await Bun.write(fileName, JSON.stringify(config));

    progress.stop(`${bold(fileName)} fetched and written.`);
  }
}

main().catch(err => {
  log.error(err);
  process.exit(1);
});
