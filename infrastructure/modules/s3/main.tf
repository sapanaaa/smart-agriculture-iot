# S3 Bucket for ML model storage

resource "aws_s3_bucket" "ml_models" {
  bucket = "${var.project_name}-ml-models-${var.aws_account_id}"

  tags = {
    Name        = "${var.project_name}-ml-models"
    Purpose     = "ML model weights storage"
    Environment = "production"
  }
}

resource "aws_s3_bucket_versioning" "ml_models_versioning" {
  bucket = aws_s3_bucket.ml_models.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "ml_models_access" {
  bucket = aws_s3_bucket.ml_models.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "ml_models_lifecycle" {
  bucket = aws_s3_bucket.ml_models.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
