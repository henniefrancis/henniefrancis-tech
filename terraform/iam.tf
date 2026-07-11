# ============================================================
# iam.tf — GitHub Actions OIDC deploy role + EC2 instance role
#
# IMPROVEMENT over the previous manual setup (infra/AWS.md): both roles
# are Terraform-managed and least-privilege. The old console-created
# EC2SSM role used "Resource": "*" for SSM and EC2 — the deploy role
# below is scoped to THIS instance, THIS bucket prefix, and THIS
# CloudFront distribution only.
#
# IAM role names have a 64-char limit, so roles use the short
# "<project>-<purpose>" form instead of local.name_prefix.
# ============================================================

# ── GitHub OIDC identity provider ────────────────────────────
# The account already has token.actions.githubusercontent.com (created
# manually per infra/AWS.md), so the default is to LOOK IT UP. Flip
# create_github_oidc_provider = true for a greenfield account.

data "aws_iam_openid_connect_provider" "github" {
  count = var.create_github_oidc_provider ? 0 : 1
  url   = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_github_oidc_provider ? 1 : 0
  url   = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  # AWS validates GitHub's cert against trusted root CAs since 2023;
  # the thumbprints are kept for API compatibility.
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
  ]

  tags = { Name = "github-actions-oidc" }
}

locals {
  github_oidc_provider_arn = var.create_github_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn
}

# ── Deploy role (assumed by GitHub Actions via OIDC) ─────────
# Trusts ONLY this repository, and only from the main branch or the
# "production" GitHub environment (the deploy job runs with
# `environment: production`, which changes the token's sub claim).

data "aws_iam_policy_document" "github_deploy_trust" {
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

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_repository}:ref:refs/heads/main",
        "repo:${var.github_repository}:environment:production",
      ]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name               = "${var.project_name}-github-deploy"
  description        = "GitHub Actions deploy role for ${var.github_repository} (OIDC, main branch / production environment only)."
  assume_role_policy = data.aws_iam_policy_document.github_deploy_trust.json

  max_session_duration = 3600

  tags = { Name = "${var.project_name}-github-deploy" }
}

data "aws_iam_policy_document" "github_deploy" {
  # Upload build artifacts to this project's prefix only.
  statement {
    sid    = "ArtifactUpload"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
    ]
    resources = ["${aws_s3_bucket.artifacts.arn}/${var.project_name}/*"]
  }

  statement {
    sid       = "ArtifactList"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.artifacts.arn]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["${var.project_name}/*"]
    }
  }

  # Run shell commands on THIS instance with the AWS-owned document only.
  # SendCommand authorizes against both the document and the target.
  statement {
    sid     = "SsmSendCommand"
    effect  = "Allow"
    actions = ["ssm:SendCommand"]
    resources = [
      "arn:${data.aws_partition.current.partition}:ssm:${var.aws_region}::document/AWS-RunShellScript",
      "arn:${data.aws_partition.current.partition}:ec2:${var.aws_region}:${local.account_id}:instance/${aws_instance.web.id}",
    ]
  }

  # Poll command results. These read-only actions don't support resource
  # scoping to an instance, so they're account-wide by necessity.
  statement {
    sid    = "SsmReadResults"
    effect = "Allow"
    actions = [
      "ssm:GetCommandInvocation",
      "ssm:ListCommands",
      "ssm:ListCommandInvocations",
    ]
    resources = ["*"]
  }

  # The deploy workflow resolves the target instance at deploy time by
  # its Name tag, so an instance replacement never leaves the pipeline
  # pointing at a dead id. Describe* does not support resource scoping.
  statement {
    sid       = "DiscoverInstance"
    effect    = "Allow"
    actions   = ["ec2:DescribeInstances"]
    resources = ["*"]
  }

  # Invalidate the site's distribution after each deploy.
  statement {
    sid    = "CloudFrontInvalidate"
    effect = "Allow"
    actions = [
      "cloudfront:CreateInvalidation",
      "cloudfront:GetInvalidation",
    ]
    resources = [aws_cloudfront_distribution.frontend.arn]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "${var.project_name}-github-deploy"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.github_deploy.json
}

# ── EC2 instance role (SSM managed instance + artifact read) ─

data "aws_iam_policy_document" "ec2_trust" {
  statement {
    sid     = "EC2Assume"
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2" {
  name               = "${var.project_name}-ec2"
  description        = "Instance role for ${local.name_prefix}-ec2: SSM management + read-only access to its own deploy artifacts."
  assume_role_policy = data.aws_iam_policy_document.ec2_trust.json

  tags = { Name = "${var.project_name}-ec2" }
}

# SSM Session Manager + Run Command agent permissions (AWS-managed).
resource "aws_iam_role_policy_attachment" "ec2_ssm_core" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "ec2_artifacts_read" {
  statement {
    sid       = "ArtifactDownload"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.artifacts.arn}/${var.project_name}/*"]
  }

  statement {
    sid       = "ArtifactList"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.artifacts.arn]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["${var.project_name}/*"]
    }
  }
}

resource "aws_iam_role_policy" "ec2_artifacts_read" {
  name   = "${var.project_name}-artifacts-read"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.ec2_artifacts_read.json
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project_name}-ec2"
  role = aws_iam_role.ec2.name

  tags = { Name = "${var.project_name}-ec2" }
}
