# ============================================================
# security_groups.tf — Security group for the EC2 instance
#
# DESIGN (same as awscommza base):
#  - aws_vpc_security_group_ingress_rule / egress_rule resources
#    instead of inline blocks — avoids state drift.
#  - HTTP (80) open for both IPv4 and IPv6 (ACME HTTP-01 only; nginx
#    answers nothing else on it).
#  - HTTPS (443) open to CloudFront origin-facing prefix lists only, in
#    the cf_origin_v4 and cf_origin_v6 groups.
#  - Port 22 (SSH) closed by default. Set ssh_allowed_cidrs to open it
#    from specific IPs only — variable validation rejects 0.0.0.0/0.
#  - Egress unrestricted so the instance can reach AWS APIs (SSM, S3),
#    package repos (dnf), and Let's Encrypt.
# ============================================================

resource "aws_security_group" "web" {
  name        = "${local.name_prefix}-sg"
  description = "Security group for ${local.name_prefix} EC2 instance"
  vpc_id      = aws_vpc.main.id

  # IMPORTANT: no inline ingress/egress blocks — use the separate rule
  # resources below to avoid state drift.

  tags = {
    Name = "${local.name_prefix}-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ── Ingress — HTTP (IPv4 + IPv6) ─────────────────────────────
# Port 80 stays open to the world for the Let's Encrypt HTTP-01 challenge.
# nginx serves only the ACME path on it and drops everything else.

resource "aws_vpc_security_group_ingress_rule" "http" {
  security_group_id = aws_security_group.web.id
  description       = "HTTP from internet (IPv4)"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv4         = "0.0.0.0/0"

  tags = { Name = "${local.name_prefix}-allow-http" }
}

resource "aws_vpc_security_group_ingress_rule" "http_ipv6" {
  security_group_id = aws_security_group.web.id
  description       = "HTTP from internet (IPv6)"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv6         = "::/0"

  tags = { Name = "${local.name_prefix}-allow-http-ipv6" }
}

# ── Ingress - HTTPS (CloudFront only) ────────────────────────
# Port 443 is reachable only from CloudFront origin-facing addresses, through
# two extra groups (cf_origin_v4, cf_origin_v6) attached to the instance. There
# is deliberately no rule here that opens 443 to the world.
#
# One group per prefix list: each list counts as 55 rules against the default
# quota of 60 rules per group, so the IPv4 and IPv6 lists cannot share one.

data "aws_ec2_managed_prefix_list" "cloudfront_origin_v4" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

data "aws_ec2_managed_prefix_list" "cloudfront_origin_v6" {
  name = "com.amazonaws.global.ipv6.cloudfront.origin-facing"
}

resource "aws_security_group" "cf_origin_v4" {
  name        = "${local.name_prefix}-cf-origin-v4"
  description = "HTTPS from CloudFront origin-facing IPv4 addresses for ${local.name_prefix}"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-cf-origin-v4"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_vpc_security_group_ingress_rule" "https_cloudfront_v4" {
  security_group_id = aws_security_group.cf_origin_v4.id
  description       = "HTTPS from CloudFront (IPv4 prefix list)"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront_origin_v4.id

  tags = { Name = "${local.name_prefix}-allow-https-cloudfront-v4" }
}

resource "aws_security_group" "cf_origin_v6" {
  name        = "${local.name_prefix}-cf-origin-v6"
  description = "HTTPS from CloudFront origin-facing IPv6 addresses for ${local.name_prefix}"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-cf-origin-v6"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_vpc_security_group_ingress_rule" "https_cloudfront_v6" {
  security_group_id = aws_security_group.cf_origin_v6.id
  description       = "HTTPS from CloudFront (IPv6 prefix list)"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront_origin_v6.id

  tags = { Name = "${local.name_prefix}-allow-https-cloudfront-v6" }
}

# ── Ingress — SSH (optional, per-CIDR) ───────────────────────
# Disabled by default (ssh_allowed_cidrs = []). Primary access is SSM
# Session Manager. To enable temporarily, set ssh_allowed_cidrs in the
# HCP Terraform workspace variables, e.g. ["203.0.113.7/32"].

resource "aws_vpc_security_group_ingress_rule" "ssh" {
  for_each = toset(var.ssh_allowed_cidrs)

  security_group_id = aws_security_group.web.id
  description       = "SSH from ${each.value}"
  ip_protocol       = "tcp"
  from_port         = 22
  to_port           = 22
  cidr_ipv4         = each.value

  tags = { Name = "${local.name_prefix}-allow-ssh-${replace(each.value, "/", "-")}" }
}

# ── Egress — all (IPv4 + IPv6) ───────────────────────────────

resource "aws_vpc_security_group_egress_rule" "all_ipv4" {
  security_group_id = aws_security_group.web.id
  description       = "All outbound IPv4 (AWS APIs, dnf, Lets Encrypt, etc.)"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"

  tags = { Name = "${local.name_prefix}-allow-all-egress-ipv4" }
}

resource "aws_vpc_security_group_egress_rule" "all_ipv6" {
  security_group_id = aws_security_group.web.id
  description       = "All outbound IPv6 (AWS APIs, dnf, Lets Encrypt, etc.)"
  ip_protocol       = "-1"
  cidr_ipv6         = "::/0"

  tags = { Name = "${local.name_prefix}-allow-all-egress-ipv6" }
}
