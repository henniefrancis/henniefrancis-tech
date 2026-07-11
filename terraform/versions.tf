# ============================================================
# versions.tf — henniefrancis-tech stack (workspace henniefrancis-tech)
#
# Self-contained stack for the personal AWS account (separate from the
# awscommza community account). One workspace, one working directory —
# the base/web split used by passembly is not needed while this account
# runs a single site. If a second site lands here, split base (vpc/sg/
# keypair) out first, following
# docs/Passembly/DESIGN-2026-06-21-terraform-repo-restructure.md.
# ============================================================

terraform {
  required_version = ">= 1.15, < 2.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }

    # Generates the emergency-SSH ED25519 key pair (keypair.tf).
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  cloud {
    # HCP Terraform organization for the personal account. Runs execute
    # REMOTELY in HCP Terraform: AWS credentials come from the org's
    # variable sets — never from GitHub. The GitHub workflow only holds a
    # TFC API token (TF_API_TOKEN) to kick off runs.
    organization = "henniefrancis"

    workspaces {
      name = "henniefrancis-tech"
    }
  }
}
