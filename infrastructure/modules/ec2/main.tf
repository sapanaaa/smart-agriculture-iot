# EC2 Instance for AgriSense IoT application

# Create EC2 key pair from your local public key
resource "aws_key_pair" "agrisense" {
  key_name   = "${var.project_name}-key"
  public_key = file(pathexpand("~/.ssh/id_rsa.pub"))

  tags = {
    Name = "${var.project_name}-keypair"
  }
}

resource "aws_security_group" "agrisense_sg" {
  name        = "${var.project_name}-security-group"
  description = "Security group for AgriSense IoT server"

  # HTTP - Frontend access
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS - For future SSL
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # MQTT - ESP32 sensor data
  ingress {
    description = "MQTT"
    from_port   = 1883
    to_port     = 1883
    protocol    = "tcp"
    cidr_blocks = [var.esp32_subnet]
  }

  # SSH - Admin access + GitHub Actions
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Allow from anywhere (needed for GitHub Actions)
  }

  # Allow all outbound traffic
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-sg"
  }
}

resource "aws_instance" "agrisense_server" {
  ami                    = var.ami_id
  instance_type          = "t2.micro"  # Free tier eligible
  key_name               = aws_key_pair.agrisense.key_name  # Use auto-created key
  vpc_security_group_ids = [aws_security_group.agrisense_sg.id]
  iam_instance_profile   = var.iam_instance_profile

  root_block_device {
    volume_size           = 30  # GB (free tier limit)
    volume_type           = "gp3"
    delete_on_termination = true
  }

  user_data = templatefile("${path.module}/user_data.sh", {
    AWS_REGION     = var.aws_region
    AWS_ACCOUNT_ID = var.aws_account_id
  })

  tags = {
    Name = "AgriSense-IoT-Server"
  }
}

resource "aws_eip" "agrisense_eip" {
  instance = aws_instance.agrisense_server.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-static-ip"
  }
}
