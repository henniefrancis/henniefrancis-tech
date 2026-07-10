# ============================================================
# cloudfront.tf — CloudFront CDN in front of the EC2/nginx origin
#
# WHY:
#   Global CDN + TLS at the edge + IPv6 for viewers, same as
#   passembly.co.za. Combined with the nginx cache rules in the
#   user_data template (HTML no-cache, assets short-cache) and the /*
#   invalidation on every deploy, users always get fresh HTML while
#   assets stay cached at the edge.
#
# COST (small site): within the CloudFront always-free tier
#   (1 TB egress + 10M requests/month). Realistically ≈ $0/month.
#
# IMPORTANT — manual DNS steps (DNS is managed externally, see README):
#   1. Point var.origin_domain_name (origin.henniefrancis.tech) at the
#      EIP (A) and the instance IPv6 address (AAAA).
#   2. Create the ACM validation CNAMEs from `acm_validation_records`.
#   3. After the cert is ISSUED, cut henniefrancis.tech + www over to
#      `cloudfront_domain_name`.
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

  lifecycle {
    create_before_destroy = true
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

# AWS-managed cache policy "UseOriginCacheControlHeaders" — honours the
# origin's Cache-Control header (Min/Default TTL 0), so HTML (no-cache)
# revalidates while CSS/JS/images cache at the edge for exactly as long
# as nginx says. Referenced by its stable global ID because its API name
# is NOT prefixed with "Managed-", which makes a name lookup error-prone.
locals {
  # https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
  cache_policy_use_origin_cache_control = "83da9c7e-98b4-4e11-a168-04f0df8e2c65"
}

# ── Distribution ─────────────────────────────────────────────

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${local.name_prefix} frontend CDN"
  default_root_object = "index.html"
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
  }

  default_cache_behavior {
    target_origin_id       = "ec2-nginx"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = local.cache_policy_use_origin_cache_control
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
}
