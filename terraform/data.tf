# ============================================================
# data.tf — account identity and AMI lookup.
#
# This stack is self-contained (no base→web data-source contract like
# passembly) because the personal account runs a single site: every
# dependency lives in this workspace.
# ============================================================

# Current AWS account — used by locals.account_id (name_prefix / tags /
# bucket name). Nothing is hardcoded to an account ID.
data "aws_caller_identity" "current" {}

# Current partition (aws / aws-cn / aws-us-gov) — used to build ARNs in
# iam.tf without hardcoding "aws".
data "aws_partition" "current" {}

# Latest Amazon Linux 2023 ARM64 AMI (Graviton). Ignored on the instance
# via lifecycle.ignore_changes so a newer AMI never forces a replace.
data "aws_ssm_parameter" "al2023_arm64" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}
