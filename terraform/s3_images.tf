# ============================================================
# s3_images.tf - private image bucket served at /img/ through CloudFront
#
# WHY: images move out of an unmanaged public bucket into a
# private, versioned bucket owned by this stack. Only CloudFront can read
# it (Origin Access Control), only the key prefix img/ is readable, and
# the private originals/ prefix is never routed.
#
# Key layout:
#   img/{id}/{width}.webp   served variants (immutable)
#   originals/{id}.{ext}    private originals, never served
#   archive/...             byte-exact evidence, never served, never
#                           expires, and cannot be deleted without a
#                           Terraform change (see DenyArchiveDelete below)
#
# RETAINED: prevent_destroy. The bucket holds every published image and
# the originals; never recreate it.
#
# Docs:
#   https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
#   https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_ownership_controls
#   https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_origin_access_control
#   https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
# ============================================================

locals {
  # <team>-<account>-<region>-<project>-img: 59 characters, under the
  # 63 character S3 limit (asserted in tests/unit.tftest.hcl).
  images_bucket_name = "${local.name_prefix}-img"
}

resource "aws_s3_bucket" "images" {
  bucket = local.images_bucket_name

  tags = {
    Name = local.images_bucket_name
  }

  lifecycle {
    prevent_destroy = true
  }
}

# BucketOwnerEnforced disables ACLs entirely.
resource "aws_s3_bucket_ownership_controls" "images" {
  bucket = aws_s3_bucket.images.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "images" {
  bucket = aws_s3_bucket.images.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "images" {
  bucket = aws_s3_bucket.images.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_versioning" "images" {
  bucket = aws_s3_bucket.images.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Old versions of overwritten or deleted objects under img/ and originals/
# stay recoverable for 30 days. Current objects never expire.
#
# Nothing under archive/ ever expires. S3 lifecycle filters cannot exclude a
# prefix, so every rule that expires something carries an explicit prefix
# (img/ or originals/). The only rule with an empty filter aborts incomplete
# multipart uploads, which never touches stored objects. A test fails if an
# expiring rule is not scoped to one of the two prefixes.
resource "aws_s3_bucket_lifecycle_configuration" "images" {
  bucket = aws_s3_bucket.images.id

  # Versioning must exist before lifecycle rules that mention noncurrent versions.
  depends_on = [aws_s3_bucket_versioning.images]

  rule {
    id     = "img-noncurrent-30d"
    status = "Enabled"

    filter {
      prefix = "img/"
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "originals-noncurrent-30d"
    status = "Enabled"

    filter {
      prefix = "originals/"
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "abort-multipart-7d"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# ── Origin Access Control ────────────────────────────────────

resource "aws_cloudfront_origin_access_control" "images" {
  name                              = "${var.project_name}-img"
  description                       = "OAC for the ${var.project_name} image bucket (SigV4, always sign)."
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ── Bucket policy ────────────────────────────────────────────
# 1. CloudFront (this distribution only) may read img/* and nothing else.
#    Without s3:ListBucket, a missing key answers 403, not 404.
# 2. Any non-TLS request is denied.
# 3. Nobody can delete an object or an object version under archive/. The
#    protection is removed only by a reviewed Terraform change to this policy.

data "aws_iam_policy_document" "images_bucket" {
  statement {
    sid       = "AllowCloudFrontReadImg"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.images.arn}/img/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend.arn]
    }
  }

  statement {
    sid     = "DenyInsecureTransport"
    effect  = "Deny"
    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.images.arn,
      "${aws_s3_bucket.images.arn}/*",
    ]

    principals {
      type        = "AWS"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }

  statement {
    sid    = "DenyArchiveDelete"
    effect = "Deny"
    actions = [
      "s3:DeleteObject",
      "s3:DeleteObjectVersion",
    ]
    resources = ["${aws_s3_bucket.images.arn}/archive/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }
  }
}

resource "aws_s3_bucket_policy" "images" {
  bucket = aws_s3_bucket.images.id
  policy = data.aws_iam_policy_document.images_bucket.json

  depends_on = [aws_s3_bucket_public_access_block.images]
}
