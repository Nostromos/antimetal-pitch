export const demoTerraformConfig = `# Production E-commerce Platform Infrastructure
# Estimated Monthly Cost: $3,500 - $5,000
# This represents a typical medium-scale production deployment

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# ==========================================
# Web Servers - Auto Scaling Group
# ==========================================

resource "aws_instance" "web_server" {
  count         = 3
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.large"

  root_block_device {
    volume_size = 50
    volume_type = "gp3"
  }

  tags = {
    Name = "web-server-\${count.index + 1}"
  }
}

# ==========================================
# Application Servers
# ==========================================

resource "aws_instance" "app_server" {
  count         = 2
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "m5.xlarge"

  root_block_device {
    volume_size = 100
    volume_type = "gp3"
  }

  ebs_block_device {
    device_name = "/dev/sdf"
    volume_size = 200
    volume_type = "gp3"
  }

  tags = {
    Name = "app-server-\${count.index + 1}"
  }
}

# ==========================================
# Primary Database - Multi-AZ
# ==========================================

resource "aws_db_instance" "primary" {
  identifier     = "primary-database"
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = "db.r5.xlarge"
  
  allocated_storage = 500
  storage_type      = "gp3"
  
  multi_az = true
  
  tags = {
    Name = "primary-database"
  }
}

# ==========================================
# Redis Cache Cluster
# ==========================================

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "redis-cache"
  description         = "Redis cluster for caching"
  node_type           = "cache.r6g.large"
  
  num_cache_clusters = 2
  
  tags = {
    Name = "redis-cache"
  }
}

# ==========================================
# S3 Buckets for Storage
# ==========================================

resource "aws_s3_bucket" "static_assets" {
  bucket = "static-assets-production"
  
  tags = {
    Name = "static-assets"
  }
}

resource "aws_s3_bucket" "user_uploads" {
  bucket = "user-uploads-production"
  
  tags = {
    Name = "user-uploads"
  }
}

resource "aws_s3_bucket" "backups" {
  bucket = "backups-production"
  
  tags = {
    Name = "backups"
  }
}

# ==========================================
# Lambda Functions
# ==========================================

resource "aws_lambda_function" "image_processor" {
  filename      = "image-processor.zip"
  function_name = "image-processor"
  role         = "arn:aws:iam::123456789012:role/lambda-role"
  handler      = "index.handler"
  runtime      = "nodejs18.x"
  memory_size  = 1024
  timeout      = 60

  tags = {
    Name = "image-processor"
  }
}

resource "aws_lambda_function" "data_analytics" {
  filename      = "data-analytics.zip"
  function_name = "data-analytics"
  role         = "arn:aws:iam::123456789012:role/lambda-role"
  handler      = "main.handler"
  runtime      = "python3.11"
  memory_size  = 3008
  timeout      = 300

  tags = {
    Name = "data-analytics"
  }
}

# ==========================================
# DynamoDB Tables
# ==========================================

resource "aws_dynamodb_table" "sessions" {
  name         = "user-sessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "session_id"

  attribute {
    name = "session_id"
    type = "S"
  }

  tags = {
    Name = "user-sessions"
  }
}

# ==========================================
# Load Balancer
# ==========================================

resource "aws_lb" "application" {
  name               = "app-load-balancer"
  internal           = false
  load_balancer_type = "application"

  tags = {
    Name = "app-load-balancer"
  }
}`