# ============================================================
# cloudfront.tf — CloudFront CDN in front of the EC2/nginx origin
#
# WHY:
#   Global CDN + TLS at the edge + IPv6 for viewers. The origin
#   Cache-Control header decides caching (HTML no-cache with
#   stale-if-error, hashed assets immutable), see deploy/nginx and the
#   cache policy in cloudfront_policies.tf. Images are served from a
#   private S3 bucket at /img/* through Origin Access Control.
#   The origin is reached over HTTPS only and must see the secret
#   X-Origin-Verify header.
#
# COST (small site): within the CloudFront always-free tier
#   (1 TB egress + 10M requests/month). Realistically ≈ $0/month.
#
# IMPORTANT — manual DNS steps (DNS is managed externally, see README):
#   1. Point var.origin_domain_name (origin.henniefrancis.tech) at the
#      EIP (A) and the instance IPv6 address (AAAA).
#   2. Create the ACM validation CNAMEs from `acm_validation_records`.
#   3. After the cert is ISSUED, cut henniefrancis.tech + www over to
#      `cloudfront_domain_name` (see the cutover runbook).
# ============================================================

# CloudFront certificates MUST live in us-east-1, regardless of where
# the rest of the stack runs (af-south-1). Used ONLY for the ACM cert.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = local.common_tags
  }
}

# ── ACM certificate (us-east-1, DNS-validated) ───────────────

resource "aws_acm_certificate" "frontend" {
  provider                  = aws.us_east_1
  domain_name               = var.frontend_primary_domain
  subject_alternative_names = var.frontend_alternate_domains
  validation_method         = "DNS"

  # RETAINED: losing the certificate means an owner DNS change. Keep the
  # validation CNAMEs at the DNS provider forever so it auto-renews.
  lifecycle {
    create_before_destroy = true
    prevent_destroy       = true
  }

  tags = { Name = "${local.name_prefix_us_east_1}-frontend-cert" }
}

# Waits until ACM observes the externally-created validation CNAMEs and
# issues the certificate. Add the records from `acm_validation_records`
# BEFORE applying (or apply the cert first with -target, add the
# records, then apply the rest).
resource "aws_acm_certificate_validation" "frontend" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.frontend.arn

  timeouts {
    create = "60m"
  }
}

# ── Distribution ─────────────────────────────────────────────

resource "aws_cloudfront_distribution" "frontend" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "${local.name_prefix} frontend CDN"
  # No default root object: the origin serves "/" itself and redirects
  # "/index.html" to "/", so asking it for index.html would loop.
  default_root_object = ""
  price_class         = var.cloudfront_price_class
  http_version        = "http2and3"
  aliases             = concat([var.frontend_primary_domain], var.frontend_alternate_domains)

  origin {
    domain_name = var.origin_domain_name
    origin_id   = "ec2-nginx"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = var.cloudfront_origin_protocol_policy
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    # Shared secret that nginx enforces: the origin answers 403 on 443 when this
    # header is missing or wrong (only CloudFront can reach port 443 anyway).
    custom_header {
      name  = "X-Origin-Verify"
      value = var.origin_verify_secret
    }
  }

  # Private image bucket, read through Origin Access Control (s3_images.tf).
  origin {
    domain_name              = aws_s3_bucket.images.bucket_regional_domain_name
    origin_id                = "s3-images"
    origin_access_control_id = aws_cloudfront_origin_access_control.images.id
  }

  default_cache_behavior {
    target_origin_id       = "ec2-nginx"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.site.id

    origin_request_policy_id   = aws_cloudfront_origin_request_policy.site.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.site.id

    # www -> apex 301 at the edge (the origin never sees the viewer Host).
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.www_redirect.arn
    }
  }

  # Images: served from the private bucket, cached for a year (the objects
  # carry immutable Cache-Control and content-hashed names).
  ordered_cache_behavior {
    path_pattern           = "/img/*"
    target_origin_id       = "s3-images"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = local.cache_policy_caching_optimized

    response_headers_policy_id = aws_cloudfront_response_headers_policy.site.id
  }

  # Static multi-page site: nginx serves the styled 404/50x pages itself
  # (error_page in the user_data template), so 404s pass through with the
  # right content and status. The mappings below are a BEST-EFFORT for
  # when the ORIGIN ITSELF is unreachable: CloudFront serves /50x.html
  # from its cache instead of the default CloudFront error text. If the
  # page was never cached at that edge, CloudFront falls back to its
  # default page — unavoidable without a second origin.
  custom_error_response {
    error_code            = 502
    response_code         = 502
    response_page_path    = "/50x.html"
    error_caching_min_ttl = 30
  }

  custom_error_response {
    error_code            = 503
    response_code         = 503
    response_page_path    = "/50x.html"
    error_caching_min_ttl = 30
  }

  custom_error_response {
    error_code            = 504
    response_code         = 504
    response_page_path    = "/50x.html"
    error_caching_min_ttl = 30
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.frontend.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = { Name = "${local.name_prefix}-cdn" }

  # RETAINED: recreating the distribution changes its hostname, which means
  # an owner DNS change at the DNS provider.
  lifecycle {
    prevent_destroy = true
  }
}
