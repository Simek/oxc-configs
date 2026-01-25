#! /usr/bin/env bun

import { cancel, intro, isCancel, log, outro, select, spinner } from '@clack/prompts';
import { $ } from 'bun';
import { bold, green, yellow } from 'picocolors';

enum Template {
  ReactTypeScript = 'react-typescript',
  TypeScript = 'typescript',
  JavaScript = 'javascript',
}

async function main() {
  const argv = process.argv.slice(2);
  let template: string | symbol | undefined = argv[0];

  intro(yellow(`@simek/oxc-configs`));

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

  await $`bunx --silent oxfmt@latest .oxfmtrc.json .oxlintrc.json`;

  outro(green('All done!'));
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

    const configContent = await fetch(
      `https://raw.githubusercontent.com/simek/oxc-configs/HEAD/${template}/${fileName}`
    );

    const config = await configContent.json();
    await Bun.write(fileName, JSON.stringify(config));

    progress.stop(`${bold(fileName)} fetched and written`);
  }
}

main().catch(err => {
  log.error(err);
  process.exit(1);
});
