# oxc-configs

OXC toolset pre-made/opinionated configs + a setup and fetch CLI.

## Prerequisites

- Bun

## CLI Usage

Navigate to the project directory, then run:

```sh
bunx oxc-configs # you will be prompted with template selection
# OR
bunx oxc-configs TEMPLATE # download files from specific template for the project in the current directory
```

### Available templates

- React + TypeScript (`react-typescript`)
- React Native + TypeScript (`react-native-typescript`)
- TypeScript (`typescript`)
- JavaScript (`javascript`)

### Included plugins

- [`oxlint-plugin-golden`](https://github.com/dogalyir/oxlint-plugin-golden) - `typescript`, `react-typescript` and `react-native-typescript` templates
- [`oxlint-plugin-react-doctor`](https://github.com/millionco/react-doctor/tree/main/packages/oxlint-plugin-react-doctor) - `react-typescript` and `react-native-typescript` templates

## Development

```sh
bun install
bun link
```
