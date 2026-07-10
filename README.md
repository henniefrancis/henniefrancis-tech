# henniefrancis-tech

Source for my personal tech blog at https://henniefrancis.tech, a static site (HTML, CSS, and JavaScript) covering development and other tech topics.

## Structure

`src/` holds the site: `index.html`, `pages/`, `styles/`, `scripts/` (including an animated flow-field background), and `img/`. `terraform/` holds all infrastructure as code (see [terraform/README.md](terraform/README.md) for architecture and the rollout runbook), `e2e/` holds Playwright smoke tests, and `.github/workflows/` holds the CI/CD pipelines.

## Infrastructure

Terraform-managed via HCP Terraform (Terraform Cloud), same architecture as passembly.co.za: CloudFront (HTTPS, HTTP/3, IPv4+IPv6) in front of a Graviton `t4g.nano` EC2 instance running nginx with Let's Encrypt on the origin, in a dual-stack VPC. GitHub Actions deploys via OIDC — no stored AWS credentials anywhere.

## Deployment

Pushing to `main` triggers `deploy.yaml`: security scans (Gitleaks, npm audit, Trivy) and HTMLHint run as blocking quality gates, then the site is packaged, uploaded to S3, deployed to EC2 over SSM Run Command (each command's on-instance status is verified — a failed deploy fails the pipeline), nginx is validated and reloaded (`nginx -t && systemctl reload nginx`), and the CloudFront cache is invalidated. After a successful deploy, Playwright smoke tests run against production (`playwright.yml`), and again nightly. Terraform changes are checked by `terraform.yml` (fmt, validate, unit tests with mock providers) with plans/applies executed in HCP Terraform. Day-to-day work happens on the `develop` branch.

## Local development

```
npm ci               # dev tooling only — the site itself has zero dependencies
npm run serve        # serve src/ at http://localhost:8080
npm run lint:html    # HTMLHint
BASE_URL=http://localhost:8080 npm run test:e2e   # Playwright (defaults to production URL)
```

## License

Released under the MIT License. See LICENSE for details.
