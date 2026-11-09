# ============================================================
# ssm.tf - origin verify secret
#
# CloudFront sends the secret in the X-Origin-Verify header (see
# cloudfront.tf). The same value is stored here so that each deploy can
# render the nginx map from it (deploy/nginx/render-origin-verify.sh).
# Only the instance role can read the parameters (iam.tf).
#
#   current   the value CloudFront sends now
#   previous  the value from before the last rotation, accepted by nginx
#             until the rotation runbook clears it. SSM rejects empty
#             values, so "none" is the placeholder when it is empty.
#
# The secret values come from sensitive HCP Terraform variables set by
# the owner. They are never in code. The values do end up in Terraform
# state, which is accepted (the CloudFront header holds the
# same value).
#
# Docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
# ============================================================

locals {
  origin_verify_param_prefix = "/${var.project_name}/origin-verify"
  origin_verify_none         = "none"
}

resource "aws_ssm_parameter" "origin_verify_current" {
  name        = "${local.origin_verify_param_prefix}/current"
  description = "Current X-Origin-Verify value that CloudFront sends to the origin."
  type        = "SecureString"
  tier        = "Standard"
  value       = var.origin_verify_secret

  tags = { Name = "${var.project_name}-origin-verify-current" }
}

resource "aws_ssm_parameter" "origin_verify_previous" {
  name        = "${local.origin_verify_param_prefix}/previous"
  description = "Previous X-Origin-Verify value, still accepted by nginx during a rotation. The word none means no previous value."
  type        = "SecureString"
  tier        = "Standard"
  value       = var.origin_verify_secret_previous != "" ? var.origin_verify_secret_previous : local.origin_verify_none

  tags = { Name = "${var.project_name}-origin-verify-previous" }
}
