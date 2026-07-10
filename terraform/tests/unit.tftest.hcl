# ============================================================
# tests/unit.tftest.hcl — Native Terraform unit tests
#
# Requires Terraform >= 1.7 (mock_provider support).
# Run from the terraform/ directory:
#
#   terraform init -backend=false
#   terraform test
#
# PLAN-ONLY tests using mock providers — no AWS credentials or real
# infrastructure needed. They verify security posture, IPv6 posture,
# naming conventions, and variable validation. CI runs these on every
# PR that touches terraform/ (.github/workflows/terraform.yml).
# ============================================================

mock_provider "aws" {
  mock_data "aws_ssm_parameter" {
    defaults = {
      value = "ami-0123456789abcdef0"
    }
  }

  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "123456789012"
      arn        = "arn:aws:iam::123456789012:user/ci"
      user_id    = "AIDAEXAMPLEID"
    }
  }

  mock_data "aws_partition" {
    defaults = {
      partition  = "aws"
      dns_suffix = "amazonaws.com"
    }
  }

  mock_data "aws_iam_openid_connect_provider" {
    defaults = {
      arn = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      url = "token.actions.githubusercontent.com"
    }
  }

  # aws_iam_policy_document's rendered .json is consumed by role/policy
  # resources that validate the value is a JSON object. The mock provider
  # otherwise returns a non-JSON placeholder that fails validation.
  mock_data "aws_iam_policy_document" {
    defaults = {
      json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}"
    }
  }
}

mock_provider "aws" {
  alias = "us_east_1"

  mock_data "aws_iam_policy_document" {
    defaults = {
      json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}"
    }
  }
}

mock_provider "tls" {}

# ── Security posture ─────────────────────────────────────────

run "instance_requires_imdsv2" {
  command = plan

  assert {
    condition     = aws_instance.web.metadata_options[0].http_tokens == "required"
    error_message = "IMDSv2 must be required (http_tokens = required) to block SSRF credential theft."
  }

  assert {
    condition     = aws_instance.web.metadata_options[0].http_put_response_hop_limit == 1
    error_message = "IMDS hop limit must stay at 1."
  }
}

run "root_volume_is_encrypted_gp3" {
  command = plan

  assert {
    condition     = aws_instance.web.root_block_device[0].encrypted == true
    error_message = "Root EBS volume must be encrypted."
  }

  assert {
    condition     = aws_instance.web.root_block_device[0].volume_type == "gp3"
    error_message = "Root EBS volume must be gp3."
  }
}

run "artifacts_bucket_blocks_public_access" {
  command = plan

  assert {
    condition = alltrue([
      aws_s3_bucket_public_access_block.artifacts.block_public_acls,
      aws_s3_bucket_public_access_block.artifacts.block_public_policy,
      aws_s3_bucket_public_access_block.artifacts.ignore_public_acls,
      aws_s3_bucket_public_access_block.artifacts.restrict_public_buckets,
    ])
    error_message = "All four S3 public access blocks must be enabled on the artifacts bucket."
  }
}

# ── IPv6 posture ─────────────────────────────────────────────

run "stack_is_dual_stack" {
  command = plan

  assert {
    condition     = aws_vpc.main.assign_generated_ipv6_cidr_block == true
    error_message = "VPC must request an AWS-assigned IPv6 /56."
  }

  assert {
    condition     = aws_instance.web.ipv6_address_count == 1
    error_message = "Instance must be assigned exactly one IPv6 address by default."
  }

  assert {
    condition     = aws_cloudfront_distribution.frontend.is_ipv6_enabled == true
    error_message = "CloudFront distribution must have IPv6 enabled."
  }

  assert {
    condition     = aws_vpc_security_group_ingress_rule.https_ipv6.cidr_ipv6 == "::/0"
    error_message = "HTTPS must be reachable over IPv6."
  }
}

# ── CloudFront posture ───────────────────────────────────────

run "cloudfront_enforces_https_and_modern_tls" {
  command = plan

  assert {
    condition     = aws_cloudfront_distribution.frontend.default_cache_behavior[0].viewer_protocol_policy == "redirect-to-https"
    error_message = "Viewers must be redirected to HTTPS."
  }

  assert {
    condition     = aws_cloudfront_distribution.frontend.viewer_certificate[0].minimum_protocol_version == "TLSv1.2_2021"
    error_message = "Minimum viewer TLS version must be TLSv1.2_2021."
  }

  assert {
    condition     = aws_cloudfront_distribution.frontend.http_version == "http2and3"
    error_message = "HTTP/2 + HTTP/3 must be enabled."
  }
}

# ── Naming convention ────────────────────────────────────────

run "naming_follows_convention" {
  command = plan

  assert {
    condition     = aws_instance.web.tags["Name"] == "henniefrancis-123456789012-af-south-1-henniefrancis-tech-ec2"
    error_message = "Instance Name tag must follow <team>-<account>-<region>-<project>-ec2."
  }

  assert {
    condition     = aws_s3_bucket.artifacts.bucket == "deploy-artifacts-123456789012"
    error_message = "Artifacts bucket must follow deploy-artifacts-<account_id>."
  }
}

# ── Variable validation guardrails ───────────────────────────

run "rejects_invalid_region" {
  command = plan

  variables {
    aws_region = "not-a-region-1x"
  }

  expect_failures = [var.aws_region]
}

run "rejects_invalid_instance_type" {
  command = plan

  variables {
    instance_type = "gigantic"
  }

  expect_failures = [var.instance_type]
}

run "rejects_world_open_ssh" {
  command = plan

  variables {
    ssh_allowed_cidrs = ["0.0.0.0/0"]
  }

  expect_failures = [var.ssh_allowed_cidrs]
}

run "rejects_invalid_environment" {
  command = plan

  variables {
    environment = "production!" # must be prod|staging|dev
  }

  expect_failures = [var.environment]
}
