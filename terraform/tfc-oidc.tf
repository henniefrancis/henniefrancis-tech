# ============================================================
# tfc-oidc.tf — Dynamic provider credentials for HCP Terraform
#
# Replaces the static AWS access keys in the "AWS (henniefrancis)"
# variable set with per-run temporary credentials: HCP Terraform
# authenticates to AWS through this OIDC provider and assumes the run
# role below for every plan/apply. Nothing stored, nothing to expire,
# nothing to rotate.
#
# BOOTSTRAP (one-time, already sequenced in the README):
#   1. This file is applied ONCE using the existing static-key variable
#      set — creating the OIDC provider and the run role.
#   2. The workspace then gets two env variables:
#        TFC_AWS_PROVIDER_AUTH = true
#        TFC_AWS_RUN_ROLE_ARN  = <tfc_run_role_arn output>
#   3. The static-key variable set is detached from this workspace.
#      From then on every run uses dynamic credentials.
#
# TRUST BOUNDARY: the role can only be assumed by runs of THIS
# workspace in THIS organization (see the sub condition), for both the
# plan and apply phases.
# ============================================================

# Fetch the current TLS certificate thumbprint for app.terraform.io.
# (AWS now validates against trusted root CAs and largely ignores
# thumbprints, but the argument is still required by the API.)
data "tls_certificate" "tfc" {
  url = "https://app.terraform.io"
}

resource "aws_iam_openid_connect_provider" "tfc" {
  url             = "https://app.terraform.io"
  client_id_list  = ["aws.workload.identity"]
  thumbprint_list = [data.tls_certificate.tfc.certificates[0].sha1_fingerprint]

  tags = { Name = "hcp-terraform-oidc" }
}

data "aws_iam_policy_document" "tfc_trust" {
  statement {
    sid     = "HCPTerraformOIDC"
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.tfc.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "app.terraform.io:aud"
      values   = ["aws.workload.identity"]
    }

    # Only runs of this org's henniefrancis-tech workspace, any project,
    # both run phases (plan + apply).
    condition {
      test     = "StringLike"
      variable = "app.terraform.io:sub"
      values   = ["organization:henniefrancis:project:*:workspace:henniefrancis-tech:run_phase:*"]
    }
  }
}

resource "aws_iam_role" "tfc_run" {
  name               = "henniefrancis-tech-tfc-run"
  description        = "Assumed by HCP Terraform runs (dynamic credentials) for the henniefrancis-tech workspace."
  assume_role_policy = data.aws_iam_policy_document.tfc_trust.json

  max_session_duration = 3600

  tags = { Name = "henniefrancis-tech-tfc-run" }
}

# The run role provisions this entire stack — VPC, EC2, IAM roles,
# S3, CloudFront, ACM, Secrets Manager — so it needs administrative
# breadth. The security control is the TRUST POLICY above (single
# workspace, single org), not the permission set. Tightening this to a
# custom least-privilege policy is a worthwhile follow-up once the
# stack's resource surface is stable.
resource "aws_iam_role_policy_attachment" "tfc_run_admin" {
  role       = aws_iam_role.tfc_run.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AdministratorAccess"
}

output "tfc_run_role_arn" {
  description = "Set as workspace env variable TFC_AWS_RUN_ROLE_ARN (with TFC_AWS_PROVIDER_AUTH=true), then detach the static-key variable set."
  value       = aws_iam_role.tfc_run.arn
}
