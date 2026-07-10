# ============================================================
# locals.tf — computed naming and tag values.
#
# Naming convention (same as the awscommza monorepo):
#   <team>-<account>-<region>-<project>-<resource>
#   e.g. henniefrancis-<account_id>-af-south-1-henniefrancis-tech-vpc
#
# IAM role names have a 64-char limit, so IAM resources use the short
# "<project>-<purpose>" form instead of the full prefix (see iam.tf).
# ============================================================

locals {
  account_id = data.aws_caller_identity.current.account_id

  name_prefix           = "${var.team_name}-${local.account_id}-${var.aws_region}-${var.project_name}"
  name_prefix_us_east_1 = "${var.team_name}-${local.account_id}-us-east-1-${var.project_name}"

  # S3 bucket names are capped at 63 chars, so the artifacts bucket follows
  # the shorter account-scoped pattern used in the community account
  # (deploy-artifacts-<account_id>); per-project separation is by key prefix.
  artifacts_bucket_name = "deploy-artifacts-${local.account_id}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    Team        = var.team_name
    ManagedBy   = "terraform"
    Workspace   = "henniefrancis-tech"
    Repository  = "https://github.com/${var.github_repository}"
  }
}
