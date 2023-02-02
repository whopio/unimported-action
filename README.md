# turbo-module starter

this is a starter template generated from `create-turbo-module`

## Additional setup:

- Only allow squash merging PRs and set the default message to `Pull request title and description`
- install kodiakhq
- set up branch protection for the `main` branch, i.E.:
  - require a pull request before merging
    - require approvals: 1+
    - require review from code owners
  - require conversation resolution before merging
  - restrict who can push to matching branches
    - resitrct pushes that create matching branches
    - allow kodiakhq to push to matching branches
- allow actions to create PRs (/settings/actions). This has to be allowed on the repo and org level
- add your `NPM_TOKEN` to your workflow secrets
