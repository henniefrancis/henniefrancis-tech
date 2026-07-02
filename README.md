# henniefrancis-tech

Source for my personal tech blog at https://henniefrancis.tech, a static site (HTML, CSS, and JavaScript) covering development and other tech topics.

## Structure

`src/` holds the site: `index.html`, `pages/`, `styles/`, `scripts/` (including an animated flow-field background), and `img/`. `infra/AWS.md` documents the AWS setup, and `.github/workflows/build-deploy.yaml` is the deploy pipeline.

## Deployment

Pushing to the `main` branch triggers the GitHub Actions workflow, which authenticates to AWS via OIDC (no stored credentials), zips `src/`, uploads it to S3, deploys it to the EC2 instance over AWS SSM, and reloads nginx. Day-to-day work happens on the `develop` branch.

## License

Released under the MIT License. See LICENSE for details.
