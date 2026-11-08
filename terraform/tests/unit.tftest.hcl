# ============================================================
# tests/unit.tftest.hcl - Native Terraform unit tests
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

# Computed attributes that the policy assertions below need to be known at plan time.
override_resource {
  target          = aws_s3_bucket.images
  override_during = plan
  values = {
    arn = "arn:aws:s3:::test-img-bucket"
  }
}

override_resource {
  target          = aws_cloudfront_distribution.frontend
  override_during = plan
  values = {
    arn = "arn:aws:cloudfront::123456789012:distribution/ETEST"
  }
}

override_resource {
  target          = aws_ssm_parameter.origin_verify_current
  override_during = plan
  values = {
    arn = "arn:aws:ssm:af-south-1:123456789012:parameter/henniefrancis-tech/origin-verify/current"
  }
}

override_resource {
  target          = aws_ssm_parameter.origin_verify_previous
  override_during = plan
  values = {
    arn = "arn:aws:ssm:af-south-1:123456789012:parameter/henniefrancis-tech/origin-verify/previous"
  }
}

# Test-only fake value, 64 characters (the length of openssl rand -hex 32). The real secret is a sensitive HCP variable.
variables {
  origin_verify_secret = "fakefakefakefakefakefakefakefakefakefakefakefakefakefakefakefake"
}

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

mock_provider "tls" {
  # tfc-oidc.tf reads the app.terraform.io certificate thumbprint.
  mock_data "tls_certificate" {
    defaults = {
      certificates = [{
        sha1_fingerprint = "0000000000000000000000000000000000000000"
      }]
    }
  }
}

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

# ── Edge: origin, secret header, policies ───────────────

run "origin_is_https_only_with_verify_header" {
  command = plan

  assert {
    condition     = one([for o in aws_cloudfront_distribution.frontend.origin : o.custom_origin_config[0].origin_protocol_policy if o.origin_id == "ec2-nginx"]) == "https-only"
    error_message = "The EC2 origin must use https-only."
  }

  assert {
    condition     = one([for o in aws_cloudfront_distribution.frontend.origin : o.custom_origin_config[0].origin_ssl_protocols if o.origin_id == "ec2-nginx"]) == toset(["TLSv1.2"])
    error_message = "The EC2 origin must negotiate TLSv1.2 only."
  }

  assert {
    condition     = one([for o in aws_cloudfront_distribution.frontend.origin : [for h in o.custom_header : h.name] if o.origin_id == "ec2-nginx"]) == ["X-Origin-Verify"]
    error_message = "The EC2 origin must send exactly the X-Origin-Verify custom header."
  }
}

run "default_behaviour_uses_site_policies_and_www_function" {
  command = plan

  assert {
    condition     = aws_cloudfront_distribution.frontend.default_cache_behavior[0].target_origin_id == "ec2-nginx"
    error_message = "The default behaviour must target the EC2 origin."
  }

  assert {
    condition     = one(aws_cloudfront_distribution.frontend.default_cache_behavior[0].function_association).event_type == "viewer-request"
    error_message = "The www redirect function must run on viewer-request."
  }

  assert {
    condition     = aws_cloudfront_function.www_redirect.runtime == "cloudfront-js-2.0" && aws_cloudfront_function.www_redirect.publish == true
    error_message = "The www redirect must be a published cloudfront-js-2.0 function."
  }

  assert {
    condition     = strcontains(aws_cloudfront_function.www_redirect.code, var.frontend_primary_domain) && strcontains(aws_cloudfront_function.www_redirect.code, "statusCode: 301")
    error_message = "The function must redirect to the primary domain with a 301."
  }
}

