import { describe, expect, test } from 'bun:test';

import { getCommandToRun } from './utils';

describe('getCommandToRun', () => {
  test('adds multiple packages', () => {
    expect(getCommandToRun(['oxlint', 'oxfmt'], 'npm')).toEqual({
      exe: 'npm',
      args: ['install', '-D', 'oxlint', 'oxfmt'],
    });
  });

  test('adds multiple packages with version applied per package', () => {
    expect(getCommandToRun(['oxlint', 'oxfmt', 'oxlint-tsgolint'], 'bun', 'latest')).toEqual({
      exe: 'bun',
      args: ['add', '-D', 'oxlint@latest', 'oxfmt@latest', 'oxlint-tsgolint@latest'],
    });
  });
});
