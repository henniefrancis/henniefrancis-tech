# Infrastructure — henniefrancis.tech

Terraform stack for the personal site, deployed via **HCP Terraform (Terraform Cloud)**. Same architecture as passembly.co.za: a Graviton (t4g) EC2 instance running nginx behind CloudFront, dual-stack IPv4 + IPv6, TLS everywhere, deployed from GitHub Actions over SSM with OIDC (no stored AWS keys anywhere).

```
viewer ──HTTPS/HTTP3 (IPv4+IPv6)──► CloudFront ──HTTPS──► origin.henniefrancis.tech
                                    (ACM cert,            (EIP + AAAA → EC2 t4g.nano,
                                     edge cache)            nginx + Let's Encrypt)

GitHub Actions ──OIDC──► deploy role ──► S3 artifacts ──SSM Run Command──► web root
```

This stack is **self-contained** (one AWS account, one site, one workspace). If a second site ever lands in this account, split the shared pieces (VPC, SG, key pair) into a `base` stack first — follow the passembly-web restructure design in the awscommza terraform repo.

## Files

| File | Purpose |
|---|---|
| `versions.tf` | Terraform/provider pins + HCP Terraform workspace |
| `vpc.tf` | Dual-stack VPC (IPv4 /16 + AWS IPv6 /56), 2 public subnets, IGW, routes |
| `security_groups.tf` | 80/443 open v4+v6, SSH closed by default, rule resources (no inline) |
| `keypair.tf` | ED25519 emergency-SSH key pair; private key only in Secrets Manager |
| `iam.tf` | GitHub OIDC deploy role + EC2 instance role — least-privilege, Terraform-managed |
| `s3.tf` | Versioned, encrypted, TLS-only artifacts bucket with lifecycle expiry |
| `ec2.tf` | t4g.nano AL2023 ARM64, IMDSv2, encrypted gp3, EIP, IPv6 |
| `templates/user_data.sh.tftpl` | nginx (tuned for 512 MB) + certbot bootstrap |
| `cloudfront.tf` | Distribution (http2and3, IPv6) + ACM cert in us-east-1 |
| `tests/unit.tftest.hcl` | Plan-only tests with mock providers — no credentials needed |

## First-time rollout

### 1. HCP Terraform workspace (VCS-driven, remote execution)

Terraform **executes remotely in HCP Terraform** — GitHub holds no tokens or cloud credentials for infrastructure work. The workspace is **VCS-connected** to `henniefrancis/henniefrancis-tech`, so HCP Terraform itself kicks off the runs:

- **Pull requests** → automatic speculative plan (visible as a PR check)
- **Push to `main` touching `terraform/**`** → plan + **auto-apply**

Workspace configuration (already set):

| Setting | Value |
|---|---|
| Workspace | `henniefrancis-tech` (org `henniefrancis`) |
| VCS repository | `henniefrancis/henniefrancis-tech` |
| Working directory | `terraform` |
| Trigger pattern | `terraform/**/*` |
| Auto-apply (API/UI/VCS runs) | enabled |
| Automatic speculative plans (PRs) | enabled |
| AWS credentials | org variable set "AWS (henniefrancis)" |

The account already has the GitHub OIDC identity provider (created manually per `infra/AWS.md`), so `create_github_oidc_provider` stays `false`. For a greenfield account set it to `true`.

**Dynamic credentials (no static keys):** `tfc-oidc.tf` creates an OIDC provider for `app.terraform.io` plus the `henniefrancis-tech-tfc-run` role, trust-scoped to this single workspace. Bootstrap order: the first apply runs on the static-key variable set and creates the role; then set workspace env variables `TFC_AWS_PROVIDER_AUTH=true` and `TFC_AWS_RUN_ROLE_ARN=<tfc_run_role_arn output>`, and detach the static-key variable set from this workspace. Every subsequent run gets fresh, short-lived credentials minted per run — nothing stored, nothing to expire.

### 2. Apply + certificate validation

1. Queue a plan. The first apply creates everything except `aws_acm_certificate_validation`, which **waits** for DNS validation.
2. Copy the CNAMEs from the `acm_validation_records` output into the DNS provider. The apply completes once ACM issues the cert (timeout 60 min).

