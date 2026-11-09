# ============================================================
# alarms.tf - uptime health check, CloudFront 5xx alarm and the
# notification topic
#
# CloudFront publishes its metrics in us-east-1 only, so the alarm, the
# topic and the key all live there (provider alias aws.us_east_1, defined
# in cloudfront.tf).
#
# The topic is encrypted with a customer managed key: CloudWatch cannot
# publish to a topic that uses the AWS managed SNS key.
#
# An email subscription is created only when var.alarm_email is set. SNS
# sends the address a confirmation message; the owner must confirm it.
# ============================================================

data "aws_iam_policy_document" "alarm_key" {
  provider = aws.us_east_1

  statement {
    sid       = "AccountAdministration"
    effect    = "Allow"
    actions   = ["kms:*"]
    resources = ["*"]

    principals {
      type        = "AWS"
      identifiers = ["arn:${data.aws_partition.current.partition}:iam::${local.account_id}:root"]
    }
  }

  statement {
    sid       = "CloudWatchAlarmsPublish"
    effect    = "Allow"
    actions   = ["kms:Decrypt", "kms:GenerateDataKey*"]
    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["cloudwatch.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }

    # Only alarms in this account and region may use the key, not any
    # CloudWatch alarm that names the account (confused deputy guard).
    # https://docs.aws.amazon.com/sns/latest/dg/sns-key-management.html
    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:${data.aws_partition.current.partition}:cloudwatch:us-east-1:${local.account_id}:alarm:*"]
    }
  }
}

resource "aws_kms_key" "alarms" {
  provider = aws.us_east_1

  description             = "Encrypts the CloudFront alarm topic for ${var.project_name}"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  policy                  = data.aws_iam_policy_document.alarm_key.json

  tags = { Name = "${local.name_prefix_us_east_1}-alarms" }
}

resource "aws_kms_alias" "alarms" {
  provider = aws.us_east_1

  name          = "alias/${var.project_name}-alarms"
  target_key_id = aws_kms_key.alarms.key_id
}

resource "aws_sns_topic" "alarms" {
  provider = aws.us_east_1

  name              = "${var.project_name}-alarms"
  kms_master_key_id = aws_kms_key.alarms.arn

  tags = { Name = "${local.name_prefix_us_east_1}-alarms" }
}

# nonsensitive() exposes only whether the address is set, not the address.
resource "aws_sns_topic_subscription" "alarm_email" {
  provider = aws.us_east_1
  count    = nonsensitive(var.alarm_email != "") ? 1 : 0

  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# Above 5 percent 5xx for 2 of the last 3 five-minute periods. No traffic
# means no data, which is not a breach.
resource "aws_cloudwatch_metric_alarm" "cloudfront_5xx" {
  provider = aws.us_east_1

  alarm_name          = "${var.project_name}-cloudfront-5xx-rate"
  alarm_description   = "CloudFront 5xx error rate above 5 percent for 2 of 3 five-minute periods"
  namespace           = "AWS/CloudFront"
  metric_name         = "5xxErrorRate"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 3
  datapoints_to_alarm = 2
  threshold           = 5
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DistributionId = aws_cloudfront_distribution.frontend.id
    Region         = "Global"
  }

  alarm_actions = [aws_sns_topic.alarms.arn]
  ok_actions    = [aws_sns_topic.alarms.arn]

  tags = { Name = "${local.name_prefix_us_east_1}-cloudfront-5xx" }
}

# ------------------------------------------------------------
# Uptime: an outside HTTPS check of the public site.
#
# WHY: the most likely failure of the origin lockdown is nginx answering
# 403 to everything (header drift or an empty include). That shows in the
# 4xx rate, not in the 5xx rate, so the 5xx alarm stays quiet. Route 53
# treats only a 2xx or 3xx answer as healthy, so a 403 or a 5xx fails the
# check. It also catches an expired certificate (no expiry emails come from
# Let's Encrypt any more) because the HTTPS handshake fails.
#
# Settings: HTTPS on port 443, path "/", SNI on, 30 second interval, three
# failures in a row, and the minimum of three checking regions to keep the
# load on the site low. Route 53 health checkers need the endpoint to be
# reachable from the internet, which the public site is.
# https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-creating-values.html
# ------------------------------------------------------------

resource "aws_route53_health_check" "site" {
  provider = aws.us_east_1

  type              = "HTTPS"
  fqdn              = var.frontend_primary_domain
  port              = 443
  resource_path     = "/"
  enable_sni        = true
  request_interval  = 30
  failure_threshold = 3
  regions           = ["us-east-1", "eu-west-1", "ap-southeast-1"]

  tags = { Name = "${local.name_prefix_us_east_1}-site-uptime" }
}

# Route 53 publishes HealthCheckStatus (1 healthy, 0 unhealthy) once a
# minute, in us-east-1 only. The AWS guidance for this metric is the
# Minimum statistic, alarm when it is below 1, over consecutive one-minute
# periods; two periods ride out a single bad sample.
# https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/monitoring-health-checks.html
# Missing data counts as a breach: a check that stops reporting is a
# reason to look.
resource "aws_cloudwatch_metric_alarm" "site_uptime" {
  provider = aws.us_east_1

  alarm_name          = "${var.project_name}-site-uptime"
  alarm_description   = "The public site fails the outside HTTPS check (anything other than a 2xx or 3xx answer, or a TLS failure)"
  namespace           = "AWS/Route53"
  metric_name         = "HealthCheckStatus"
  statistic           = "Minimum"
  period              = 60
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  threshold           = 1
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "breaching"

  dimensions = {
    HealthCheckId = aws_route53_health_check.site.id
  }

  alarm_actions = [aws_sns_topic.alarms.arn]
  ok_actions    = [aws_sns_topic.alarms.arn]

  tags = { Name = "${local.name_prefix_us_east_1}-site-uptime" }
}

# A CloudFront 4xxErrorRate alarm is deliberately NOT added. A public site
# gets a steady stream of scanner requests for paths that do not exist
# (admin panels, dotfiles, old CMS paths), and each one is a normal 404, so
# any rate threshold would flap or have to be so high that a real 403 on
# every page would not cross it. The health check above is the signal for
# "everything is refused".
