# ============================================================
# cloudfront_policies.tf - cache and response headers policies
#
# WHY:
#   The managed policy UseOriginCacheControlHeaders puts the viewer
#   Host header in the cache key, so Host is forwarded to the origin and
#   the origin certificate would have to match the public names. The
#   custom policy below forwards and keys on nothing, so the origin only
#   ever sees its own hostname (origin.<domain>) and the cache key is
#   not split by host. www is handled at the edge by a CloudFront
#   Function (cloudfront_functions.tf).
#
# Docs:
#   https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_cache_policy
#   https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_response_headers_policy
# ============================================================

# Managed policy CachingOptimized, used by the /img/* behaviour. Referenced
# by its stable global ID (same approach the old managed policy used).
# https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
locals {
  cache_policy_caching_optimized = "658327ea-f89d-4fab-a63d-7e88639e58f6"
}

# Site cache policy: nothing in the cache key, gzip and brotli on, TTL
# bounds wide open so the ORIGIN Cache-Control header decides:
#   HTML    no-cache, stale-if-error=86400  (revalidated, never held)
#   assets  public, max-age=31536000, immutable
resource "aws_cloudfront_cache_policy" "site" {
  name        = "${var.project_name}-site"
  comment     = "Site cache policy: empty cache key (no Host, cookies or query strings); the origin Cache-Control header decides."
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

# Origin request policy: send the viewer query string to the origin, but not
# in the cache key. nginx redirects (/x/ and /x.html to /x) append the query
# they receive, so without this a campaign parameter would be dropped. The
# cache policy above has a TTL of 0 for pages and redirects, so a redirect
# is revalidated per request and is never served to a viewer with a
# different query. No headers or cookies are forwarded, so the origin still
# only ever sees its own hostname.
resource "aws_cloudfront_origin_request_policy" "site" {
  name    = "${var.project_name}-site-query"
  comment = "Forward the viewer query string to the origin (not in the cache key). No headers or cookies."

  cookies_config {
    cookie_behavior = "none"
  }

  headers_config {
    header_behavior = "none"
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}

# Response headers policy. override = true so these values win over any
# header the origin (or S3) also sets. NO Content-Security-Policy here:
# it arrives in a later change, and must then OMIT script-src and default-src
# because Angular autoCsp supplies those in a meta tag.
resource "aws_cloudfront_response_headers_policy" "site" {
  name    = "${var.project_name}-site-security"
  comment = "HSTS, nosniff, frame options, referrer policy and permissions policy. CSP is added in a later change."

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = var.hsts_include_subdomains
      preload                    = false
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "SAMEORIGIN"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }

  # No first-class block exists for Permissions-Policy, so it is a custom header.
  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()"
      override = true
    }
  }
}
