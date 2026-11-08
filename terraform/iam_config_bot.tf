# ============================================================
# iam_config_bot.tf - OIDC role for the private config repo's image bot
#
# The bot uploads processed images from
# a GitHub Actions run in var.config_repository. It can ONLY write new
# objects under img/, originals/ and archive/. No read, list or delete: uploaded
# objects are harmless until a merged record references them, and a
# leaked token cannot enumerate or remove anything.
#
# The role name uses the short "<project>-<purpose>" form (IAM names are
# capped at 64 characters, see iam.tf).
# ============================================================

data "aws_iam_policy_document" "config_bot_trust" {
  statement {
    sid     = "GitHubOIDC"
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Exact match on the config repository's main branch only.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.config_repository}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "config_bot" {
  name               = "${var.project_name}-config-bot"
  description        = "Image upload bot for ${var.config_repository} (OIDC, main branch only, PutObject on img/, originals/ and archive/ only)."
  assume_role_policy = data.aws_iam_policy_document.config_bot_trust.json

  max_session_duration = 3600

  tags = { Name = "${var.project_name}-config-bot" }
}

data "aws_iam_policy_document" "config_bot" {
  statement {
    sid     = "PutImages"
    effect  = "Allow"
    actions = ["s3:PutObject"]
    resources = [
      "${aws_s3_bucket.images.arn}/img/*",
      "${aws_s3_bucket.images.arn}/originals/*",
      "${aws_s3_bucket.images.arn}/archive/*",
    ]
  }
}

resource "aws_iam_role_policy" "config_bot" {
  name   = "${var.project_name}-config-bot"
  role   = aws_iam_role.config_bot.id
  policy = data.aws_iam_policy_document.config_bot.json
}
