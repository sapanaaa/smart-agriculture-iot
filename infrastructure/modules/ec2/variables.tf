variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "ami_id" {
  description = "AMI ID for EC2 instance"
  type        = string
}

variable "admin_ip" {
  description = "Admin IP for SSH access"
  type        = string
}

variable "esp32_subnet" {
  description = "ESP32 subnet for MQTT"
  type        = string
}

variable "iam_instance_profile" {
  description = "IAM instance profile name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}
