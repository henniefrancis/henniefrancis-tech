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
src/                  Angular application (the workspace root for ng commands)
e2e/                  Playwright tests
tools/                Standalone Node tooling packages (each has its own package.json)
terraform/            Infrastructure as code
deploy/               Web server configuration shipped with each deploy
.github/workflows/    CI/CD workflows
```

## Local development

```bash
cd src
npm ci
npm start          # development server on http://localhost:4200
npm run build      # production build, prerendered to dist/henniefrancis-tech/browser
npm test           # unit tests
```

Repository tooling (end-to-end tests and the local preview) lives in the root package:

```bash
npm ci
npx playwright install --with-deps chromium webkit   # first run only
npm run preview        # serve the production build locally
npm run test:e2e       # Playwright suite
npm run test:visual    # visual comparison suite
```

## Continuous integration

Every pull request to `develop` or `main` runs one required check named `ci`. It installs dependencies, builds the site, runs the unit tests with a 100 percent coverage threshold, checks the build output against the size and content budgets, audits runtime dependencies, scans the pull request's commits for secrets, scans the file system for known vulnerabilities, lints the workflows, and, when Terraform files changed, validates the Terraform.

Pushes to `main` build the site and deploy it. A weekly workflow repeats the security scans, and a manual workflow runs the browser tests against a URL of your choice. Dependency updates are grouped monthly.

## Contributing

Branch from `develop`, keep changes small, and open a pull request. Nothing is merged unless `ci` passes. Please do not commit secrets, account identifiers or personal data.

## License

Released under the MIT License, see [`LICENSE`](LICENSE).