run "site_cache_policy_has_empty_key" {
  command = plan

  assert {
    condition = alltrue([
      aws_cloudfront_cache_policy.site.min_ttl == 0,
      aws_cloudfront_cache_policy.site.default_ttl == 0,
      aws_cloudfront_cache_policy.site.max_ttl == 31536000,
    ])
    error_message = "Site cache policy TTLs must be min 0, default 0, max one year."
  }

  assert {
    condition = alltrue([
      aws_cloudfront_cache_policy.site.parameters_in_cache_key_and_forwarded_to_origin[0].headers_config[0].header_behavior == "none",
      aws_cloudfront_cache_policy.site.parameters_in_cache_key_and_forwarded_to_origin[0].cookies_config[0].cookie_behavior == "none",
      aws_cloudfront_cache_policy.site.parameters_in_cache_key_and_forwarded_to_origin[0].query_strings_config[0].query_string_behavior == "none",
    ])
    error_message = "Site cache policy must not key or forward headers (Host), cookies or query strings."
  }

  assert {
    condition = alltrue([
      aws_cloudfront_cache_policy.site.parameters_in_cache_key_and_forwarded_to_origin[0].enable_accept_encoding_gzip,
      aws_cloudfront_cache_policy.site.parameters_in_cache_key_and_forwarded_to_origin[0].enable_accept_encoding_brotli,
    ])
    error_message = "gzip and brotli must be enabled."
  }
}

run "response_headers_policy_has_security_headers_without_csp" {
  command = plan

  assert {
    condition = alltrue([
      aws_cloudfront_response_headers_policy.site.security_headers_config[0].strict_transport_security[0].access_control_max_age_sec == 31536000,
      aws_cloudfront_response_headers_policy.site.security_headers_config[0].strict_transport_security[0].override == true,
      aws_cloudfront_response_headers_policy.site.security_headers_config[0].strict_transport_security[0].preload == false,
    ])
    error_message = "HSTS must be one year, overriding, without preload."
  }

  assert {
    condition     = aws_cloudfront_response_headers_policy.site.security_headers_config[0].strict_transport_security[0].include_subdomains == false
    error_message = "HSTS includeSubDomains must default to false."
  }

  assert {
    condition = alltrue([
      aws_cloudfront_response_headers_policy.site.security_headers_config[0].content_type_options[0].override == true,
      aws_cloudfront_response_headers_policy.site.security_headers_config[0].frame_options[0].frame_option == "SAMEORIGIN",
      aws_cloudfront_response_headers_policy.site.security_headers_config[0].referrer_policy[0].referrer_policy == "strict-origin-when-cross-origin",
    ])
    error_message = "nosniff, SAMEORIGIN and strict-origin-when-cross-origin must be set."
  }

  assert {
    condition     = one([for i in aws_cloudfront_response_headers_policy.site.custom_headers_config[0].items : i.value if i.header == "Permissions-Policy"]) == "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()"
    error_message = "The canonical Permissions-Policy value is required."
  }

  assert {
    condition     = length(aws_cloudfront_response_headers_policy.site.security_headers_config[0].content_security_policy) == 0
    error_message = "No CSP header until the CSP change."
  }
}

run "hsts_include_subdomains_follows_variable" {
  command = plan

  variables {
    hsts_include_subdomains = true
  }

  assert {
    condition     = aws_cloudfront_response_headers_policy.site.security_headers_config[0].strict_transport_security[0].include_subdomains == true
    error_message = "hsts_include_subdomains must drive includeSubDomains."
  }
}

run "img_behaviour_targets_private_bucket_via_oac" {
  command = plan

  assert {
    condition     = one([for b in aws_cloudfront_distribution.frontend.ordered_cache_behavior : b.target_origin_id if b.path_pattern == "/img/*"]) == "s3-images"
    error_message = "/img/* must target the s3-images origin."
  }

  assert {
    condition     = one([for b in aws_cloudfront_distribution.frontend.ordered_cache_behavior : b.cache_policy_id if b.path_pattern == "/img/*"]) == "658327ea-f89d-4fab-a63d-7e88639e58f6"
    error_message = "/img/* must use the managed CachingOptimized policy."
  }

  assert {
    condition     = one([for b in aws_cloudfront_distribution.frontend.ordered_cache_behavior : b.viewer_protocol_policy if b.path_pattern == "/img/*"]) == "redirect-to-https"
    error_message = "/img/* must redirect to HTTPS."
  }

  assert {
    condition     = aws_cloudfront_origin_access_control.images.signing_behavior == "always" && aws_cloudfront_origin_access_control.images.signing_protocol == "sigv4" && aws_cloudfront_origin_access_control.images.origin_access_control_origin_type == "s3"
    error_message = "The image OAC must always sign with SigV4 for S3."
  }
}

