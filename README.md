# whopio/unimported-action

GitHub Action powered by [smeijer/unimported](https://github.com/smeijer/unimported). Runs `npx unimported` in all specified projects and comments a report on related PRs.

Ensures that all files in a project are either entry-points or imported by entry-points. Also ensures that all imported packages are installed included in the `package.json` and that all `dependencies` are used.

## Action setup

```yml
on:
  pull_request:
    types:
      - synchronize
      - opened

name: Unimported

concurrency:
  group: pr-action-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  unimported:
    name: Check unimported
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: whopio/unimported-action@v0.0.1
        with:
          token: ${{ github.token }}
          projects: 'path/to/project,path/to/different/project'
```

## Configuration

Each project the action runs in can provide its own [`.uniportedrc.json`](https://github.com/smeijer/unimported#example-config-file) configuration file.
