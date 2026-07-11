# ============================================================
# debug.tf — TEMPORARY boot diagnostics (DELETE when solved)
#
# The instance is reachable inbound but SSM reports Undeliverable and
# nginx never comes up, so we cannot shell in. This Lambda reads the
# EC2 serial console output (user_data logs to /dev/console) and
# returns the tail as a Terraform output — runnable entirely through
# HCP Terraform's remote execution, no local credentials needed.
# ============================================================

data "archive_file" "console_reader" {
  type        = "zip"
  output_path = "${path.module}/console_reader.zip"

  source {
    filename = "index.py"
    content  = <<PY
import base64
import boto3


def handler(event, context):
    ec2 = boto3.client("ec2")
    out = ec2.get_console_output(InstanceId=event["instance_id"], Latest=True)
    data = out.get("Output") or ""
    try:
        text = base64.b64decode(data).decode("utf-8", "replace")
    except Exception:
        text = data
    return {"tail": text[-14000:]}
PY
  }
}

data "aws_iam_policy_document" "debug_lambda_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "debug_lambda" {
  name               = "${var.project_name}-debug-console"
  description        = "TEMPORARY: lets the console-reader Lambda fetch EC2 serial console output."
  assume_role_policy = data.aws_iam_policy_document.debug_lambda_trust.json

  tags = { Name = "${var.project_name}-debug-console" }
}

data "aws_iam_policy_document" "debug_lambda" {
  statement {
    sid       = "ReadConsole"
    effect    = "Allow"
    actions   = ["ec2:GetConsoleOutput"]
    resources = ["*"]
  }

  statement {
    sid    = "Logs"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "debug_lambda" {
  name   = "${var.project_name}-debug-console"
  role   = aws_iam_role.debug_lambda.id
  policy = data.aws_iam_policy_document.debug_lambda.json
}

resource "aws_lambda_function" "console_reader" {
  function_name    = "${var.project_name}-console-reader"
  role             = aws_iam_role.debug_lambda.arn
  runtime          = "python3.12"
  handler          = "index.handler"
  architectures    = ["arm64"]
  filename         = data.archive_file.console_reader.output_path
  source_code_hash = data.archive_file.console_reader.output_base64sha256
  timeout          = 30

  tags = { Name = "${var.project_name}-console-reader" }
}

# Deferred to apply (depends_on) so it runs after the function exists.
data "aws_lambda_invocation" "console" {
  function_name = aws_lambda_function.console_reader.function_name
  input         = jsonencode({ instance_id = aws_instance.web.id })

  depends_on = [aws_iam_role_policy.debug_lambda]
}

output "instance_console_tail" {
  description = "TEMPORARY: tail of the EC2 serial console (boot + user_data log)."
  value       = data.aws_lambda_invocation.console.result
}
