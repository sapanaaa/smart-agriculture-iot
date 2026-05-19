output "role_arn" {
  description = "ARN of IAM role"
  value       = aws_iam_role.ec2_role.arn
}

output "instance_profile_name" {
  description = "Name of IAM instance profile"
  value       = aws_iam_instance_profile.ec2_profile.name
}
