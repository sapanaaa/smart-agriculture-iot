output "bucket_name" {
  description = "Name of S3 bucket"
  value       = aws_s3_bucket.ml_models.id
}

output "bucket_arn" {
  description = "ARN of S3 bucket"
  value       = aws_s3_bucket.ml_models.arn
}
