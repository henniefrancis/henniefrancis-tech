# ============================================================
# security_groups.tf — Security group for the EC2 instance
#
# DESIGN (same as awscommza base):
#  - aws_vpc_security_group_ingress_rule / egress_rule resources
#    instead of inline blocks — avoids state drift.
#  - HTTP (80) and HTTPS (443) open for both IPv4 and IPv6.
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
# Port 80 stays open for the Let's Encrypt HTTP-01 challenge and for
# CloudFront when cloudfront_origin_protocol_policy = "http-only".

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

# ── Ingress — HTTPS (IPv4 + IPv6) ────────────────────────────

resource "aws_vpc_security_group_ingress_rule" "https" {
  security_group_id = aws_security_group.web.id
  description       = "HTTPS from internet (IPv4)"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"

  tags = { Name = "${local.name_prefix}-allow-https" }
}

resource "aws_vpc_security_group_ingress_rule" "https_ipv6" {
  security_group_id = aws_security_group.web.id
  description       = "HTTPS from internet (IPv6)"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv6         = "::/0"

  tags = { Name = "${local.name_prefix}-allow-https-ipv6" }
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
