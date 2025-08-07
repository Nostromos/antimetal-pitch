const terraformToAWSServiceCode = {
  // EC2 and Compute
  'aws_instance': 'AmazonEC2',
  'aws_spot_instance_request': 'AmazonEC2',
  'aws_launch_template': 'AmazonEC2',
  'aws_launch_configuration': 'AmazonEC2',
  'aws_autoscaling_group': 'AmazonEC2',

  // Storage
  'aws_ebs_volume': 'AmazonEC2', // EBS is part of EC2 pricing
  'aws_ebs_snapshot': 'AmazonEC2',
  'aws_efs_file_system': 'AmazonEFS',
  'aws_fsx_lustre_file_system': 'AmazonFSx',

  // RDS
  'aws_db_instance': 'AmazonRDS',
  'aws_db_cluster': 'AmazonRDS',
  'aws_rds_cluster': 'AmazonRDS',
  'aws_db_proxy': 'AmazonRDS',

  // DynamoDB
  'aws_dynamodb_table': 'AmazonDynamoDB',

  // S3
  'aws_s3_bucket': 'AmazonS3',
  'aws_s3_bucket_object': 'AmazonS3',

  // VPC and Networking
  'aws_vpc': 'AmazonVPC',
  'aws_nat_gateway': 'AmazonVPC',
  'aws_vpn_gateway': 'AmazonVPC',
  'aws_vpc_endpoint': 'AmazonVPC',
  'aws_eip': 'AmazonEC2', // Elastic IPs are under EC2

  // Load Balancing
  'aws_lb': 'AWSELB', // Elastic Load Balancing
  'aws_alb': 'AWSELB',
  'aws_elb': 'AWSELB',
  'aws_lb_target_group': 'AWSELB',

  // CloudFront
  'aws_cloudfront_distribution': 'AmazonCloudFront',

  // Lambda
  'aws_lambda_function': 'AWSLambda',

  // ElastiCache
  'aws_elasticache_cluster': 'AmazonElastiCache',
  'aws_elasticache_replication_group': 'AmazonElastiCache',

  // OpenSearch/Elasticsearch
  'aws_opensearch_domain': 'AmazonES',
  'aws_elasticsearch_domain': 'AmazonES',

  // ECS/Fargate
  'aws_ecs_cluster': 'AmazonECS',
  'aws_ecs_service': 'AmazonECS',
  'aws_ecs_task_definition': 'AmazonECS',

  // SQS
  'aws_sqs_queue': 'AWSQueueService',

  // SNS
  'aws_sns_topic': 'AmazonSNS',

  // Kinesis
  'aws_kinesis_stream': 'AmazonKinesis',
  'aws_kinesis_firehose_delivery_stream': 'AmazonKinesisFirehose',

  // Redshift
  'aws_redshift_cluster': 'AmazonRedshift',

  // Route53
  'aws_route53_zone': 'AmazonRoute53',
  'aws_route53_record': 'AmazonRoute53',

  // CloudWatch
  'aws_cloudwatch_metric_alarm': 'AmazonCloudWatch',
  'aws_cloudwatch_log_group': 'AWSLogs',

  // API Gateway
  'aws_api_gateway_rest_api': 'AmazonApiGateway',
  'aws_apigatewayv2_api': 'AmazonApiGateway',

  // Secrets Manager
  'aws_secretsmanager_secret': 'AWSSecretsManager',

  // ECR
  'aws_ecr_repository': 'AmazonECR',

  // EKS
  'aws_eks_cluster': 'AmazonEKS',
  'aws_eks_node_group': 'AmazonEKS'
};

export default terraformToAWSServiceCode;