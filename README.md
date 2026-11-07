# henniefrancis.tech

Personal site of Hennie Francis: Cloud and Technology Strategist, AWS Community Builder and AWS User Group Leader. It is an Angular application that is prerendered to static HTML at build time, so every page is real HTML that loads fast and can be indexed.

[![CI](https://github.com/henniefrancis/henniefrancis-tech/actions/workflows/ci.yml/badge.svg)](https://github.com/henniefrancis/henniefrancis-tech/actions/workflows/ci.yml)
[![Deploy](https://github.com/henniefrancis/henniefrancis-tech/actions/workflows/deploy.yaml/badge.svg)](https://github.com/henniefrancis/henniefrancis-tech/actions/workflows/deploy.yaml)
[![Security](https://github.com/henniefrancis/henniefrancis-tech/actions/workflows/security.yml/badge.svg)](https://github.com/henniefrancis/henniefrancis-tech/actions/workflows/security.yml)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Angular (standalone components), TypeScript, SCSS, Bootstrap |
| Output | Static prerendered HTML, no server-side runtime |
| Unit tests | Vitest through the Angular test builder |
| End-to-end and visual tests | Playwright |
| Infrastructure | Terraform, see [`terraform/`](terraform/) |
| CI/CD | GitHub Actions with every action pinned to a commit SHA |

## Requirements

- Node.js 24 (the version is in `.nvmrc`; with nvm run `nvm use`).
- npm 10 or newer.

## Repository layout

```
src/                  Angular application source
public/               Static assets copied as is into the build
angular.json          Angular workspace configuration (the repo root is the workspace root)
e2e/                  Playwright tests
tools/                Standalone Node tooling packages (each has its own package.json), including tools/content
terraform/            Infrastructure as code
deploy/               Web server configuration shipped with each deploy
.github/workflows/    CI/CD workflows
```

## Local development

```bash
npm ci
npm start          # development server on http://localhost:4200
npm run build      # production build, prerendered to dist/henniefrancis-tech/browser
npm test           # unit tests (watch mode)
npm run test:ci    # unit tests once, with the 100 percent coverage threshold
```

End-to-end tests and the local preview use the same root package:

```bash
npx playwright install --with-deps chromium webkit   # first run only
npm run preview        # serve the production build locally
npm run test:e2e       # Playwright suite
npm run test:visual    # visual comparison suite
```

## Content

The text, links and images the site shows are not in this repository. They are YAML files in a separate content repository. This repository holds the layout, the styles and the content contract in `tools/content/`: JSON Schemas, a loader, a validator and a generator that turns the content into typed modules in `src/app/content/generated/` (generated, not committed).

```bash
npm run content:generate   # reads CONTENT_SRC (default: content-src/), validates, writes the modules; fails on any error
npm run content:fixtures   # same, from the synthetic sample content in tools/content/fixtures/tree
npm run content:validate -- <folder>
npm run content:test       # unit tests of the content tools, 100 percent coverage threshold
```

`npm run build` generates from `CONTENT_SRC` first. `npm test` and `npm run test:ci` generate from the sample content, so they need no access to the content repository.

## Continuous integration

Every pull request to `develop` or `main` runs one required check named `ci`. It installs dependencies, builds the site, runs the unit tests with a 100 percent coverage threshold, checks the build output against the size and content budgets, audits runtime dependencies, scans the pull request's commits for secrets, scans the file system for known vulnerabilities, lints the workflows, and, when Terraform files changed, validates the Terraform.

Pushes to `main` build the site and deploy it. A weekly workflow repeats the security scans, and a manual workflow runs the browser tests against a URL of your choice. Dependency updates are grouped monthly.

## Contributing

Branch from `develop`, keep changes small, and open a pull request. Nothing is merged unless `ci` passes. Please do not commit secrets, account identifiers or personal data.

## License

Released under the MIT License, see [`LICENSE`](LICENSE).
