# ============================================================
# alarms.tf - CloudFront 5xx alarm and its notification topic
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
