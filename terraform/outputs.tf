# ============================================================
# outputs.tf — everything needed for DNS, GitHub, and cutover.
# ============================================================

# ── EC2 / networking ─────────────────────────────────────────

output "instance_id" {
  description = "EC2 instance ID → GitHub repo variable EC2_INSTANCE_ID."
  value       = aws_instance.web.id
}

output "elastic_ip" {
  description = "Static public IPv4. Create: <origin_domain_name> A <this>."
  value       = var.associate_public_ip ? aws_eip.web[0].public_ip : null
}

output "instance_ipv6" {
  description = "Instance IPv6 address. Create: <origin_domain_name> AAAA <this>."
  value       = var.assign_ipv6_address ? one(aws_instance.web.ipv6_addresses) : null
}

# ── GitHub Actions wiring ────────────────────────────────────

output "github_deploy_role_arn" {
  description = "OIDC deploy role → GitHub repo variable AWS_DEPLOY_ROLE_ARN."
  value       = aws_iam_role.github_deploy.arn
}

output "artifacts_bucket" {
  description = "Deploy artifacts bucket → GitHub repo variable ARTIFACTS_BUCKET."
  value       = aws_s3_bucket.artifacts.bucket
}

# ── Images and content pipeline ──────────────────────────────

output "image_bucket_name" {
  description = "Private image bucket → IMAGE_BUCKET for the image upload and the config repo bot."
  value       = aws_s3_bucket.images.bucket
}

output "config_bot_role_arn" {
  description = "OIDC role for the config repo image bot → config repo variable AWS_ROLE_ARN."
  value       = aws_iam_role.config_bot.arn
}

# ── CloudFront ───────────────────────────────────────────────

output "cloudfront_distribution_id" {
  description = "→ GitHub repo secret CLOUDFRONT_DISTRIBUTION_ID (deploys invalidate the cache)."
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "CloudFront hostname. The Route 53 zone (dns.tf) points the apex and www here with ALIAS records."
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "acm_validation_records" {
  description = "ACM validation CNAMEs for the certificate. Route 53 creates them in the zone (dns.tf); listed here for reference."
  value = {
    for o in aws_acm_certificate.frontend.domain_validation_options :
    o.domain_name => {
      name  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }
  }
}

# ── DNS (Route 53) ───────────────────────────────────────────

output "name_servers" {
  description = "The four Route 53 name servers. Set these at the registrar (or the DNS host) to switch DNS to this zone."
  value       = aws_route53_zone.frontend.name_servers
}

output "route53_zone_id" {
  description = "Route 53 hosted zone ID for the site domain."
  value       = aws_route53_zone.frontend.zone_id
}

# ── Operations ───────────────────────────────────────────────

output "ssm_session_command" {
  description = "Open a shell on the instance (no SSH needed)."
  value       = "aws ssm start-session --target ${aws_instance.web.id} --region ${var.aws_region}"
}

output "ssh_private_key_secret" {
  description = "Secrets Manager secret holding the emergency SSH private key."
  value       = aws_secretsmanager_secret.ssh_private_key.name
}
