# Terraform Infrastructure for AgriSense IoT

This directory contains Infrastructure as Code (IaC) for deploying the AgriSense IoT system to AWS.

## 📁 Structure

```
infrastructure/
├── main.tf                 # Main configuration
├── provider.tf            # AWS provider setup
├── variables.tf           # Input variables
├── outputs.tf             # Output values
├── terraform.tfvars.example  # Example config (copy to terraform.tfvars)
└── modules/
    ├── ec2/               # EC2 instance, security groups, user data
    ├── s3/                # S3 bucket for ML models
    └── iam/               # IAM roles and policies
```

## 🚀 Quick Start

### 1. Prerequisites
- Terraform ≥1.5.0 installed
- AWS CLI configured
- EC2 key pair created in AWS Console

### 2. Configure Variables
```bash
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # Edit with your values
```

Required variables:
- `aws_account_id` - Your AWS account ID
- `ssh_key_name` - Name of EC2 key pair
- `admin_ip` - Your public IP in CIDR format
- `esp32_subnet` - ESP32 device network (or 0.0.0.0/0 for testing)

### 3. Deploy
```bash
terraform init
terraform plan
terraform apply
```

## 📦 What Gets Created

### EC2 Instance (Free Tier)
- **Type**: t2.micro (1 vCPU, 1 GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **Storage**: 30 GB gp3 EBS volume
- **Software**: Docker, Docker Compose, AWS CLI, Git

### Security Group
- **Port 22**: SSH (restricted to admin_ip)
- **Port 80**: HTTP (public)
- **Port 443**: HTTPS (public)
- **Port 1883**: MQTT (restricted to esp32_subnet)

### S3 Bucket
- **Purpose**: ML model storage
- **Versioning**: Enabled
- **Lifecycle**: Delete old versions after 90 days
- **Access**: Private (only EC2 can read)

### IAM Role
- **Attached to**: EC2 instance
- **Permissions**: Read from S3 bucket

### Elastic IP
- **Purpose**: Static public IP
- **Cost**: Free when attached to running EC2

## 💰 Cost

**During Free Tier (12 months):** $0.00/month

**After Free Tier:**
- EC2 t2.micro: $8.50/month
- EBS 30GB: $2.40/month
- S3 storage: ~$0.50/month
- **Total**: ~$11.40/month

## 🔧 Common Commands

### Initialize
```bash
terraform init
```

### Plan Changes
```bash
terraform plan
```

### Apply Changes
```bash
terraform apply
```

### Show Current State
```bash
terraform show
```

### List Resources
```bash
terraform state list
```

### Destroy Everything
```bash
terraform destroy
```

## 📤 Outputs

After `terraform apply`, you'll see:

```
ec2_public_ip       = "54.123.45.67"
ec2_instance_id     = "i-0123456789abcdef"
s3_bucket_name      = "agrisense-iot-ml-models-123456789012"
ssh_command         = "ssh -i ~/.ssh/agrisense-key.pem ubuntu@54.123.45.67"
application_url     = "http://54.123.45.67"
```

## 🔐 Security Best Practices

### 1. Restrict SSH Access
Update `admin_ip` to your specific IP:
```hcl
admin_ip = "203.0.113.10/32"  # Your IP only
```

### 2. Restrict MQTT Access
Update `esp32_subnet` to your local network:
```hcl
esp32_subnet = "192.168.1.0/24"  # Home/office network
```

### 3. Never Commit Secrets
- `terraform.tfvars` is gitignored
- Never commit `.tfstate` files
- Never commit AWS credentials

### 4. Use IAM Roles (Not Keys)
- EC2 uses IAM role for S3 access
- No AWS keys stored on EC2
- GitHub Actions uses separate IAM user

## 🔄 Updating Infrastructure

### Change Instance Type
Edit `modules/ec2/main.tf`:
```hcl
instance_type = "t2.small"  # Changed from t2.micro
```

Then:
```bash
terraform plan  # Preview changes
terraform apply  # Apply changes
```

### Add New Security Group Rule
Edit `modules/ec2/main.tf`, add ingress rule:
```hcl
ingress {
  description = "Custom App Port"
  from_port   = 8080
  to_port     = 8080
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
}
```

### Change Region
Edit `terraform.tfvars`:
```hcl
aws_region = "us-west-2"
```

**Note:** Changing region creates new resources, doesn't migrate existing ones.

## 🧪 Testing

### Validate Configuration
```bash
terraform validate
```

### Format Code
```bash
terraform fmt -recursive
```

### Show Plan
```bash
terraform plan -out=tfplan
terraform show tfplan
```

## 📊 Monitoring

### Check EC2 Status
```bash
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=AgriSense-IoT-Server" \
  --query "Reservations[0].Instances[0].State.Name"
```

### Check S3 Bucket
```bash
aws s3 ls s3://$(terraform output -raw s3_bucket_name)/
```

### SSH into Instance
```bash
ssh -i ~/.ssh/agrisense-key.pem ubuntu@$(terraform output -raw ec2_public_ip)
```

## 🗑️ Cleanup

To remove all resources:

```bash
terraform destroy
```

Type `yes` to confirm. This will delete:
- EC2 instance
- EBS volume
- S3 bucket (must be empty first)
- Security group
- IAM role
- Elastic IP

**Warning:** This is permanent! Backup any data first.

## 🐛 Troubleshooting

### Error: Key pair not found
**Solution:** Create key pair in AWS Console first:
- EC2 → Key Pairs → Create key pair
- Update `ssh_key_name` in terraform.tfvars

### Error: Insufficient IAM permissions
**Solution:** Ensure your AWS user has these policies:
- AmazonEC2FullAccess
- AmazonS3FullAccess
- IAMFullAccess

### Error: S3 bucket already exists
**Solution:** S3 bucket names are globally unique. The bucket name includes your account ID, so this shouldn't happen unless:
- You deployed before and didn't destroy
- Someone else has the same account ID (impossible)

Fix:
```bash
terraform import aws_s3_bucket.ml_models bucket-name
```

### State Lock Error
If Terraform crashes, state might be locked:
```bash
terraform force-unlock <LOCK_ID>
```

## 📚 Additional Resources

- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Free Tier](https://aws.amazon.com/free/)
- [EC2 Instance Types](https://aws.amazon.com/ec2/instance-types/)

## 🔗 Related Documentation

- [Main Deployment Guide](../docs/DEPLOYMENT.md)
- [Deployment Checklist](../.github/DEPLOYMENT_CHECKLIST.md)
- [AWS Setup Complete](../AWS_DEPLOYMENT_COMPLETE.md)
