# ============================================================
# variables.tf — henniefrancis-tech stack inputs.
#
# Everything has a safe default so `terraform plan` works out of the
# box; override per-workspace in HCP Terraform variables, not here.
# No account IDs are hardcoded anywhere — the account is whatever the
# workspace credentials resolve to (data.aws_caller_identity).
# ============================================================

# ── AWS ──────────────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region to deploy resources into."
  type        = string
  default     = "af-south-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.aws_region))
    error_message = "aws_region must be a valid AWS region identifier, e.g. af-south-1."
  }
}

# ── Project / naming ─────────────────────────────────────────

variable "project_name" {
  description = "Short project identifier used in resource names, tags, the web root (/var/www/<project>/html) and the S3 artifact prefix."
  type        = string
  default     = "henniefrancis-tech"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,28}[a-z0-9]$", var.project_name))
    error_message = "project_name must be lowercase alphanumeric with hyphens, 3–30 chars."
  }
}

variable "environment" {
  description = "Deployment environment (prod, staging, dev)."
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["prod", "staging", "dev"], var.environment)
    error_message = "environment must be one of: prod, staging, dev."
  }
}

variable "team_name" {
  description = "Team/owner tag — first segment of the <team>-<account>-<region>-<project>-<resource> naming convention."
  type        = string
  default     = "henniefrancis"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.team_name))
    error_message = "team_name must be lowercase alphanumeric with hyphens, 3–22 chars."
  }
}

# ── Domains ──────────────────────────────────────────────────

variable "frontend_primary_domain" {
  description = "Primary public domain served by CloudFront."
  type        = string
  default     = "henniefrancis.tech"
}

variable "frontend_alternate_domains" {
  description = "Additional public domains (SANs / CloudFront aliases)."
  type        = list(string)
  default     = ["www.henniefrancis.tech"]
}

variable "origin_domain_name" {
  description = <<-EOT
    Hostname that resolves to the EC2 Elastic IP (A) and IPv6 address (AAAA)
    and is used as the CloudFront origin. MUST differ from the public domains
    (those resolve to CloudFront). Create the records at your DNS provider:
      origin.henniefrancis.tech  A     <Elastic IP>
      origin.henniefrancis.tech  AAAA  <IPv6 address>
  EOT
  type        = string
  default     = "origin.henniefrancis.tech"
}

# ── Networking ───────────────────────────────────────────────

variable "vpc_cidr" {
  description = "IPv4 CIDR for the VPC. IPv6 is an AWS-assigned /56 (subnets carve /64s)."
  type        = string
  default     = "10.20.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0)) && tonumber(split("/", var.vpc_cidr)[1]) <= 24
    error_message = "vpc_cidr must be a valid IPv4 CIDR block of /24 or larger."
  }
}

variable "ssh_allowed_cidrs" {
  description = "IPv4 CIDRs allowed to reach port 22. Empty (default) keeps SSH closed — primary access is SSM Session Manager. NEVER 0.0.0.0/0."
  type        = list(string)
  default     = []

  validation {
    condition     = !contains(var.ssh_allowed_cidrs, "0.0.0.0/0")
    error_message = "ssh_allowed_cidrs must never contain 0.0.0.0/0 — use SSM Session Manager instead."
  }
}

# ── EC2 ──────────────────────────────────────────────────────

variable "instance_type" {
  description = "EC2 instance type. Must be arm64-compatible (t4g, m7g, c7g, …) to match the AL2023 ARM64 AMI."
  type        = string
  default     = "t4g.nano"

  validation {
    condition     = can(regex("^[a-z][0-9][a-z]?[a-z]?\\.[a-z0-9]+$", var.instance_type))
    error_message = "instance_type must be a valid EC2 instance type, e.g. t4g.nano."
  }
}

variable "root_volume_size_gb" {
  description = "Size of the root EBS volume in GiB."
  type        = number
  default     = 8

  validation {
    condition     = var.root_volume_size_gb >= 8 && var.root_volume_size_gb <= 500
    error_message = "root_volume_size_gb must be between 8 and 500 GiB."
  }
}

variable "associate_public_ip" {
  description = "Whether to allocate and associate an Elastic IP."
  type        = bool
  default     = true
}

variable "assign_ipv6_address" {
  description = "Whether to assign an IPv6 address to the instance (subnet has an IPv6 /64, so default true)."
  type        = bool
  default     = true
}