run "cloudfront_keeps_50x_error_responses" {
  command = plan

  assert {
    condition     = toset([for e in aws_cloudfront_distribution.frontend.custom_error_response : e.error_code]) == toset([502, 503, 504])
    error_message = "502, 503 and 504 must keep their custom error responses."
  }
}

# ── Edge: image bucket ──────────────────────────────────

run "image_bucket_is_private_versioned_and_encrypted" {
  command = plan

  assert {
    condition = alltrue([
      aws_s3_bucket_public_access_block.images.block_public_acls,
      aws_s3_bucket_public_access_block.images.block_public_policy,
      aws_s3_bucket_public_access_block.images.ignore_public_acls,
      aws_s3_bucket_public_access_block.images.restrict_public_buckets,
    ])
    error_message = "All four S3 public access blocks must be enabled on the image bucket."
  }

  assert {
    condition     = one(aws_s3_bucket_ownership_controls.images.rule).object_ownership == "BucketOwnerEnforced"
    error_message = "The image bucket must use BucketOwnerEnforced."
  }

  assert {
    condition     = one(aws_s3_bucket_versioning.images.versioning_configuration).status == "Enabled"
    error_message = "The image bucket must be versioned."
  }

  assert {
    condition     = one(one(aws_s3_bucket_server_side_encryption_configuration.images.rule).apply_server_side_encryption_by_default).sse_algorithm == "AES256"
    error_message = "The image bucket must use SSE-S3."
  }

  assert {
    condition     = aws_s3_bucket.images.bucket == "henniefrancis-123456789012-af-south-1-henniefrancis-tech-img" && length(aws_s3_bucket.images.bucket) <= 63
    error_message = "Image bucket name must be <team>-<account>-<region>-<project>-img and at most 63 characters."
  }
}

run "image_bucket_lifecycle" {
  command = plan

  assert {
    condition     = length(aws_s3_bucket_lifecycle_configuration.images.rule) == 3
    error_message = "The image bucket must have exactly three lifecycle rules (img, originals, multipart abort)."
  }

  assert {
    condition     = alltrue([for r in aws_s3_bucket_lifecycle_configuration.images.rule : one(r.noncurrent_version_expiration).noncurrent_days == 30 if length(r.noncurrent_version_expiration) > 0])
    error_message = "Noncurrent image versions must expire after 30 days."
  }

  assert {
    condition     = one([for r in aws_s3_bucket_lifecycle_configuration.images.rule : one(r.abort_incomplete_multipart_upload).days_after_initiation if length(r.abort_incomplete_multipart_upload) > 0]) == 7
    error_message = "Incomplete multipart uploads must abort after 7 days."
  }
}

# Nothing under archive/ may ever expire. S3 lifecycle filters cannot exclude a
# prefix, so every rule that expires anything must name img/ or originals/.
run "archive_objects_never_expire" {
  command = plan

  assert {
    condition = alltrue([
      for r in aws_s3_bucket_lifecycle_configuration.images.rule :
      contains(["img/", "originals/"], one(r.filter).prefix)
      if length(r.noncurrent_version_expiration) > 0 || length(r.expiration) > 0
    ])
    error_message = "Every expiring rule must be scoped to the img/ or originals/ prefix, never bucket wide."
  }

  assert {
    condition = alltrue([
      for r in aws_s3_bucket_lifecycle_configuration.images.rule :
      !startswith("archive/", one(r.filter).prefix) || one(r.filter).prefix == ""
      if length(r.noncurrent_version_expiration) > 0 || length(r.expiration) > 0 || length(r.transition) > 0 || length(r.noncurrent_version_transition) > 0
    ])
    error_message = "No rule with an expiration or transition action may cover archive/."
  }

  assert {
    condition     = length([for r in aws_s3_bucket_lifecycle_configuration.images.rule : r if length(r.expiration) > 0]) == 0
    error_message = "Current objects must never expire."
  }
}

