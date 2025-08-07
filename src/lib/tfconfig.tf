# Production E-commerce Platform Infrastructure
# Estimated Monthly Cost: $3,500 - $5,000
# This represents a typical medium-scale production deployment

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.0"
}

provider "aws" {
  region = var.aws_region
}

# ==========================================
# Variables
# ==========================================

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "ecommerce-platform"
}

# ==========================================
# Networking
# ==========================================

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.project_name}-vpc"
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

resource "aws_subnet" "public" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet-${count.index + 1}"
    Type = "Public"
  }
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.project_name}-private-subnet-${count.index + 1}"
    Type = "Private"
  }
}

resource "aws_nat_gateway" "main" {
  count         = 2  # High availability NAT gateways
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "${var.project_name}-nat-${count.index + 1}"
  }
}

resource "aws_eip" "nat" {
  count  = 2
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-eip-${count.index + 1}"
  }
}

# ==========================================
# Application Load Balancer
# ==========================================

resource "aws_lb" "application" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = aws_subnet.public[*].id

  enable_deletion_protection = true
  enable_http2              = true
  enable_cross_zone_load_balancing = true

  tags = {
    Name        = "${var.project_name}-alb"
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "app" {
  name     = "${var.project_name}-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/health"
  }

  tags = {
    Name = "${var.project_name}-tg"
  }
}

# ==========================================
# Web Servers - Auto Scaling Group
# ==========================================

resource "aws_launch_template" "web" {
  name_prefix   = "${var.project_name}-web-"
  image_id      = "ami-0c55b159cbfafe1f0"  # Amazon Linux 2
  instance_type = "t3.large"

  vpc_security_group_ids = [aws_security_group.web.id]

  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size = 50
      volume_type = "gp3"
      iops        = 3000
      throughput  = 125
      encrypted   = true
    }
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    yum update -y
    yum install -y httpd
    systemctl start httpd
    systemctl enable httpd
    EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${var.project_name}-web-server"
      Environment = var.environment
      Type        = "WebServer"
    }
  }
}

resource "aws_autoscaling_group" "web" {
  name                = "${var.project_name}-web-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.app.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 300

  min_size         = 3
  max_size         = 10
  desired_capacity = 5

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-web-asg"
    propagate_at_launch = true
  }
}

# ==========================================
# Application Servers
# ==========================================

resource "aws_instance" "app_server" {
  count                  = 4
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "m5.xlarge"
  subnet_id              = aws_subnet.private[count.index % 3].id
  vpc_security_group_ids = [aws_security_group.app.id]

  root_block_device {
    volume_size = 100
    volume_type = "gp3"
    iops        = 3000
    throughput  = 125
    encrypted   = true
  }

  ebs_block_device {
    device_name = "/dev/sdf"
    volume_size = 200
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name        = "${var.project_name}-app-server-${count.index + 1}"
    Environment = var.environment
    Type        = "ApplicationServer"
  }
}

# ==========================================
# Background Job Processing Servers
# ==========================================

resource "aws_instance" "worker" {
  count                  = 3
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "c5.2xlarge"
  subnet_id              = aws_subnet.private[count.index].id
  vpc_security_group_ids = [aws_security_group.worker.id]

  root_block_device {
    volume_size = 50
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name        = "${var.project_name}-worker-${count.index + 1}"
    Environment = var.environment
    Type        = "WorkerNode"
  }
}

# ==========================================
# Databases
# ==========================================

# Primary RDS Database - Multi-AZ for High Availability
resource "aws_db_instance" "primary" {
  identifier     = "${var.project_name}-primary-db"
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = "db.r5.2xlarge"
  
  allocated_storage     = 500
  max_allocated_storage = 1000
  storage_type         = "gp3"
  storage_encrypted    = true
  iops                 = 12000
  
  db_name  = "ecommerce"
  username = "dbadmin"
  password = "ChangeMeInProduction123!"  # Use AWS Secrets Manager in production
  
  multi_az               = true
  publicly_accessible    = false
  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-final-snapshot-${formatdate("YYYY-MM-DD", timestamp())}"
  
  tags = {
    Name        = "${var.project_name}-primary-db"
    Environment = var.environment
    Type        = "PrimaryDatabase"
  }
}

