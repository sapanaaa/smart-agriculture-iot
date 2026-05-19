output "ec2_public_ip" {
  description = "Public IP address of EC2 instance"
  value       = module.ec2.public_ip
}

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = module.ec2.instance_id
}

output "s3_bucket_name" {
  description = "S3 bucket name for ML models"
  value       = module.s3.bucket_name
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
    S3 Bucket: ${module.s3.bucket_name}

    SSH Access:
      ssh -i ~/.ssh/id_rsa ubuntu@${module.ec2.public_ip}

    EC2 Key Pair: ${module.ec2.key_pair_name} (auto-created from your local SSH key)

    Application URLs:
      Frontend: http://${module.ec2.public_ip}
      FastAPI Health: http://${module.ec2.public_ip}/health

    Next Steps:
      1. Upload ML models to S3: aws s3 sync backend/ml/saved_models/ s3://${module.s3.bucket_name}/
      2. Configure GitHub Secrets (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, EC2_SSH_KEY)
      3. Push code to trigger deployment workflow

    ========================================
  EOT
}
