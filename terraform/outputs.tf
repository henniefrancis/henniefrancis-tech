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

# ── CloudFront ───────────────────────────────────────────────

output "cloudfront_distribution_id" {
  description = "→ GitHub repo secret CLOUDFRONT_DISTRIBUTION_ID (deploys invalidate the cache)."
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "CloudFront hostname. Point the public domains here (CNAME for www; apex needs ALIAS/ANAME or a flattening-capable DNS provider)."
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "acm_validation_records" {
  description = "Create these CNAME records at the external DNS provider to validate the certificate."
  value = {
    for o in aws_acm_certificate.frontend.domain_validation_options :
    o.domain_name => {
      name  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }
  }
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
