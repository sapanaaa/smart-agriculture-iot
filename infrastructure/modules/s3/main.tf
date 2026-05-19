# S3 Bucket for ML model storage (simple, no versioning/lifecycle)

resource "aws_s3_bucket" "ml_models" {
  bucket = "${var.project_name}-ml-models-${var.aws_account_id}"

  tags = {
    Name        = "${var.project_name}-ml-models"
    Purpose     = "ML model weights storage"
    Environment = "production"
  }
}

# Block public access (security)
resource "aws_s3_bucket_public_access_block" "ml_models_access" {
  bucket = aws_s3_bucket.ml_models.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
