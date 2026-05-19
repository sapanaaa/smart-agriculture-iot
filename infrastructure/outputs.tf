output "ec2_public_ip" {
  description = "Public IP address of EC2 instance"
  value       = module.ec2.public_ip
}

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = module.ec2.instance_id
}

output "ssh_command" {
  description = "SSH command to connect to EC2 instance"
  value       = "ssh -i ~/.ssh/id_rsa ubuntu@${module.ec2.public_ip}"
}

output "key_pair_name" {
  description = "Auto-generated EC2 key pair name"
  value       = module.ec2.key_pair_name
}

output "application_url" {
  description = "Application URL"
  value       = "http://${module.ec2.public_ip}"
}

output "deployment_info" {
  description = "Important deployment information"
  value = <<-EOT
    ========================================
    AgriSense IoT Deployment Complete!
    ========================================

    EC2 Instance ID: ${module.ec2.instance_id}
    Public IP: ${module.ec2.public_ip}
    Storage: 30GB EBS volume (ML models stored on EC2)

    SSH Access:
      ssh -i ~/.ssh/id_rsa ubuntu@${module.ec2.public_ip}

    EC2 Key Pair: ${module.ec2.key_pair_name} (auto-created from your local SSH key)

    Application URLs:
      Frontend: http://${module.ec2.public_ip}
      FastAPI Health: http://${module.ec2.public_ip}/health

    Next Steps:
      1. Train ML models locally: cd backend && python ml/train_models.py
      2. Configure GitHub Secrets (BACKEND_ENV, NODEJS_ENV, FRONTEND_ENV, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, EC2_SSH_KEY)
      3. Push code to trigger deployment workflow (ML models included in rsync)

    ========================================
  EOT
}
