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
  vpc_id                          = aws_vpc.main.id
  cidr_block                      = cidrsubnet(var.vpc_cidr, 8, 0)
  ipv6_cidr_block                 = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 0)
  availability_zone               = "${var.aws_region}a"
  map_public_ip_on_launch         = false # EIP managed explicitly in ec2.tf
  assign_ipv6_address_on_creation = true

  tags = {
    Name = "${local.name_prefix}-public-1a"
  }
}

resource "aws_subnet" "public_1b" {
  vpc_id                          = aws_vpc.main.id
  cidr_block                      = cidrsubnet(var.vpc_cidr, 8, 1)
  ipv6_cidr_block                 = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 1)
  availability_zone               = "${var.aws_region}b"
  map_public_ip_on_launch         = false
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
    gateway_id      = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${local.name_prefix}-rt-public"
  }
}

resource "aws_route_table_association" "public_1a" {
  subnet_id      = aws_subnet.public_1a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_1b" {
  subnet_id      = aws_subnet.public_1b.id
  route_table_id = aws_route_table.public.id
}
