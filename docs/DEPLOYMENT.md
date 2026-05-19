# AWS Deployment Guide - AgriSense IoT

Complete guide for deploying the Smart Agriculture IoT system to AWS with CI/CD automation.

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ AWS Account (Free Tier eligible - 12 months)
- ✅ GitHub repository with your code
- ✅ Terraform installed locally (v1.5+): `terraform --version`
- ✅ AWS CLI installed: `aws --version`
- ✅ Git configured locally
- ✅ SSH key pair for EC2 (we'll create this)

## 💰 Cost: $0.00 During Free Tier

This deployment stays within AWS Free Tier limits:
- EC2 t2.micro (750 hours/month free)
- EBS 30GB (30GB free)
- S3 storage (~0.5GB of 5GB free)
- Data transfer (within 100GB/month free)

**Estimated cost after free tier expires: ~$11-13/month**

---

## 🚀 Deployment Steps

### Step 1: Create EC2 Key Pair

1. Log into [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **EC2 → Key Pairs** (left sidebar)
3. Click **Create key pair**
4. Name: `agrisense-key`
5. Type: RSA
6. Format: `.pem`
7. Click **Create** and save the `.pem` file securely
8. Move to SSH directory:
   ```bash
   mv ~/Downloads/agrisense-key.pem ~/.ssh/
   chmod 400 ~/.ssh/agrisense-key.pem
   ```

### Step 2: Get Your AWS Account ID

```bash
aws sts get-caller-identity --query Account --output text
```

Save this number - you'll need it for Terraform.

### Step 3: Get Your Public IP Address

Visit: https://whatismyipaddress.com

Note your IPv4 address (e.g., `203.0.113.10`)

### Step 4: Configure Terraform

1. Copy the example file:
   ```bash
   cd infrastructure
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` with your values:
   ```hcl
   aws_region      = "us-east-1"
   aws_account_id  = "123456789012"  # From Step 2
   ssh_key_name    = "agrisense-key"  # From Step 1
   admin_ip        = "203.0.113.10/32"  # Your IP from Step 3
   esp32_subnet    = "0.0.0.0/0"  # Change to your local network later
   ```

### Step 5: Deploy AWS Infrastructure with Terraform

```bash
cd infrastructure

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Create resources (takes ~3-5 minutes)
terraform apply
```

Type `yes` when prompted.

**Save the outputs!** You'll see:
- EC2 Public IP
- S3 Bucket Name
- SSH Command

### Step 6: Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings → Secrets and variables → Actions**
3. Click **New repository secret** for each:

| Secret Name | Value | Where to Find |
|-------------|-------|---------------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key | AWS IAM Console → Users → Security credentials |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key | Same as above |
| `EC2_SSH_KEY` | Content of agrisense-key.pem | `cat ~/.ssh/agrisense-key.pem` |

**To create IAM access keys:**
```bash
# Create IAM user (one-time)
aws iam create-user --user-name github-actions-agrisense

# Attach policies
aws iam attach-user-policy --user-name github-actions-agrisense \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess

aws iam attach-user-policy --user-name github-actions-agrisense \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Create access key
aws iam create-access-key --user-name github-actions-agrisense
```

### Step 7: Train and Upload ML Models

**Option A: Train Locally**
```bash
cd backend
source venv/Scripts/activate  # Windows: venv\Scripts\activate
python ml/train_models.py

# Upload to S3
aws s3 sync ml/saved_models/ s3://agrisense-iot-ml-models-YOUR_ACCOUNT_ID/latest/
```

**Option B: Use GitHub Actions (Recommended)**
1. Go to **Actions** tab in GitHub
2. Select **Upload ML Models to S3**
3. Click **Run workflow**
4. Enter version: `v1.0.0`
5. Click **Run workflow**

Wait ~5-10 minutes for models to train and upload.

### Step 8: Deploy Application

```bash
# Make sure .env files are in place
ls backend/.env
ls NodeJSbackend/.env
ls frontend/.env.local

# Commit and push to main
git add .
git commit -m "feat: initial AWS deployment setup"
git push origin main
```

GitHub Actions will automatically:
1. ✅ Run all tests (pytest, Jest)
2. ✅ Deploy code to EC2
3. ✅ Download ML models from S3
4. ✅ Build Docker containers
5. ✅ Start all services
6. ✅ Verify health checks

Monitor progress in **Actions** tab (~5-10 minutes).

### Step 9: Verify Deployment

Once GitHub Actions completes, visit:

```
http://YOUR_EC2_PUBLIC_IP
```

You should see the AgriSense login page!

**Other endpoints:**
- Health Check: `http://YOUR_EC2_IP/health`
- API Docs: `http://YOUR_EC2_IP/docs`
- Weather API: `http://YOUR_EC2_IP/api/weather/current`

---

## 🔧 Manual Deployment (If Needed)

SSH into your server:

```bash
ssh -i ~/.ssh/agrisense-key.pem ubuntu@YOUR_EC2_IP
```

Check container status:
```bash
cd /home/ubuntu/app
docker-compose ps
```

View logs:
```bash
docker-compose logs -f
docker-compose logs fastapi  # Specific service
```

Restart services:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

---

## 📊 Monitoring

### Check Service Health

```bash
# SSH into EC2
ssh -i ~/.ssh/agrisense-key.pem ubuntu@YOUR_EC2_IP

# Run status script
/home/ubuntu/check_status.sh
```

### View Logs

```bash
cd /home/ubuntu/app
docker-compose logs -f  # All services
docker-compose logs -f fastapi  # Python backend
docker-compose logs -f nodejs  # Node.js backend
docker-compose logs -f frontend  # Next.js frontend
docker-compose logs -f mosquitto  # MQTT broker
```

### Check Disk Usage

```bash
df -h /
docker system df
```

### Check Memory

```bash
free -h
docker stats
```

---

## 🐛 Troubleshooting

### Problem: Containers won't start

```bash
docker-compose logs <service_name>
docker inspect <container_id>
```

### Problem: ML models not loading

```bash
# Check if models exist
ls -lh /home/ubuntu/ml_models/
ls -lh /home/ubuntu/app/backend/ml/saved_models/

# Re-sync from S3
aws s3 sync s3://agrisense-iot-ml-models-YOUR_ACCOUNT_ID/latest/ /home/ubuntu/ml_models/
```

### Problem: MongoDB connection fails

```bash
# Test connection
mongo "mongodb+srv://..." --eval "db.adminCommand('ping')"
```

**Fix:** Add EC2 Elastic IP to MongoDB Atlas IP Whitelist:
1. Go to MongoDB Atlas
2. Network Access → Add IP Address
3. Add your EC2 Elastic IP

### Problem: Out of disk space

```bash
# Clean up Docker
docker system prune -a --volumes

# Remove old images
docker image prune -a
```

### Problem: GitHub Actions deployment fails

**Check:**
1. Are GitHub Secrets configured correctly?
2. Is EC2 instance running? (`aws ec2 describe-instances`)
3. Can GitHub Actions reach EC2? (Security group allows SSH from GitHub IPs)

---

## 🔄 Updating Your Application

### Automatic (Recommended)

Just push to main branch:

```bash
git add .
git commit -m "feat: your changes"
git push origin main
```

GitHub Actions handles the rest!

### Manual Update

```bash
ssh -i ~/.ssh/agrisense-key.pem ubuntu@YOUR_EC2_IP

cd /home/ubuntu/app
git pull origin main

# Restart containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

---

## 🔐 Security Best Practices

### 1. Restrict SSH Access

Update Terraform variable in `terraform.tfvars`:
```hcl
admin_ip = "YOUR_IP/32"  # Only your IP can SSH
```

Then re-apply:
```bash
cd infrastructure
terraform apply
```

### 2. Restrict MQTT Access

Update `esp32_subnet` to your local network:
```hcl
esp32_subnet = "192.168.1.0/24"  # Your home/office network
```

### 3. Enable HTTPS (Optional)

Install Let's Encrypt SSL:

```bash
ssh -i ~/.ssh/agrisense-key.pem ubuntu@YOUR_EC2_IP

# Install certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com
```

### 4. Regular Updates

```bash
# Update system packages monthly
ssh -i ~/.ssh/agrisense-key.pem ubuntu@YOUR_EC2_IP
sudo apt-get update && sudo apt-get upgrade -y
```

---

## 🔙 Rollback

If deployment fails:

```bash
ssh -i ~/.ssh/agrisense-key.pem ubuntu@YOUR_EC2_IP
cd /home/ubuntu/app

# Find previous working commit
git log --oneline -10

# Rollback
git checkout <commit_hash>

# Restart
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

---

## 🗑️ Destroying Infrastructure

To remove all AWS resources:

```bash
cd infrastructure
terraform destroy
```

Type `yes` to confirm.

**WARNING:** This deletes:
- EC2 instance
- S3 bucket (and all ML models)
- Security groups
- Elastic IP
- IAM roles

---

## 📞 Support

- 📖 Full plan: [/home/kalobiralo/.claude/plans/cozy-wiggling-koala.md](/home/kalobiralo/.claude/plans/cozy-wiggling-koala.md)
- 📋 Deployment checklist: [/.github/DEPLOYMENT_CHECKLIST.md](/.github/DEPLOYMENT_CHECKLIST.md)
- 🧪 E2E test script: [/tests/e2e/test_deployment.sh](/tests/e2e/test_deployment.sh)

**Common Issues:**
- Test failures → Check logs in GitHub Actions
- Connection timeout → Check security groups
- 502 Bad Gateway → Services still starting (wait 60s)
- ML endpoints fail → Models not uploaded to S3

---

**🎉 Congratulations! Your AgriSense IoT system is now running on AWS!**
