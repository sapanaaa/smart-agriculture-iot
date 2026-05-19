# 🎉 AWS Deployment Setup Complete!

Your Smart Agriculture IoT system is now ready for AWS deployment with automated CI/CD.

## ✅ What Has Been Created

### 1. Testing Infrastructure
- ✅ **Backend (Python)**: pytest with fixtures, mock support, coverage
  - `backend/tests/` - Test files
  - `backend/requirements-dev.txt` - Test dependencies
  - `backend/pytest.ini` - Configuration

- ✅ **Backend (Node.js)**: Jest with supertest
  - `NodeJSbackend/tests/` - Test files
  - `NodeJSbackend/jest.config.js` - Configuration
  - Updated `package.json` with test scripts

- ✅ **Frontend**: Jest with React Testing Library
  - `frontend/tests/` - Test files
  - `frontend/jest.config.js` - Configuration
  - Updated `package.json` with test scripts

### 2. AWS Infrastructure (Terraform)
- ✅ **EC2 Module**: t2.micro instance, security groups, user data script
- ✅ **S3 Module**: Bucket for ML models with versioning
- ✅ **IAM Module**: EC2 role with S3 read access
- ✅ **Main Config**: Modular infrastructure setup
- ✅ **Variables**: Customizable via `terraform.tfvars`

📁 Location: [`infrastructure/`](/infrastructure/)

### 3. GitHub Actions CI/CD
- ✅ **test.yml**: Runs pytest and Jest on every push
- ✅ **deploy.yml**: Deploys to EC2 on push to main
- ✅ **ml-models.yml**: Manual workflow to upload ML models to S3

📁 Location: [`.github/workflows/`](/.github/workflows/)

### 4. Docker Configuration
- ✅ **Entrypoint Script**: Checks ML models on container startup
- ✅ **Updated Dockerfile**: Multi-stage build with entrypoint
- ✅ **Updated docker-compose.prod.yml**: ML models volume mount

### 5. Documentation
- ✅ **Deployment Guide**: Complete step-by-step instructions
  - 📖 [docs/DEPLOYMENT.md](/docs/DEPLOYMENT.md)

- ✅ **Deployment Checklist**: Verify every step
  - 📋 [.github/DEPLOYMENT_CHECKLIST.md](/.github/DEPLOYMENT_CHECKLIST.md)

- ✅ **E2E Test Script**: Automated deployment verification
  - 🧪 [`tests/e2e/test_deployment.sh`](/tests/e2e/test_deployment.sh)

### 6. Updated .gitignore
- ✅ Terraform state files
- ✅ Test coverage reports
- ✅ SSH keys and credentials
- ✅ Infrastructure secrets

---

## 🚀 Quick Start Guide

### Step 1: Install Prerequisites
```bash
# Terraform
brew install terraform  # macOS
# or download from: https://www.terraform.io/downloads

# AWS CLI
brew install awscli  # macOS
# or download from: https://aws.amazon.com/cli/

# Verify installations
terraform --version  # Should be ≥1.5.0
aws --version
```

### Step 2: Configure AWS
```bash
# Configure AWS credentials
aws configure

# Get your AWS account ID
aws sts get-caller-identity --query Account --output text
```

### Step 3: Create EC2 Key Pair
1. Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2/)
2. Navigate to **Key Pairs** → **Create key pair**
3. Name: `agrisense-key`
4. Download and save:
```bash
mv ~/Downloads/agrisense-key.pem ~/.ssh/
chmod 400 ~/.ssh/agrisense-key.pem
```

### Step 4: Deploy Infrastructure
```bash
cd infrastructure

# Copy example config
cp terraform.tfvars.example terraform.tfvars

# Edit with your values (see DEPLOYMENT.md for details)
nano terraform.tfvars

# Deploy (takes ~5 minutes)
terraform init
terraform plan
terraform apply
```

**Save the outputs!** You'll need:
- EC2 Public IP
- S3 Bucket Name
- SSH Command

### Step 5: Configure GitHub Secrets
1. Go to your GitHub repo
2. **Settings** → **Secrets and variables** → **Actions**
3. Add these secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `EC2_SSH_KEY` (content of `.pem` file)

### Step 6: Upload ML Models
**Option A:** GitHub Actions (Recommended)
- Go to **Actions** → **Upload ML Models to S3** → **Run workflow**

**Option B:** Upload Locally
```bash
cd backend
python ml/train_models.py
aws s3 sync ml/saved_models/ s3://your-bucket-name/latest/
```

### Step 7: Deploy Application
```bash
git add .
git commit -m "feat: AWS deployment setup"
git push origin main
```

Watch the deployment in **Actions** tab (~5-10 minutes).

### Step 8: Verify
```bash
# Test deployment
./tests/e2e/test_deployment.sh YOUR_EC2_IP

# Visit in browser
open http://YOUR_EC2_IP
```

---

## 💰 Cost Breakdown

### During Free Tier (12 months): **$0.00/month**
All services within AWS Free Tier limits.

### After Free Tier: **~$11-13/month**
- EC2 t2.micro: $8.50/month
- EBS 30GB: $2.40/month
- S3 storage: ~$0.50/month
- Data transfer: Usually free (within 100GB/month)

