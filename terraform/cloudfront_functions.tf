# ============================================================
# cloudfront_functions.tf - www to apex redirect at the edge
#
# WHY:
#   Host is no longer forwarded to the origin, so nginx cannot tell www
#   from the apex. A viewer-request CloudFront Function answers www with
#   a 301 to the apex before the cache or the origin is involved.
#
# The code lives in functions/www-redirect.js, which has a Node unit
# test (functions/www-redirect.test.js, run with `node --test`).
#
# Docs:
#   https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_function
#   https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-javascript-runtime-20.html
# ============================================================

resource "aws_cloudfront_function" "www_redirect" {
  name    = "${var.project_name}-www-redirect"
  comment = "301 from www to the apex domain, keeping path and query string."
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = file("${path.module}/functions/www-redirect.js")
}
