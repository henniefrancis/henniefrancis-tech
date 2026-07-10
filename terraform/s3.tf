# ============================================================
# s3.tf — Deploy artifacts bucket
#
# Replaces the manually-created temp-deploy-hennie-francis-tech-bucket.
# Layout mirrors the community account:
#   s3://deploy-artifacts-<account_id>/<project>/<version>/site.zip
#   s3://deploy-artifacts-<account_id>/<project>/latest/site.zip
#
# SECURITY:
#  - All public access blocked.
#  - SSE-S3 (AES-256) encryption at rest.
#  - Bucket policy denies any non-TLS request.
#  - Versioning on (accidental-overwrite protection for latest/).
#  - Lifecycle expires artifacts after var.artifact_retention_days —
#    latest/ is only read during a deploy, so expiry is harmless.
# ============================================================

resource "aws_s3_bucket" "artifacts" {
  bucket = local.artifacts_bucket_name

  tags = {
    Name = local.artifacts_bucket_name
  }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    id     = "expire-deploy-artifacts"
    status = "Enabled"

    filter {
      prefix = "${var.project_name}/"
    }

    expiration {
      days = var.artifact_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Deny any request that isn't made over TLS.
data "aws_iam_policy_document" "artifacts_tls_only" {
  statement {
    sid     = "DenyInsecureTransport"
    effect  = "Deny"
    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.artifacts.arn,
      "${aws_s3_bucket.artifacts.arn}/*",
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
}

resource "aws_s3_bucket_policy" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  policy = data.aws_iam_policy_document.artifacts_tls_only.json

  depends_on = [aws_s3_bucket_public_access_block.artifacts]
}