# Read Replica for Analytics
resource "aws_db_instance" "read_replica" {
  identifier          = "${var.project_name}-read-replica"
  replicate_source_db = aws_db_instance.primary.identifier
  instance_class      = "db.r5.xlarge"
  
  publicly_accessible = false
  auto_minor_version_upgrade = false
  
  tags = {
    Name        = "${var.project_name}-read-replica"
    Environment = var.environment
    Type        = "ReadReplica"
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# ==========================================
# ElastiCache Redis Cluster
# ==========================================

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${var.project_name}-redis"
  description               = "Redis cluster for session management and caching"
  node_type                 = "cache.r6g.xlarge"
  parameter_group_name      = "default.redis7"
  port                      = 6379
  
  multi_az_enabled          = true
  automatic_failover_enabled = true
  num_cache_clusters        = 3
  
  subnet_group_name         = aws_elasticache_subnet_group.redis.name
  security_group_ids        = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
  
  tags = {
    Name        = "${var.project_name}-redis"
    Environment = var.environment
  }
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.project_name}-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-redis-subnet-group"
  }
}

# ==========================================
# Elasticsearch/OpenSearch Domain
# ==========================================

resource "aws_opensearch_domain" "main" {
  domain_name    = "${var.project_name}-search"
  engine_version = "OpenSearch_2.5"

  cluster_config {
    instance_type  = "r5.large.search"
    instance_count = 3
    
    zone_awareness_enabled = true
    zone_awareness_config {
      availability_zone_count = 3
    }
    
    dedicated_master_enabled = true
    dedicated_master_type   = "r5.large.search"
    dedicated_master_count  = 3
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = 100
    iops        = 3000
    throughput  = 125
  }

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = true
    master_user_options {
      master_user_name     = "admin"
      master_user_password = "ChangeMeInProduction123!"
    }
  }

  tags = {
    Name        = "${var.project_name}-opensearch"
    Environment = var.environment
  }
}

# ==========================================
# S3 Buckets
# ==========================================

resource "aws_s3_bucket" "static_assets" {
  bucket = "${var.project_name}-static-assets-${var.environment}"

  tags = {
    Name        = "${var.project_name}-static-assets"
    Environment = var.environment
  }
}

resource "aws_s3_bucket" "user_uploads" {
  bucket = "${var.project_name}-user-uploads-${var.environment}"

  tags = {
    Name        = "${var.project_name}-user-uploads"
    Environment = var.environment
  }
}

resource "aws_s3_bucket" "backups" {
  bucket = "${var.project_name}-backups-${var.environment}"

  tags = {
    Name        = "${var.project_name}-backups"
    Environment = var.environment
  }
}

resource "aws_s3_bucket" "logs" {
  bucket = "${var.project_name}-logs-${var.environment}"

  tags = {
    Name        = "${var.project_name}-logs"
    Environment = var.environment
  }
}

resource "aws_s3_bucket" "data_lake" {
  bucket = "${var.project_name}-data-lake-${var.environment}"

  tags = {
    Name        = "${var.project_name}-data-lake"
    Environment = var.environment
    Purpose     = "Analytics"
  }
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Lifecycle Policies
resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "archive-old-backups"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 730  # Delete after 2 years
    }
  }
}

# ==========================================
# CloudFront Distribution
# ==========================================

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled    = true
  comment            = "${var.project_name} CDN"
  default_root_object = "index.html"
  price_class        = "PriceClass_200"  # Use edge locations in US, Canada, Europe, Asia

  origin {
    domain_name = aws_s3_bucket.static_assets.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.static_assets.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.cdn.cloudfront_access_identity_path
    }
  }

  origin {
    domain_name = aws_lb.application.dns_name
    origin_id   = "ALB-${aws_lb.application.id}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-${aws_lb.application.id}"

    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  ordered_cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "S3-${aws_s3_bucket.static_assets.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "${var.project_name}-cdn"
    Environment = var.environment
  }
}

resource "aws_cloudfront_origin_access_identity" "cdn" {
  comment = "${var.project_name} CDN OAI"
}

# ==========================================
# ECS Fargate Cluster for Microservices
# ==========================================

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "${var.project_name}-ecs-cluster"
    Environment = var.environment
  }
}

resource "aws_ecs_service" "api" {
  name            = "${var.project_name}-api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "api"
    container_port   = 3000
  }

  tags = {
    Name        = "${var.project_name}-api-service"
    Environment = var.environment
  }
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${var.project_name}-api"
  network_mode            = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                     = "2048"  # 2 vCPU
  memory                  = "4096"  # 4 GB

  container_definitions = jsonencode([
    {
      name  = "api"
      image = "your-ecr-repo/api:latest"
      
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}-api"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api"
        }
      }
    }
  ])

  tags = {
    Name        = "${var.project_name}-api-task"
    Environment = var.environment
  }
}

# ==========================================
# Lambda Functions
# ==========================================

