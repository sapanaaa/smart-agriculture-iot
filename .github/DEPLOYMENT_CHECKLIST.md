# 📋 Deployment Checklist

Use this checklist to ensure all steps are completed for successful AWS deployment.

## ☐ Pre-Deployment Setup

### AWS Account Setup
- [ ] AWS account created and verified
- [ ] Free Tier eligible (check: https://console.aws.amazon.com/billing)
- [ ] AWS CLI installed (`aws --version`)
- [ ] AWS CLI configured (`aws configure`)
- [ ] AWS account ID obtained (`aws sts get-caller-identity`)

### Local Tools
- [ ] Terraform installed (`terraform --version` → should be ≥1.5.0)
- [ ] Git installed and configured
- [ ] SSH directory exists (`~/.ssh/`)
- [ ] Public IP address noted (https://whatismyipaddress.com)

### EC2 Key Pair
- [ ] EC2 key pair created in AWS Console (name: `agrisense-key`)
- [ ] `.pem` file downloaded
- [ ] `.pem` file moved to `~/.ssh/agrisense-key.pem`
- [ ] Permissions set correctly (`chmod 400 ~/.ssh/agrisense-key.pem`)

### Environment Files
- [ ] `backend/.env` exists with correct values
- [ ] `NodeJSbackend/.env` exists with correct values
- [ ] `frontend/.env.local` exists with correct values
- [ ] MongoDB Atlas connection string is correct
- [ ] OpenWeatherMap API key is valid
- [ ] Gmail/Gemini API keys configured (optional)

---

## ☐ Terraform Deployment

### Configuration
- [ ] `cd infrastructure`
- [ ] Copied `terraform.tfvars.example` to `terraform.tfvars`
- [ ] Updated `aws_region` (default: `us-east-1`)
- [ ] Updated `aws_account_id` with your AWS account ID
- [ ] Updated `ssh_key_name` (should match EC2 key pair name)
- [ ] Updated `admin_ip` with your public IP in CIDR format (e.g., `203.0.113.10/32`)
- [ ] Updated `esp32_subnet` (or left as `0.0.0.0/0` for testing)

### Terraform Execution
- [ ] `terraform init` completed successfully
- [ ] `terraform plan` reviewed (should create ~10 resources)
- [ ] `terraform apply` completed successfully
- [ ] Outputs saved:
  - [ ] EC2 Public IP: `__________________`
  - [ ] S3 Bucket Name: `__________________`
  - [ ] SSH Command: `__________________`

### Verify Infrastructure
- [ ] EC2 instance visible in AWS Console
- [ ] EC2 instance state: **running**
- [ ] Elastic IP attached to EC2 instance
- [ ] Security group allows ports: 22, 80, 443, 1883
- [ ] S3 bucket created and empty
- [ ] IAM role attached to EC2 instance

---

## ☐ GitHub Configuration

### Repository Setup
- [ ] Code pushed to GitHub
- [ ] Repository is private or public (your choice)
- [ ] `.env` files are in `.gitignore` (never committed!)

### IAM User for GitHub Actions
- [ ] IAM user created: `github-actions-agrisense`
- [ ] Policies attached:
  - [ ] `AmazonEC2FullAccess`
  - [ ] `AmazonS3FullAccess`
- [ ] Access keys created and saved securely

### GitHub Secrets
Navigate to: **Settings → Secrets and variables → Actions → New repository secret**

- [ ] `AWS_ACCESS_KEY_ID` added
- [ ] `AWS_SECRET_ACCESS_KEY` added
- [ ] `EC2_SSH_KEY` added (entire content of `.pem` file)

### Verify Workflows
- [ ] `.github/workflows/test.yml` exists
- [ ] `.github/workflows/deploy.yml` exists
- [ ] `.github/workflows/ml-models.yml` exists

---

## ☐ ML Models

### Training
Choose one option:

**Option A: Train Locally**
- [ ] `cd backend`
- [ ] Virtual environment activated
- [ ] `python ml/train_models.py` completed
- [ ] Models exist in `backend/ml/saved_models/`:
  - [ ] `swift_crop.pth`
  - [ ] `ttl_irrigation.pth`
  - [ ] `soil_fertility.zip`
  - [ ] `fertilizer.zip`
  - [ ] `*.joblib` files

**Option B: GitHub Actions (Recommended)**
- [ ] Go to **Actions** tab → **Upload ML Models to S3**
- [ ] Click **Run workflow**
- [ ] Version tag entered (e.g., `v1.0.0`)
- [ ] Workflow completed successfully (green checkmark)

### Verify S3 Upload
```bash
aws s3 ls s3://agrisense-iot-ml-models-YOUR_ACCOUNT_ID/latest/
```
- [ ] Files visible in S3 bucket
- [ ] Total size ~200-500 MB

---

## ☐ First Deployment

### MongoDB Atlas Setup
- [ ] MongoDB Atlas cluster is running
- [ ] EC2 Elastic IP added to IP Whitelist:
  - Atlas → Network Access → Add IP Address → Enter EC2 IP
- [ ] Connection string tested from local machine

### Deploy Application
- [ ] All `.env` files committed locally (but gitignored)
- [ ] Code committed to main branch
- [ ] `git push origin main` executed

### Monitor GitHub Actions
- [ ] Go to **Actions** tab in GitHub
- [ ] **Deploy to AWS** workflow triggered automatically
- [ ] **Run Tests First** job passed ✅
- [ ] **Deploy to EC2** job passed ✅
- [ ] Workflow completed in ~5-10 minutes

---

## ☐ Post-Deployment Verification

### SSH Access
```bash
ssh -i ~/.ssh/agrisense-key.pem ubuntu@YOUR_EC2_IP
```
- [ ] SSH connection successful
- [ ] User: `ubuntu`
- [ ] Directory `/home/ubuntu/app` exists
- [ ] Code files visible in app directory

### Container Status
```bash
cd /home/ubuntu/app
docker-compose ps
```
- [ ] All containers **Up** and **(healthy)**:
  - [ ] `fastapi`
  - [ ] `nodejs`
  - [ ] `frontend`
  - [ ] `mosquitto`
  - [ ] `nginx`

### Health Checks
Open browser or use `curl`:

- [ ] Frontend loads: `http://YOUR_EC2_IP/`
- [ ] Health endpoint: `http://YOUR_EC2_IP/health` → Status 200
- [ ] API docs: `http://YOUR_EC2_IP/docs`
- [ ] Weather API: `http://YOUR_EC2_IP/api/weather/current`
- [ ] ML status: `http://YOUR_EC2_IP/api/recommend/status`

### Application Testing
- [ ] User registration works (email magic link)
- [ ] Email verification received
- [ ] User onboarding page loads
- [ ] Dashboard displays correctly
- [ ] Manual input form submits
- [ ] ML recommendations load
- [ ] AI Advisor page works
- [ ] PDF report generates
- [ ] Sensor history page loads

### Database Verification
- [ ] MongoDB Atlas shows data in `agrisense` database
- [ ] MongoDB Atlas shows users in `Agricult` database
- [ ] New sensor readings appear in `sensor_readings` collection

### System Resources
```bash
free -h  # Check memory
df -h /  # Check disk space
docker stats  # Check container resources
```
- [ ] Memory usage < 800 MB (t2.micro has 1 GB)
- [ ] Disk usage < 20 GB (30 GB available)
- [ ] CPU usage normal (< 50% at idle)

---

## ☐ Security Hardening (Optional but Recommended)

### Network Security
- [ ] Admin IP updated to specific IP (not `0.0.0.0/0`)
- [ ] ESP32 subnet restricted to local network
- [ ] MongoDB Atlas IP whitelist only includes EC2 IP

### SSL/HTTPS (Optional)
- [ ] Domain name configured (Route 53 or external)
- [ ] Let's Encrypt SSL certificate installed
- [ ] Nginx redirects HTTP → HTTPS
- [ ] Certificate auto-renewal configured

### System Updates
- [ ] System packages updated: `sudo apt-get update && sudo apt-get upgrade -y`
- [ ] Docker images updated: `docker-compose pull`

### Monitoring (Optional)
- [ ] CloudWatch basic monitoring enabled (free tier)
- [ ] Email alerts configured for high CPU/memory
- [ ] Disk space monitoring enabled

---

## ☐ Documentation

- [ ] Deployment guide reviewed: `/docs/DEPLOYMENT.md`
- [ ] SSH command saved securely
- [ ] EC2 Public IP documented
- [ ] S3 bucket name documented
- [ ] GitHub Actions workflows understood

---

## ☐ Cleanup (Test Deployments Only)

If this was a test deployment and you want to remove everything:

```bash
cd infrastructure
terraform destroy  # Type 'yes' to confirm
```

- [ ] All AWS resources destroyed
- [ ] Elastic IP released
- [ ] No unexpected charges

---

## 🎉 Deployment Complete!

When all checkboxes are checked, your AgriSense IoT system is:
- ✅ Running on AWS
- ✅ Automatically deploying on git push
- ✅ Within free tier limits ($0/month for 12 months)
- ✅ Monitored and healthy
- ✅ Ready for production use

**Your Application URL:** `http://YOUR_EC2_IP`

**Next Steps:**
1. Share URL with team
2. Configure custom domain (optional)
3. Set up regular backups
4. Monitor usage to stay within free tier

---

**Need Help?**
- 📖 Full deployment guide: `/docs/DEPLOYMENT.md`
- 🧪 E2E test script: `/tests/e2e/test_deployment.sh`
- 📋 Troubleshooting: Check GitHub Actions logs or Docker logs