run "archive_delete_is_denied_for_everyone" {
  command = plan

  assert {
    condition     = one([for s in data.aws_iam_policy_document.images_bucket.statement : s.effect if s.sid == "DenyArchiveDelete"]) == "Deny"
    error_message = "DenyArchiveDelete must be an explicit Deny."
  }

  assert {
    condition     = one([for s in data.aws_iam_policy_document.images_bucket.statement : s.actions if s.sid == "DenyArchiveDelete"]) == toset(["s3:DeleteObject", "s3:DeleteObjectVersion"])
    error_message = "DenyArchiveDelete must cover DeleteObject and DeleteObjectVersion."
  }

  assert {
    condition     = one([for s in data.aws_iam_policy_document.images_bucket.statement : s.resources if s.sid == "DenyArchiveDelete"]) == toset(["arn:aws:s3:::test-img-bucket/archive/*"])
    error_message = "DenyArchiveDelete must apply to archive/* only."
  }

  assert {
    condition     = one([for s in data.aws_iam_policy_document.images_bucket.statement : one(s.principals).identifiers if s.sid == "DenyArchiveDelete"]) == toset(["*"])
    error_message = "DenyArchiveDelete must apply to every principal."
  }

  assert {
    condition     = toset([for s in data.aws_iam_policy_document.images_bucket.statement : s.sid]) == toset(["AllowCloudFrontReadImg", "DenyInsecureTransport", "DenyArchiveDelete"])
    error_message = "The bucket policy must contain exactly the three expected statements."
  }
}

run "image_bucket_policy_allows_only_oac_read_of_img_and_denies_http" {
  command = plan

  assert {
    condition     = one([for s in data.aws_iam_policy_document.images_bucket.statement : s.actions if s.sid == "AllowCloudFrontReadImg"]) == toset(["s3:GetObject"])
    error_message = "OAC may only s3:GetObject."
  }

  assert {
    condition     = one([for s in data.aws_iam_policy_document.images_bucket.statement : [for r in s.resources : endswith(r, "/img/*")] if s.sid == "AllowCloudFrontReadImg"]) == [true]
    error_message = "OAC read must be limited to img/*."
  }

  assert {
    condition     = one([for s in data.aws_iam_policy_document.images_bucket.statement : one(s.condition).variable if s.sid == "AllowCloudFrontReadImg"]) == "AWS:SourceArn"
    error_message = "OAC read must be conditioned on the distribution ARN."
  }

  assert {
    condition     = one([for s in data.aws_iam_policy_document.images_bucket.statement : s.effect if s.sid == "DenyInsecureTransport"]) == "Deny"
    error_message = "Non-TLS requests to the image bucket must be denied."
  }
}

# ── Edge: config bot role ───────────────────────────────

run "config_bot_is_oidc_main_branch_and_put_only" {
  command = plan

  assert {
    condition     = aws_iam_role.config_bot.name == "henniefrancis-tech-config-bot"
    error_message = "Config bot role name must be <project>-config-bot."
  }

  assert {
    condition     = join(",", one([for c in data.aws_iam_policy_document.config_bot_trust.statement[0].condition : tolist(c.values) if c.variable == "token.actions.githubusercontent.com:sub"])) == "repo:henniefrancis/config:ref:refs/heads/main"
    error_message = "Trust must be limited to the config repo main branch."
  }

  assert {
    condition     = join(",", one([for c in data.aws_iam_policy_document.config_bot_trust.statement[0].condition : tolist(c.values) if c.variable == "token.actions.githubusercontent.com:aud"])) == "sts.amazonaws.com"
    error_message = "Trust must require the sts.amazonaws.com audience."
  }

  assert {
    condition     = data.aws_iam_policy_document.config_bot.statement[0].actions == toset(["s3:PutObject"])
    error_message = "The bot may only s3:PutObject (no Get, List or Delete)."
  }

  assert {
    condition     = length(data.aws_iam_policy_document.config_bot.statement) == 1 && length(data.aws_iam_policy_document.config_bot.statement[0].resources) == 3
    error_message = "The bot policy must have exactly one statement with three resources (img/*, originals/* and archive/*)."
  }

  assert {
    condition     = contains(data.aws_iam_policy_document.config_bot.statement[0].resources, "arn:aws:s3:::test-img-bucket/archive/*")
    error_message = "The bot must be able to put evidence under archive/*."
  }
}