resource "aws_lambda_function" "image_processor" {
  filename         = "lambda-functions/image-processor.zip"
  function_name    = "${var.project_name}-image-processor"
  role            = aws_iam_role.lambda.arn
  handler         = "index.handler"
  source_code_hash = filebase64sha256("lambda-functions/image-processor.zip")
  runtime         = "nodejs18.x"
  memory_size     = 1024
  timeout         = 60

  environment {
    variables = {
      BUCKET_NAME = aws_s3_bucket.user_uploads.id
    }
  }

  tags = {
    Name        = "${var.project_name}-image-processor"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "data_analytics" {
  filename         = "lambda-functions/data-analytics.zip"
  function_name    = "${var.project_name}-data-analytics"
  role            = aws_iam_role.lambda.arn
  handler         = "main.handler"
  source_code_hash = filebase64sha256("lambda-functions/data-analytics.zip")
  runtime         = "python3.11"
  memory_size     = 3008
  timeout         = 300

  environment {
    variables = {
      DATA_LAKE_BUCKET = aws_s3_bucket.data_lake.id
    }
  }

  tags = {
    Name        = "${var.project_name}-data-analytics"
    Environment = var.environment
  }
}

# ==========================================
# DynamoDB Tables
# ==========================================

resource "aws_dynamodb_table" "sessions" {
  name           = "${var.project_name}-sessions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "session_id"
  range_key      = "user_id"

  attribute {
    name = "session_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "${var.project_name}-sessions"
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "user_preferences" {
  name           = "${var.project_name}-user-preferences"
  billing_mode   = "PROVISIONED"
  read_capacity  = 10
  write_capacity = 10
  hash_key       = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
    read_capacity   = 5
    write_capacity  = 5
  }

  attribute {
    name = "email"
    type = "S"
  }

  tags = {
    Name        = "${var.project_name}-user-preferences"
    Environment = var.environment
  }
}

# ==========================================
# SQS Queues
# ==========================================

resource "aws_sqs_queue" "email_queue" {
  name                      = "${var.project_name}-email-queue"
  delay_seconds            = 0
  max_message_size         = 262144
  message_retention_seconds = 1209600  # 14 days
  receive_wait_time_seconds = 10
  visibility_timeout_seconds = 300

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.email_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name        = "${var.project_name}-email-queue"
    Environment = var.environment
  }
}

resource "aws_sqs_queue" "email_dlq" {
  name                      = "${var.project_name}-email-dlq"
  message_retention_seconds = 1209600  # 14 days

  tags = {
    Name        = "${var.project_name}-email-dlq"
    Environment = var.environment
  }
}

# ==========================================
# Security Groups (simplified for brevity)
# ==========================================

resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb-sg"
  }
}

resource "aws_security_group" "web" {
  name        = "${var.project_name}-web-sg"
  description = "Security group for web servers"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-web-sg"
  }
}

resource "aws_security_group" "app" {
  name        = "${var.project_name}-app-sg"
  description = "Security group for application servers"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-app-sg"
  }
}

resource "aws_security_group" "worker" {
  name        = "${var.project_name}-worker-sg"
  description = "Security group for worker nodes"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-worker-sg"
  }
}

resource "aws_security_group" "database" {
  name        = "${var.project_name}-db-sg"
  description = "Security group for databases"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-db-sg"
  }
}

resource "aws_security_group" "redis" {
  name        = "${var.project_name}-redis-sg"
  description = "Security group for Redis cluster"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-redis-sg"
  }
}

resource "aws_security_group" "ecs" {
  name        = "${var.project_name}-ecs-sg"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-ecs-sg"
  }
}

# ==========================================
# CloudWatch Alarms
# ==========================================

resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${var.project_name}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/EC2"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_description  = "This metric monitors ec2 cpu utilization"

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.web.name
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${var.project_name}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/RDS"
  period             = "300"
  statistic          = "Average"
  threshold          = "75"
  alarm_description  = "This metric monitors RDS cpu utilization"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.primary.id
  }
}

# ==========================================
# IAM Roles (simplified)
# ==========================================

resource "aws_iam_role" "lambda" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-lambda-role"
  }
}

# ==========================================
# Data sources
# ==========================================

data "aws_availability_zones" "available" {
  state = "available"
}

# ==========================================
# Outputs
# ==========================================

output "alb_dns_name" {
  value       = aws_lb.application.dns_name
  description = "DNS name of the Application Load Balancer"
}

output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.cdn.domain_name
  description = "CloudFront distribution domain name"
}

output "rds_endpoint" {
  value       = aws_db_instance.primary.endpoint
  description = "RDS instance endpoint"
  sensitive   = true
}

output "redis_endpoint" {
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  description = "Redis primary endpoint"
  sensitive   = true
}