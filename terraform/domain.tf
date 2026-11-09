# ============================================================
# domain.tf - Domain registration, once the domain is registered
# through Route 53 in this account.
#
# WHY:
#   The registration is moving to Route 53 Domains. After the
#   transfer completes, Terraform should own the settings that keep
#   the site reachable: the name servers, the transfer lock and
#   automatic renewal.
#
# HOW IT BEHAVES (AWS provider docs for this resource):
#   This resource does not register or transfer a domain. When it is
#   created, Terraform adopts a domain that is already registered in
#   the account. Destroying it only removes it from state; the domain
#   stays registered. The transfer itself is started by the owner.
#
# GATE:
#   var.manage_domain_registration is false until the transfer has
#   completed. Before that the domain is not in this account and the
#   resource would fail to adopt it.
#
# CONTACTS:
#   Contact details are personal data and this repo is public, so no
#   contact blocks are set here. Terraform leaves the contacts as they
#   are after the transfer. Privacy protection hides them in WHOIS.
#
# Route 53 Domains is a global service served from us-east-1.
# ============================================================

resource "aws_route53domains_registered_domain" "site" {
  count    = var.manage_domain_registration ? 1 : 0
  provider = aws.us_east_1

  domain_name = local.zone_name

  auto_renew    = true
  transfer_lock = true

  admin_privacy      = true
  registrant_privacy = true
  tech_privacy       = true
  billing_privacy    = true

  # Point the registration at this account's hosted zone. Sorted so the
  # order matches between runs.
  dynamic "name_server" {
    for_each = sort(aws_route53_zone.frontend.name_servers)
    content {
      name = name_server.value
    }
  }

  tags = { Name = "${local.name_prefix_us_east_1}-domain" }
}