### 3. Origin DNS + origin TLS

1. From outputs, create at the DNS provider:
   - `origin.henniefrancis.tech  A     <elastic_ip>`
   - `origin.henniefrancis.tech  AAAA  <instance_ipv6>`
2. Once it resolves, issue the origin certificate on the box (via SSM, no SSH):

   ```
   aws ssm start-session --target <instance_id> --region af-south-1
   sudo certbot --nginx -d origin.henniefrancis.tech --non-interactive --agree-tos -m hennie@awscommunity.co.za
   ```

   This is what lets CloudFront use `origin_protocol_policy = "https-only"`. Renewal is automatic (systemd timer, twice daily).

### 4. GitHub repository settings

Repo → Settings → Secrets and variables → Actions:

**Variables** (from Terraform outputs):

| Variable | Output |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `github_deploy_role_arn` |
| `AWS_REGION` | `af-south-1` |
| `EC2_INSTANCE_ID` | `instance_id` |
| `ARTIFACTS_BUCKET` | `artifacts_bucket` |
| `WEB_ROOT` | `/var/www/henniefrancis-tech/html` |

**Secrets:** `CLOUDFRONT_DISTRIBUTION_ID` (from `cloudfront_distribution_id`). Optional: `GITLEAKS_LICENSE`, `GIST_SECRET` + `DEPLOY_BADGE_GIST_ID` for the deploy badge.

Note the split: GitHub holds **nothing** for Terraform — runs are triggered by the workspace's VCS connection and use the org's variable-set credentials. The `AWS_DEPLOY_ROLE_ARN` variable is for the *site* deploy workflow (S3/SSM/CloudFront invalidation via OIDC), which is separate from infrastructure runs.

Also create a **`production` environment** (Settings → Environments) — the deploy job targets it, and the IAM trust policy expects it.

### 5. Cut public DNS over + first deploy

1. Point `www.henniefrancis.tech` CNAME → `cloudfront_domain_name`; apex `henniefrancis.tech` via ALIAS/ANAME (or CNAME-flattening).
2. Push to `main` → the deploy workflow ships the site through the new pipeline.
3. Verify: `curl -I https://henniefrancis.tech` (expect `via: … cloudfront`), and IPv6: `curl -6 -I https://henniefrancis.tech`.

### 6. Decommission the old setup

Only after the new stack serves production traffic:

- Terminate old instance `i-0bf986b68f6b8ae16`, release its EIP.
- Empty + delete `temp-deploy-hennie-francis-tech-bucket`.
- Delete the manual `EC2SSM` role and its `S3Deployment`/`EC2SSM` policies (the Terraform-managed `henniefrancis-tech-github-deploy` role replaces them with tighter scoping).
- Delete `.github/workflows/build-deploy.yaml` if it still exists anywhere.

## Day-2 operations

- **Shell on the box:** `aws ssm start-session --target <instance_id>` — SSH stays closed.
- **Emergency SSH:** set `ssh_allowed_cidrs = ["your.ip/32"]` in workspace variables, apply, fetch the key from Secrets Manager (`ssh_private_key_secret` output); revert afterwards.
- **Scale up:** change `instance_type` (any arm64 type) — in-place, no re-create.
- **Reprovision bootstrap:** `terraform taint aws_instance.web && terraform apply` (user_data changes never auto-replace).
- **AMI updates:** `lifecycle.ignore_changes` pins the AMI; patching happens via `dnf update` (consider an SSM Patch Manager window later).

## Testing

```
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
terraform test          # plan-only, mock providers, no credentials
```

`terraform.yml` runs the static checks (no credentials needed) on every PR and push touching `terraform/`. The plan/apply runs are kicked off by HCP Terraform's own VCS connection: speculative plan on PRs, plan + auto-apply on merge to `main`. Runs execute remotely in the `henniefrancis-tech` workspace with the org's variable-set credentials and are fully visible in the HCP Terraform UI.

## Costs (steady state)

t4g.nano ≈ $3.50/mo + EBS 8 GiB gp3 ≈ $0.90/mo + EIP (attached) $0 + CloudFront ≈ $0 (always-free tier) + Secrets Manager $0.40/mo ≈ **$5/mo**.
