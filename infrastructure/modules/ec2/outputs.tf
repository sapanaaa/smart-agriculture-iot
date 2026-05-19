output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.agrisense_server.id
}

output "public_ip" {
  description = "Elastic IP address"
  value       = aws_eip.agrisense_eip.public_ip
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.agrisense_sg.id
}

output "key_pair_name" {
  description = "EC2 key pair name"
  value       = aws_key_pair.agrisense.key_name
}
