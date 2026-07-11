# ============================================================
# vpc.tf — VPC, subnets, internet gateway, route tables
#
# Fresh dual-stack VPC for the personal account.
# IPv4 (var.vpc_cidr) + AWS-assigned IPv6 (/56) — subnets get a /64 each.
#
# Layout (af-south-1):
#   public-1a  <vpc_cidr netnum 0>/24  af-south-1a   (EC2, EIP)
#   public-1b  <vpc_cidr netnum 1>/24  af-south-1b   (future use / AZ spare)
# ============================================================

# ── VPC ──────────────────────────────────────────────────────

resource "aws_vpc" "main" {
  cidr_block                       = var.vpc_cidr
  assign_generated_ipv6_cidr_block = true
  enable_dns_hostnames             = true
  enable_dns_support               = true

  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

# ── Internet Gateway ─────────────────────────────────────────

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-igw"
  }
}

# ── Public Subnets ───────────────────────────────────────────

resource "aws_subnet" "public_1a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, 0)
  ipv6_cidr_block   = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 0)
  availability_zone = "${var.aws_region}a"

  # TRUE is required even though the instance gets an EIP: the EIP only
  # attaches AFTER the instance is created, so with this set to false the
  # box boots with no public IPv4 at all — user_data (dnf) and the SSM
  # agent's first registration both fail, leaving a half-provisioned
  # instance that SSM reports as "Undeliverable". The auto-assigned
  # ephemeral IP covers the boot window; the EIP replaces it seconds later.
  map_public_ip_on_launch         = true
  assign_ipv6_address_on_creation = true

  tags = {
    Name = "${local.name_prefix}-public-1a"
  }
}

resource "aws_subnet" "public_1b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, 1)
  ipv6_cidr_block   = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 1)
  availability_zone = "${var.aws_region}b"

  # See public_1a — instances need boot-time IPv4 for user_data + SSM.
  map_public_ip_on_launch         = true
  assign_ipv6_address_on_creation = true

  tags = {
    Name = "${local.name_prefix}-public-1b"
  }
}

# ── Public Route Table ───────────────────────────────────────

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  route {
    ipv6_cidr_block = "::/0"
    gateway_id      = aws_internet_gateway.main