# ── Edge: origin secret in SSM, instance read access ────

run "origin_verify_parameters_are_secure_strings" {
  command = plan

  assert {
    condition     = aws_ssm_parameter.origin_verify_current.name == "/henniefrancis-tech/origin-verify/current" && aws_ssm_parameter.origin_verify_current.type == "SecureString"
    error_message = "The current origin verify parameter must be a SecureString at the agreed path."
  }

  assert {
    condition     = aws_ssm_parameter.origin_verify_previous.name == "/henniefrancis-tech/origin-verify/previous" && aws_ssm_parameter.origin_verify_previous.type == "SecureString"
    error_message = "The previous origin verify parameter must be a SecureString at the agreed path."
  }

  assert {
    condition     = nonsensitive(aws_ssm_parameter.origin_verify_previous.value) == "none"
    error_message = "An empty previous secret must be stored as the placeholder none."
  }
}

run "previous_secret_is_stored_when_set" {
  command = plan

  variables {
    origin_verify_secret_previous = "mockmockmockmockmockmockmockmockmockmockmockmockmockmockmockmock"
  }

  assert {
    condition     = nonsensitive(aws_ssm_parameter.origin_verify_previous.value) == "mockmockmockmockmockmockmockmockmockmockmockmockmockmockmockmock"
    error_message = "A set previous secret must be stored as given."
  }
}

run "instance_can_read_only_the_two_parameters" {
  command = plan

  assert {
    condition     = data.aws_iam_policy_document.ec2_origin_verify_read.statement[0].actions == toset(["ssm:GetParameter"])
    error_message = "The instance may only ssm:GetParameter."
  }

  assert {
    condition     = length(data.aws_iam_policy_document.ec2_origin_verify_read.statement[0].resources) == 2
    error_message = "The instance may read exactly the two origin verify parameters."
  }
}

# ── New variable guardrails ─────────────────────────────

run "rejects_short_origin_verify_secret" {
  command = plan

  variables {
    origin_verify_secret = "too-short"
  }

  expect_failures = [var.origin_verify_secret]
}

run "rejects_non_alphanumeric_origin_verify_secret" {
  command = plan

  variables {
    origin_verify_secret = "0123456789abcdef0123456789abcdef!!"
  }

  expect_failures = [var.origin_verify_secret]
}

run "rejects_too_long_origin_verify_secret" {
  command = plan

  variables {
    origin_verify_secret = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  }

  expect_failures = [var.origin_verify_secret]
}

run "rejects_short_previous_secret" {
  command = plan

  variables {
    origin_verify_secret_previous = "short"
  }

  expect_failures = [var.origin_verify_secret_previous]
}

run "rejects_too_long_previous_secret" {
  command = plan

  variables {
    origin_verify_secret_previous = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  }

  expect_failures = [var.origin_verify_secret_previous]
}

run "accepts_secret_at_the_maximum_length" {
  command = plan

  variables {
    origin_verify_secret          = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    origin_verify_secret_previous = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  }

  assert {
    condition     = length(nonsensitive(aws_ssm_parameter.origin_verify_current.value)) == 64
    error_message = "A 64 character secret must be accepted."
  }
}

run "rejects_http_only_origin" {
  command = plan

  variables {
    cloudfront_origin_protocol_policy = "http-only"
  }

  expect_failures = [var.cloudfront_origin_protocol_policy]
}

run "rejects_invalid_config_repository" {
  command = plan

  variables {
    config_repository = "not a repo"
  }

  expect_failures = [var.config_repository]
}
