#! /usr/bin/env bun

import { cancel, confirm, intro, isCancel, log, outro, select, spinner } from '@clack/prompts';
import { $ } from 'bun';
import { bold, green, yellow } from 'picocolors';

import {
  detectPackageManager,
  getGloballyInstalledPMs,
  hasGlobalInstallation,
  installDependencies,
  type PM,
} from './utils';

enum Template {
  ReactTypeScript = 'react-typescript',
  TypeScript = 'typescript',
  JavaScript = 'javascript',
}

async function main() {
  const argv = process.argv.slice(2);
  let template: string | symbol | undefined = argv[0];

  intro(yellow(`oxc-configs`));

  if (!template) {
    template = await select({
      message: 'Select OXC toolset configs template to download:',
      options: [
        {
          value: Template.ReactTypeScript,
          label: 'React + TypeScript',
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
    });

    if (isCancel(template)) {
      cancel('No template has been selected.');
      process.exit(0);
    }
  }

  if (!Object.values(Template).includes(template as Template)) {
    log.error(`Unknown template: ${bold(template)}\n`);
    process.exit(1);
  }

  const installDeps = await confirm({
    message: 'Do you want to install or update OXC dependencies?',
  });

  if (isCancel(installDeps)) {
    cancel('Dependencies installation process has been cancelled.');
    process.exit(0);
  }

  if (installDeps) {
    let pm = await detectPackageManager();

    if (!pm) {
      const pms = await getGloballyInstalledPMs();
      const selectedPM = await select<PM>({
        message:
          'Looks like current project does not have any lock file. Which package manager you want to use for the installation?',
        options: Object.entries(pms)
          .map(([pm, isInstalled]: [PM, boolean]) => {
            if (isInstalled) {
              return {
                value: pm,
                label: pm,
              };
            }
            return undefined;
          })
          .filter(Boolean),
      });

      if (isCancel(selectedPM)) {
        cancel('Installation preparation has been cancelled.');
        process.exit(0);
      }

      pm = selectedPM;
    }

    if (!(await hasGlobalInstallation(pm))) {
      cancel(`The ${pm} lock has been detected but package manager seems to not be installed.`);
      process.exit(1);
    }

    if ((template as Template) !== Template.JavaScript) {
      const typeAware = await confirm({
        message: 'Do you want to enable type aware linting?',
      });

      if (isCancel(typeAware)) {
        cancel('OXC dependencies setup process has been cancelled.');
        process.exit(0);
      }

      if (typeAware) {
        await installDependencies(pm, ['oxlint', 'oxfmt', 'oxlint-tsgolint']);
      } else {
        await installDependencies(pm, ['oxlint', 'oxfmt']);
      }
    } else {
      await installDependencies(pm, ['oxlint', 'oxfmt']);
    }
  }

  await fetchConfigsFromRepo(template, '.oxfmtrc.json');
  await fetchConfigsFromRepo(template, '.oxlintrc.json');

  await $`bunx --silent oxfmt@latest .oxfmtrc.json .oxlintrc.json`;

  outro(green('All done!'));
}

async function fetchConfigsFromRepo(template: string, fileName: string) {
  let replaceFile: boolean | symbol = true;

  if (await Bun.file(fileName).exists()) {
    replaceFile = await confirm({
      message: `${bold(fileName)} already exists. Do you want to replace its content with the template?`,
    });

    if (isCancel(replaceFile)) {
      cancel('Replacement cancelled.');
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
