# ============================================================
# provider.tf — AWS provider for the henniefrancis-tech stack.
#
# Credentials come from HCP Terraform workspace variables (or OIDC
# dynamic credentials — see README). Every resource inherits
# local.common_tags via default_tags.
#
# NOTE: the aliased `aws.us_east_1` provider (used ONLY for the
# CloudFront ACM certificate, which must live in us-east-1) is defined
# in cloudfront.tf alongside the distribution, mirroring the
# passembly-web layout.
# ============================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}