**No charges for:**
- Security Groups
- IAM Roles
- Elastic IP (when attached)
- Basic CloudWatch monitoring

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| [`docs/DEPLOYMENT.md`](/docs/DEPLOYMENT.md) | Complete deployment guide |
| [`.github/DEPLOYMENT_CHECKLIST.md`](/.github/DEPLOYMENT_CHECKLIST.md) | Step-by-step checklist |
| [`tests/e2e/test_deployment.sh`](/tests/e2e/test_deployment.sh) | Automated test script |
| [`infrastructure/terraform.tfvars.example`](/infrastructure/terraform.tfvars.example) | Terraform config template |
| [`.github/workflows/deploy.yml`](/.github/workflows/deploy.yml) | Main deployment workflow |

---

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────┐
│        AWS EC2 (t2.micro - FREE)        │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │    Docker Compose Stack           │ │
│  │  ┌──────────────────────────────┐ │ │
│  │  │ FastAPI (ML Backend) :8000   │ │ │
│  │  │ NodeJS (Auth) :5000          │ │ │
│  │  │ Next.js (Frontend) :3000     │ │ │
│  │  │ Mosquitto MQTT :1883         │ │ │
│  │  │ Nginx (Reverse Proxy) :80    │ │ │
│  │  └──────────────────────────────┘ │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ML Models: /home/ubuntu/ml_models/     │
│  (Synced from S3)                       │
└─────────────────────────────────────────┘
         ↓                     ↑
         ↓                     ↑
    ┌─────────┐         ┌──────────┐
    │   S3    │         │ MongoDB  │
    │ Bucket  │         │  Atlas   │
    │ (FREE)  │         │ (External)│
    └─────────┘         └──────────┘

GitHub Actions → Tests → Deploy → EC2
```

---

## 🔧 Common Commands

### SSH into EC2
```bash
ssh -i ~/.ssh/agrisense-key.pem ubuntu@YOUR_EC2_IP
```

### Check Container Status
```bash
cd /home/ubuntu/app
docker-compose ps
docker-compose logs -f
```

### Restart Services
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

### Update Application
```bash
# Just push to main - GitHub Actions handles the rest!
git push origin main
```

### Run Tests Locally
```bash
# Python tests
cd backend
pytest tests/ -v

# Node.js tests
cd NodeJSbackend
npm test

# Frontend tests
cd frontend
npm test
```

### Destroy Infrastructure (When Done Testing)
```bash
cd infrastructure
terraform destroy
```

---

## ✨ What Happens on Git Push

1. **GitHub Actions Triggered**
2. **Run Tests** (pytest + Jest)
3. **Tests Pass** → Deploy | **Tests Fail** → Stop
4. **Copy Code to EC2** (rsync)
5. **Download ML Models** from S3
6. **Rebuild Docker Containers**
7. **Start Services**
8. **Health Check Verification**
9. **Deployment Complete** ✅

---

## 🆘 Troubleshooting

### Tests Failing Locally
```bash
# Install test dependencies
cd backend && pip install -r requirements-dev.txt
cd NodeJSbackend && npm ci
cd frontend && npm ci
```

### Terraform Apply Fails
- Check AWS credentials: `aws sts get-caller-identity`
- Verify key pair exists in AWS Console
- Ensure terraform.tfvars has correct values

### GitHub Actions Fails
- Verify GitHub Secrets are set correctly
- Check EC2 instance is running
- Review logs in Actions tab

### Deployment Works but Site Not Loading
- Wait 60 seconds for services to start
- Check health: `curl http://YOUR_EC2_IP/health`
- SSH and check logs: `docker-compose logs -f`

### ML Endpoints Failing
- Upload models to S3 via GitHub Actions
- Verify models exist: `aws s3 ls s3://your-bucket/latest/`
- Restart containers to sync from S3

---

## 📞 Need Help?

1. 📖 Read the [Deployment Guide](/docs/DEPLOYMENT.md)
2. ✅ Follow the [Deployment Checklist](/.github/DEPLOYMENT_CHECKLIST.md)
3. 🧪 Run the [E2E Test Script](/tests/e2e/test_deployment.sh)
4. 📋 Check GitHub Actions logs
5. 🔍 SSH into EC2 and check Docker logs

---

## 🎓 Next Steps

### After Successful Deployment:
1. ✅ Test all features (auth, dashboard, ML recommendations)
2. ✅ Configure custom domain (optional)
3. ✅ Set up SSL with Let's Encrypt (optional)
4. ✅ Restrict security groups to your IP
5. ✅ Monitor AWS billing dashboard
6. ✅ Set up CloudWatch alarms (optional)

### Ongoing Maintenance:
- **Weekly**: Check system resources (disk, memory)
- **Monthly**: Update system packages
- **Quarterly**: Review AWS billing
- **As needed**: Update ML models via GitHub Actions

---

**🚀 Your application is now production-ready with:**
- ✅ Automated CI/CD
- ✅ Zero-cost deployment (12 months)
- ✅ Comprehensive testing
- ✅ Infrastructure as Code
- ✅ Complete documentation

**Congratulations! 🎉**
