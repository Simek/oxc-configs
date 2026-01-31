import { cancel, log } from '@clack/prompts';
import { $, file } from 'bun';
import { bold } from 'picocolors';

type PM = 'npm' | 'yarn' | 'pnpm' | 'bun';

export type CommandToRun = {
  exe: PM;
  args: string[];
};

export async function hasGlobalInstallation(pm: PM | null | undefined): Promise<boolean> {
  if (!pm) {
    return false;
  }
  try {
    await $`${pm} --version`.quiet();
    return true;
  } catch {
    return false;
  }
}

async function getTypeofLockFile(): Promise<PM | null> {
  const [isYarn, isPnpm, isBun, isBunBinary, isNpm] = await Promise.all([
    file('yarn.lock').exists(),
    file('pnpm-lock.yaml').exists(),
    file('bun.lock').exists(),
    file('bun.lockb').exists(),
    file('package-lock.json').exists(),
  ]);

  if (isYarn) {
    return 'yarn';
  } else if (isPnpm) {
    return 'pnpm';
  } else if (isBun || isBunBinary) {
    return 'bun';
  }
  if (isNpm) {
    return 'npm';
  }

  return null;
}

export async function detectPackageManager(): Promise<PM | null> {
  const type = await getTypeofLockFile();

  if (type) {
    return type;
  }
  const [hasYarn, hasPnpm, hasBun, hasNpm] = await Promise.all([
    hasGlobalInstallation('yarn'),
    hasGlobalInstallation('pnpm'),
    hasGlobalInstallation('bun'),
    hasGlobalInstallation('npm'),
  ]);
  if (hasYarn) {
    return 'yarn';
  } else if (hasPnpm) {
    return 'pnpm';
  } else if (hasBun) {
    return 'bun';
  } else if (hasNpm) {
    return 'npm';
  }
  return null;
}

export function getCommandToRun(packages: string[], preferredManager: PM, version?: string): CommandToRun {
  const args: string[] = [];

  switch (preferredManager) {
    case 'bun':
    case 'pnpm':
    case 'yarn':
      args.push('add', '-D');
      break;
    default:
      args.push('install', '-D');
      break;
  }

  return {
    exe: preferredManager,
    args: [
      ...args,
      ...packages
        .map(p => p.trim())
        .filter(Boolean)
        .map(p => (version ? `${p}@${version}` : p)),
    ],
  };
}

export async function installDependencies(pm: PM, deps: string[]) {
  log.info(`Installing ${bold(deps.join(', '))} packages using ${bold(pm)}.`);
  try {
    const { exe, args } = getCommandToRun(deps, pm, 'latest');
    await $`${exe} ${args}`.quiet();
  } catch (error) {
    cancel(`OXC dependencies cannot be installed. ${error}`);
    process.exit(0);
  }
}
