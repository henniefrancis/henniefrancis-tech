# ============================================================
# dns.tf - Route 53 public hosted zone for the site domain.
#
# WHY:
#   The previous DNS host has no ALIAS record type, so the bare domain
#   could not point at CloudFront. Route 53 supports ALIAS at the apex
#   (A and AAAA, no query charge for CloudFront targets).
#
# WHAT THE ZONE HOLDS:
#   - apex and www: ALIAS A and AAAA to the CloudFront distribution
#   - origin host: A and AAAA from the Elastic IP and instance IPv6
#   - ACM validation CNAMEs for the CloudFront certificate (generated),
#     plus the retained validation CNAMEs of earlier certificates
#   - other projects on subdomains (var.other_project_records, data)
#   - no email: null MX, SPF -all, DMARC reject
#   - CAA: amazon.com (ACM) and letsencrypt.org (origin certificate)
#
# CUTOVER: creating the zone changes nothing publicly. Traffic moves
# only when the registrar name servers are switched to the
# `name_servers` output. Verify the records with dig against those name
# servers first.
#
# DNSSEC is intentionally not enabled yet. It can be added later with a
# KMS key and a DS record at the registrar; do that as a separate,
# careful change because a wrong DS record takes the domain offline.
# ============================================================

locals {
  zone_name = var.frontend_primary_domain

  # Apex plus every alternate domain (www) point at CloudFront.
  alias_names = toset(concat([var.frontend_primary_domain], var.frontend_alternate_domains))

  alias_records = {
    for pair in setproduct(local.alias_names, ["A", "AAAA"]) :
    "${pair[0]}/${pair[1]}" => { name = pair[0], type = pair[1] }
  }

  # ACM DNS validation records for the CloudFront certificate. Generated
  # from the certificate so they always match what ACM asks for.
  acm_validation_records = {
    for o in aws_acm_certificate.frontend.domain_validation_options :
    o.domain_name => {
      name  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }
  }

  # TXT values must be double-quoted for Route 53.
  other_project_records = {
    for key, r in var.other_project_records :
    key => {
      name    = "${r.name}.${local.zone_name}"
      type    = r.type
      ttl     = r.ttl
      records = r.type == "TXT" ? [for v in r.records : "\"${v}\""] : r.records
    }
  }
}

resource "aws_route53_zone" "frontend" {
  name    = local.zone_name
  comment = "Public zone for ${local.zone_name} (${var.project_name})"

  tags = { Name = "${local.name_prefix}-zone" }

  # RETAINED: the registrar points at this zone's name servers. Deleting
  # it and creating another issues new name servers and takes the domain
  # offline until the registrar is updated.
  lifecycle {
    prevent_destroy = true
  }
}

# ── Public site: ALIAS to CloudFront ─────────────────────────

resource "aws_route53_record" "alias" {
  for_each = local.alias_records

  zone_id = aws_route53_zone.frontend.zone_id
  name    = each.value.name
  type    = each.value.type

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

# ── Origin host (CloudFront origin, EC2 + nginx) ─────────────

resource "aws_route53_record" "origin_a" {
  count = var.associate_public_ip ? 1 : 0

  zone_id = aws_route53_zone.frontend.zone_id
  name    = var.origin_domain_name
  type    = "A"
  ttl     = var.dns_default_ttl
  records = [aws_eip.web[0].public_ip]
}

resource "aws_route53_record" "origin_aaaa" {
  count = var.assign_ipv6_address ? 1 : 0

  zone_id = aws_route53_zone.frontend.zone_id
  name    = var.origin_domain_name
  type    = "AAAA"
  ttl     = var.dns_default_ttl
  records = [one(aws_instance.web.ipv6_addresses)]
}

# ── ACM validation ───────────────────────────────────────────

# For the CloudFront certificate (generated from its validation options).
resource "aws_route53_record" "acm_validation" {
  for_each = local.acm_validation_records

  zone_id = aws_route53_zone.frontend.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.value]
}

# Validation records of earlier certificates, kept as they were.
resource "aws_route53_record" "retained_acm_validation" {
  for_each = var.retained_acm_validation_cnames

  zone_id = aws_route53_zone.frontend.zone_id
  name    = "${each.key}.${local.zone_name}"
  type    = "CNAME"
  ttl     = var.dns_default_ttl
  records = [each.value]
}

# ── Other projects on subdomains ─────────────────────────────

resource "aws_route53_record" "other_project" {
  for_each = local.other_project_records

  zone_id = aws_route53_zone.frontend.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = each.value.ttl
  records = each.value.records
}

# ── No email on this domain ──────────────────────────────────

resource "aws_route53_record" "null_mx" {
  zone_id = aws_route53_zone.frontend.zone_id
  name    = local.zone_name
  type    = "MX"
  ttl     = var.dns_default_ttl
  records = ["0 ."]
}

resource "aws_route53_record" "spf" {
  zone_id = aws_route53_zone.frontend.zone_id
  name    = local.zone_name
  type    = "TXT"
  ttl     = var.dns_default_ttl
  records = ["\"v=spf1 -all\""]
}

resource "aws_route53_record" "dmarc" {
  zone_id = aws_route53_zone.frontend.zone_id
  name    = "_dmarc.${local.zone_name}"
  type    = "TXT"
  ttl     = var.dns_default_ttl
  records = ["\"v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s\""]
}

# ── Certificate authority authorization ──────────────────────

# amazon.com: ACM (CloudFront certificate). letsencrypt.org: the
# certificate on the origin host.
resource "aws_route53_record" "caa" {
  zone_id = aws_route53_zone.frontend.zone_id
  name    = local.zone_name
  type    = "CAA"
  ttl     = var.dns_default_ttl
  records = [
    "0 issue \"amazon.com\"",
    "0 issue \"letsencrypt.org\"",
  ]
}
