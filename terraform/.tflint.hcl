# tflint configuration. Run from terraform/:
#   tflint --init && tflint --recursive
# The tool and the AWS ruleset are pinned. Pin tflint itself in CI to the
# release recorded in the repository tooling, with its checksum.

config {
  call_module_type = "local"
}

plugin "terraform" {
  enabled = true
  preset  = "recommended"
}

plugin "aws" {
  enabled = true
  version = "0.50.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}
