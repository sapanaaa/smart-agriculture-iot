# Main Terraform configuration for AgriSense IoT deployment

# Get latest Ubuntu 22.04 LTS AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# IAM Module - EC2 role with S3 access
module "iam" {
  source = "./modules/iam"

  project_name    = var.project_name
  s3_bucket_arn   = module.s3.bucket_arn
}

# S3 Module - ML models storage
module "s3" {
  source = "./modules/s3"

  project_name   = var.project_name
  aws_account_id = var.aws_account_id
}

# EC2 Module - Application server
module "ec2" {
  source = "./modules/ec2"

  project_name         = var.project_name
  ami_id               = data.aws_ami.ubuntu.id
  admin_ip             = var.admin_ip
  esp32_subnet         = var.esp32_subnet
  iam_instance_profile = module.iam.instance_profile_name
  aws_region           = var.aws_region
  aws_account_id       = var.aws_account_id
  s3_bucket_name       = module.s3.bucket_name
}
