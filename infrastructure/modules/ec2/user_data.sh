#!/bin/bash
set -e

# EC2 User Data Script for AgriSense IoT
# This script runs on first boot to setup the server

echo "========================================="
echo "AgriSense IoT - EC2 Setup Starting"
echo "========================================="

# Update system packages
echo "[1/8] Updating system packages..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

# Install Docker
echo "[2/8] Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu
systemctl enable docker
systemctl start docker

# Install Docker Compose
echo "[3/8] Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install AWS CLI v2
echo "[4/8] Installing AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
apt-get install -y unzip
unzip awscliv2.zip
./aws/install
rm -rf awscliv2.zip aws

# Install Git
echo "[5/8] Installing Git..."
apt-get install -y git

# Create application directories
echo "[6/8] Creating application directories..."
mkdir -p /home/ubuntu/app
mkdir -p /home/ubuntu/app/backend/ml/saved_models
mkdir -p /home/ubuntu/.ssh
chown -R ubuntu:ubuntu /home/ubuntu/app

# Note: ML models will be deployed via GitHub Actions (stored on EBS)
echo "[7/8] ML model storage ready at /home/ubuntu/app/backend/ml/saved_models/"

# Set up deployment script
echo "[8/8] Creating deployment script..."
cat > /home/ubuntu/deploy.sh <<'DEPLOY_SCRIPT'
#!/bin/bash
set -e

echo "Starting deployment..."

cd /home/ubuntu/app

# Pull latest code (will be done by GitHub Actions)
if [ -d .git ]; then
    git pull origin main || echo "Git pull skipped (not a git repo yet)"
fi

# ML models are deployed via GitHub Actions (stored in backend/ml/saved_models/)
echo "ML models location: backend/ml/saved_models/"

# Stop existing containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down || true

# Build and start containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# Wait for services to be healthy
echo "Waiting for services to start..."
sleep 30

# Show container status
docker-compose ps

echo "Deployment complete!"
DEPLOY_SCRIPT

chmod +x /home/ubuntu/deploy.sh
chown ubuntu:ubuntu /home/ubuntu/deploy.sh

# Create service status check script
cat > /home/ubuntu/check_status.sh <<'STATUS_SCRIPT'
#!/bin/bash
echo "========================================="
echo "AgriSense IoT - Service Status"
echo "========================================="
cd /home/ubuntu/app
docker-compose ps
echo ""
echo "Health Check:"
curl -s http://localhost/health | jq '.' || echo "Health endpoint not responding"
echo ""
echo "Disk Usage:"
df -h /
echo ""
echo "Memory Usage:"
free -h
STATUS_SCRIPT

chmod +x /home/ubuntu/check_status.sh
chown ubuntu:ubuntu /home/ubuntu/check_status.sh

echo "========================================="
echo "AgriSense IoT - EC2 Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Deploy application code to /home/ubuntu/app/"
echo "2. Run: /home/ubuntu/deploy.sh"
echo ""
echo "Server is ready for deployment!"
