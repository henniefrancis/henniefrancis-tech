# ============================================================
# ec2.tf — EC2 instance and Elastic IP
#
# SECURITY DECISIONS (same posture as passembly-web):
#  1. IMDSv2 required (http_tokens = required) — prevents SSRF attacks
#     from stealing instance credentials via IMDS v1.
#  2. ED25519 key pair attached (keypair.tf) — emergency SSH only.
#     Primary access is SSM Session Manager; port 22 stays closed
#     unless ssh_allowed_cidrs is set.
#  3. Root volume encrypted with the AWS-managed key (AES-256).
#  4. gp3 volume type — better performance/cost than gp2.
#  5. user_data_replace_on_change = false — prevents accidental
#     instance replacement when only the bootstrap script changes.
#     To reprovision: terraform taint aws_instance.web
#  6. IPv6 address assigned when assign_ipv6_address = true
#     (the subnet has an IPv6 /64 — see vpc.tf).
#
# INSTANCE TYPE: t4g.nano (Graviton2 ARM64, 2 vCPU / 0.5 GB RAM).
# Scale up by changing var.instance_type — no re-create needed.
#
# ELASTIC IP: static public IPv4 so the origin DNS record survives
# stop/start cycles. The IPv6 address is stable for the instance's
# lifetime (assigned from the subnet /64).
# ============================================================

resource "aws_instance" "web" {
  ami                    = data.aws_ssm_parameter.al2023_arm64.value
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public_1a.id
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  vpc_security_group_ids = [aws_security_group.web.id]
  key_name               = aws_key_pair.web.key_name

  # One IPv6 address from the subnet's /64.
  ipv6_address_count = var.assign_ipv6_address ? 1 : 0

  # IMDSv2: require a session token for metadata requests. Blocks
  # SSRF-based credential theft through the metadata endpoint.
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size_gb
    encrypted             = true
    delete_on_termination = true

    tags = {
      Name = "${local.name_prefix}-root"
    }
  }

  # Render and base64-encode the bootstrap script.
  user_data_base64 = base64encode(templatefile("${path.module}/templates/user_data.sh.tftpl", {
    project_name = var.project_name
    environment  = var.environment
    aws_region   = var.aws_region
    domain_name  = var.origin_domain_name
  }))

  # Never replace the instance because a newer AMI was published or the
  # bootstrap script changed. To reprovision:
  #   terraform taint aws_instance.web && terraform apply
  user_data_replace_on_change = false

  lifecycle {
    ignore_changes = [
      ami,       # don't replace when Amazon publishes a newer AL2023 AMI
      user_data, # covered by user_data_replace_on_change = false
    ]
  }

  tags = {
    Name = "${local.name_prefix}-ec2"
  }
}

# ── Elastic IP ───────────────────────────────────────────────
# Only created when associate_public_ip = true.

resource "aws_eip" "web" {
  count    = var.associate_public_ip ? 1 : 0
  instance = aws_instance.web.id
  domain   = "vpc"

  tags = {
    Name = "${local.name_prefix}-eip"
  }

  depends_on = [aws_internet_gateway.main]
}
