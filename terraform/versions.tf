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
    # HCP Terraform organization. The awscommza org already runs one
    # workspace per AWS account (see terraform repo README) — this adds
    # the personal account as another workspace. Change this line if the
    # site moves to its own HCP organization.
    organization = "awscommza"

    workspaces {
      name = "henniefrancis-tech"
    }
  }
}
