variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

variable "admin_ip" {
  description = "Your IP address for SSH access (CIDR format, e.g., 203.0.113.10/32)"
  type        = string
}

variable "esp32_subnet" {
  description = "CIDR block for ESP32 devices MQTT access (e.g., 192.168.1.0/24)"
  type        = string
  default     = "0.0.0.0/0"  # WARNING: Restrict this in production!
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "agrisense-iot"
}
