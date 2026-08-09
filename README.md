# henniefrancis.tech

> Personal site of **Hennie Francis** — Cloud &amp; Technology Strategist, AWS Community Builder, AWS User Group Leader. An **Angular 22** app, prerendered to static HTML and served from **CloudFront → nginx on a Graviton EC2**, deployed from GitHub Actions over OIDC (no stored AWS keys).

[![Deploy](https://github.com/henniefrancis/henniefrancis-tech/actions/workflows/deploy.yaml/badge.svg)](https://github.com/henniefrancis/henniefrancis-tech/actions/workflows/deploy.yaml)
[![Lint](https://github.com/henniefrancis/henniefrancis-tech/actions/workflows/lint.yml/badge.svg)](https://github.com/henniefrancis/henniefrancis-tech/actions/workflows/lint.yml)
[![Security Scan](https://github.com/henniefrancis/henniefrancis-tech/actions/workflows/security.yml/badge.svg)](https://github.com/henniefrancis/henniefrancis-tech/actions/workflows/security.yml)
[![E2E Tests](https://github.com/henniefrancis/henniefrancis-tech/actions/workflows/playwright.yml/badge.svg)](https://github.com/henniefrancis/henniefrancis-tech/actions/workflows/playwright.yml)
[![Terraform](https://github.com/henniefrancis/henniefrancis-tech/actions/workflows/terraform.yml/badge.svg)](https://github.com/henniefrancis/henniefrancis-tech/actions/workflows/terraform.yml)

![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-CloudFront%20%2B%20EC2%20%2B%20S3-232F3E?logo=amazonwebservices&logoColor=white)
![Terraform](https://img.shields.io/badge/IaC-Terraform%20(HCP)-844FBA?logo=terraform&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

---

## Overview

The site is an **Angular 22** application that is **prerendered to static HTML at build time (SSG)** — every route ships as real HTML for SEO and fast first paint, with no Node server on the origin. Page content is **data-driven from JSON**, and images are served from a public **Amazon S3** bucket. The whole stack mirrors the passembly architecture: a Graviton `t4g.nano` running nginx behind CloudFront, dual-stack (IPv4 + IPv6), TLS everywhere, managed by Terraform in HCP Terraform and deployed by GitHub Actions via OIDC.

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | Angular 22 (standalone components, SSR/prerender), TypeScript, Bootstrap 5, SCSS |
| CDN / edge | Amazon CloudFront (HTTPS, HTTP/3, IPv4 + IPv6) |
| Origin | EC2 Graviton `t4g.nano` (Amazon Linux 2023), nginx, Let's Encrypt |
| Assets | Amazon S3 (public read) |
| IaC | Terraform + HCP Terraform (region `af-south-1`; ACM cert in `us-east-1`) |
| CI/CD | GitHub Actions (OIDC — no stored keys), SSM Run Command |

## Architecture

```
viewer ──HTTPS / HTTP3 (IPv4 + IPv6)──► CloudFront ──HTTPS──► origin.henniefrancis.tech
                                                              (nginx on EC2, static files)

images ─────────────────────────────► Amazon S3 (public bucket)
```

The Angular build prerenders all routes to static HTML; nginx serves them with `try_files` (no runtime Node/SSR server). Deploys ship only the built `browser/` output to the nginx web root.

## Project structure

```
src/                  Angular 22 application (workspace + app)
html/                 Archived previous static site (content source for the migration)
terraform/            Infrastructure as code — see terraform/README.md
e2e/                  Playwright smoke tests (run against production)
.github/workflows/    CI/CD: deploy, lint, security, playwright, terraform
```

## Local development

```bash
cd src
npm install
npm start        # ng serve → http://localhost:4200
npm run build    # prerendered SSG build → dist/henniefrancis-tech/browser
```

## Deployment

Pushing to `main` triggers `deploy.yaml`:

1. **Quality gates (blocking):** security scans (Gitleaks, `npm audit`, Trivy) and an Angular compile check (`lint.yml`).
2. **Build:** `npm ci && npm run build` prerenders the app to static HTML.
3. **Deploy:** the `browser/` output is uploaded to S3, pushed to EC2 over **SSM Run Command** (on-instance status verified — a failed deploy fails the pipeline), then `nginx -t && systemctl reload nginx`, followed by a CloudFront invalidation.
4. **Verify:** Playwright smoke tests run against production (`playwright.yml`), and again nightly.

Terraform changes are checked by `terraform.yml` (fmt, validate, unit tests) with plans/applies executed in **HCP Terraform**. Day-to-day work happens on `develop` / feature branches.

## Infrastructure

All infrastructure is Terraform-managed — see [`terraform/README.md`](terraform/README.md) for the architecture and rollout runbook.

## License

Released under the MIT License — see [`LICENSE`](LICENSE).