# ── CloudFront ───────────────────────────────────────────────

variable "cloudfront_origin_protocol_policy" {
  description = <<-EOT
    How CloudFront connects to the origin. Only "https-only" is allowed: the
    origin must present a valid certificate for origin_domain_name (run
    certbot for that hostname, see the Origin certificate runbook), and the
    X-Origin-Verify secret must never cross the internet in clear text.
  EOT
  type        = string
  default     = "https-only"

  validation {
    condition     = var.cloudfront_origin_protocol_policy == "https-only"
    error_message = "Must be https-only: the origin verify secret must not travel over plain HTTP."
  }
}

variable "cloudfront_price_class" {
  description = "PriceClass_All includes the Cape Town edge (best for ZA users)."
  type        = string
  default     = "PriceClass_All"

  validation {
    condition     = contains(["PriceClass_All", "PriceClass_200", "PriceClass_100"], var.cloudfront_price_class)
    error_message = "Must be one of PriceClass_All, PriceClass_200, PriceClass_100."
  }
}

# ── GitHub Actions (OIDC deploy) ─────────────────────────────

variable "github_repository" {
  description = "GitHub <owner>/<repo> allowed to assume the deploy role via OIDC."
  type        = string
  default     = "henniefrancis/henniefrancis-tech"

  validation {
    condition     = can(regex("^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$", var.github_repository))
    error_message = "github_repository must be in the form owner/repo."
  }
}

variable "create_github_oidc_provider" {
  description = "Create the GitHub OIDC identity provider. Set false if the account already has token.actions.githubusercontent.com (this account does — created manually per infra/AWS.md) so Terraform looks it up instead."
  type        = bool
  default     = false
}

variable "artifact_retention_days" {
  description = "Days to keep versioned deploy artifacts in S3 before expiry. latest/ is re-written on every deploy and only needed during a deploy, so expiry is safe."
  type        = number
  default     = 30

  validation {
    condition     = var.artifact_retention_days >= 7 && var.artifact_retention_days <= 365
    error_message = "artifact_retention_days must be between 7 and 365."
  }
}

# ── Origin protection ──────────────────────────────

variable "origin_verify_secret" {
  description = "Shared secret CloudFront sends in the X-Origin-Verify header. Set as a sensitive HCP Terraform variable (generate with: openssl rand -hex 32). Never put a value in code."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.origin_verify_secret) >= 32 && length(var.origin_verify_secret) <= 64 && can(regex("^[A-Za-z0-9]+$", var.origin_verify_secret))
    error_message = "origin_verify_secret must be 32 to 64 alphanumeric characters (for example the output of openssl rand -hex 32, which is 64)."
  }
}

variable "origin_verify_secret_previous" {
  description = "Previous X-Origin-Verify value, still accepted by nginx during a rotation. Leave empty when not rotating. Sensitive HCP Terraform variable."
  type        = string
  sensitive   = true
  default     = ""

  validation {
    condition     = var.origin_verify_secret_previous == "" || (length(var.origin_verify_secret_previous) >= 32 && length(var.origin_verify_secret_previous) <= 64 && can(regex("^[A-Za-z0-9]+$", var.origin_verify_secret_previous)))
    error_message = "origin_verify_secret_previous must be empty, or 32 to 64 alphanumeric characters."
  }
}

variable "hsts_include_subdomains" {
  description = "Add includeSubDomains to the HSTS header. Keep false until the owner confirms no subdomain serves plain HTTP (a documented design decision)."
  type        = bool
  default     = false
}

# ── Content pipeline and alarms ──────────────────────────────

variable "config_repository" {
  description = "GitHub <owner>/<repo> of the private content repo whose main branch may assume the image bot role via OIDC."
  type        = string
  default     = "henniefrancis/config"

  validation {
    condition     = can(regex("^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$", var.config_repository))
    error_message = "config_repository must be in the form owner/repo."
  }
}

# Consumed by the CloudFront 5xx alarm in a later change.
# tflint-ignore: terraform_unused_declarations
variable "alarm_email" {
  description = "Email address for CloudFront 5xx alarms. Sensitive HCP Terraform variable; empty means an alarm without a subscriber."
  type        = string
  sensitive   = true
  default     = ""
}
