#! /usr/bin/env bun

import { cancel, intro, isCancel, log, outro, select, spinner } from '@clack/prompts';
import { $ } from 'bun';
import { bold, green, red, yellow } from 'picocolors';

enum Template {
  ReactTypeScript = 'react-typescript',
  TypeScript = 'typescript',
  JavaScript = 'javascript',
}

async function main() {
  const argv = process.argv.slice(2);
  let template: string | symbol | undefined = argv[0];

  intro(yellow(`@simek/oxc-configs`));

  await checkGHCLIAvailability();

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

  await fetchConfigsFromRepo(template, '.oxfmtrc.json');
  await fetchConfigsFromRepo(template, '.oxlintrc.json');

  outro(green('All done!'));
}

export async function checkGHCLIAvailability() {
  try {
    await $`gh auth status`.quiet();
  } catch (error) {
    if (error instanceof $.ShellError) {
      const message = error.stderr.toString();
      if (message.includes('You are not logged')) {
        log.error(red(message));
      } else {
        log.error(red('GitHub CLI need to be installed on your system, see: https://cli.github.com/.'));
      }
    }
    process.exit(1);
  }
}

export async function fetchConfigsFromRepo(template: string, fileName: string) {
  let replaceFile: 'yes' | 'no' | symbol = 'yes';

  if (await Bun.file(fileName).exists()) {
    replaceFile = await select({
      message: `${bold(fileName)} already exists. Do you want to replace its content with the template?`,
      options: [
        { value: 'no', label: 'No' },
        { value: 'yes', label: 'Yes' },
      ],
    });

    if (isCancel(replaceFile)) {
      cancel('Replacement cancelled.');
      process.exit(0);
    }
  }

  if (replaceFile === 'no') {
    log.info(`Ignoring ${bold(fileName)} config file.`);
  } else {
    const progress = spinner();
    progress.start(`Fetching ${bold(fileName)} config file...`);

    const configContent = await $`gh api repos/simek/oxc-configs/contents/${template}/.oxfmtrc.json -q .content`.text();

    const config = JSON.parse(atob(configContent));

    await Bun.write(fileName, JSON.stringify(config, null, 2));

    progress.stop(`${bold(fileName)} fetched and written`);
  }
}

main().catch(err => {
  log.error(err);
  process.exit(1);
});
