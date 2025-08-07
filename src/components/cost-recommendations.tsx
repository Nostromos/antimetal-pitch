"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon, TrendingDownIcon, AlertTriangleIcon } from "lucide-react"

interface Recommendation {
  type: 'info' | 'optimization' | 'warning'
  title: string
  description: string
  savings?: string
}

interface CostRecommendationsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resources: any[]
}

export function CostRecommendations({ resources }: CostRecommendationsProps) {
  const generateRecommendations = (): Recommendation[] => {
    const recommendations: Recommendation[] = []

    resources.forEach(resource => {
      if (resource.type === 'EC2' && resource.specs) {
        // Check for t2 instances
        if (resource.specs.instanceType?.includes('t2.')) {
          recommendations.push({
            type: 'optimization',
            title: `Upgrade ${resource.name} to t3 instance`,
            description: `Consider using ${resource.specs.instanceType.replace('t2.', 't3.')} instead for better performance and ~10% cost savings`,
            savings: '~10%'
          })
        }

        // Recommend Graviton instances for cost savings
        if (resource.specs.instanceType?.match(/^(m5|r5|c5|t3)/)) {
          const gravitonType = resource.specs.instanceType.replace(/^(m5|r5|c5)/, '$1g').replace('t3', 't4g')
          recommendations.push({
            type: 'optimization',
            title: `Consider Graviton instance for ${resource.name}`,
            description: `Switch to ${gravitonType} (ARM-based Graviton) for up to 40% better price-performance`,
            savings: 'Up to 40%'
          })
        }

        // Check for gp2 volumes
        if (resource.specs.storage?.type === 'gp2') {
          recommendations.push({
            type: 'optimization',
            title: `Upgrade ${resource.name} storage to gp3`,
            description: 'GP3 volumes offer 20% lower cost than GP2 with better baseline performance',
            savings: '~20%'
          })
        }

        // Right-sizing based on instance type
        if (resource.specs.instanceType?.includes('xlarge') && !resource.specs.instanceType?.includes('.large')) {
          recommendations.push({
            type: 'info',
            title: `Review instance size for ${resource.name}`,
            description: 'Monitor CPU and memory utilization to identify right-sizing opportunities',
            savings: 'Varies'
          })
        }

        // Spot instances for worker nodes
        if (resource.name?.toLowerCase().includes('worker') || resource.resourceType?.includes('autoscaling')) {
          recommendations.push({
            type: 'optimization',
            title: `Use Spot Instances for ${resource.name}`,
            description: 'For fault-tolerant workloads, Spot Instances can save up to 90%',
            savings: 'Up to 90%'
          })
        }

        // Large instance without reserved pricing
        if (resource.specs.instanceType?.includes('large')) {
          recommendations.push({
            type: 'info',
            title: 'Consider Reserved Instances or Savings Plans',
            description: `For long-running instances like ${resource.name}, Reserved Instances can save up to 72%`,
            savings: 'Up to 72%'
          })
        }
      }

      if (resource.type === 'RDS' && resource.specs) {
        // Multi-AZ for non-critical workloads
        if (resource.specs.multiAz) {
          recommendations.push({
            type: 'info',
            title: 'Review Multi-AZ requirement',
            description: `Multi-AZ doubles RDS costs. Ensure ${resource.name} requires high availability`,
          })
        }

        // Aurora Serverless for variable workloads
        if (resource.specs.engine === 'mysql' || resource.specs.engine === 'postgres') {
          recommendations.push({
            type: 'info',
            title: 'Consider Aurora Serverless v2',
            description: `For variable workloads, Aurora Serverless v2 can reduce costs by auto-scaling capacity`,
            savings: '40-90%'
          })
        }

        // Storage optimization for RDS
        if (resource.specs.allocatedStorage > 100) {
          recommendations.push({
            type: 'optimization',
            title: 'Enable RDS storage auto-scaling',
            description: 'Start with lower storage and let RDS auto-scale as needed to avoid over-provisioning',
            savings: '~20%'
          })
        }

        // Reserved instances for RDS
        recommendations.push({
          type: 'optimization',
          title: `Consider Reserved Instances for ${resource.name}`,
          description: 'RDS Reserved Instances can provide up to 69% discount for 1 or 3 year commitments',
          savings: 'Up to 69%'
        })
      }

      if (resource.type === 'S3' && resource.specs) {
        // Storage class optimization
        if (resource.specs.estimatedStorage > 100) {
          recommendations.push({
            type: 'optimization',
            title: 'Implement S3 Intelligent-Tiering',
            description: 'Automatically moves objects between access tiers based on usage patterns',
            savings: 'Up to 70%'
          })
        }

        // Lifecycle policies
        if (resource.specs.estimatedStorage > 500) {
          recommendations.push({
            type: 'optimization',
            title: 'Configure S3 Lifecycle policies',
            description: 'Archive old data to Glacier/Deep Archive for up to 95% savings',
            savings: 'Up to 95%'
          })
        }

        // Check for backup buckets
        if (resource.name?.toLowerCase().includes('backup')) {
          recommendations.push({
            type: 'optimization',
            title: 'Use S3 Glacier for backups',
            description: 'Glacier Instant Retrieval offers 68% lower cost than S3 Standard for backup data',
            savings: '~68%'
          })
        }
      }

      // Lambda optimization
      if (resource.type === 'Lambda' && resource.specs) {
        if (resource.specs.memorySize > 1024) {
          recommendations.push({
            type: 'optimization',
            title: `Optimize Lambda memory for ${resource.name}`,
            description: 'Use AWS Lambda Power Tuning to find the optimal memory/cost configuration',
            savings: '10-50%'
          })
        }

        recommendations.push({
          type: 'info',
          title: 'Consider Lambda@Edge caching',
          description: 'For global functions, Lambda@Edge with CloudFront can reduce invocations',
          savings: 'Varies'
        })
      }

      // DynamoDB optimization
      if (resource.type === 'DynamoDB' && resource.specs) {
        if (resource.specs.billingMode === 'PROVISIONED' && resource.specs.readCapacity) {
          recommendations.push({
            type: 'optimization',
            title: 'Consider DynamoDB On-Demand',
            description: 'For unpredictable workloads, on-demand can be more cost-effective',
            savings: 'Varies'
          })
        }

        if (resource.specs.billingMode === 'PAY_PER_REQUEST') {
          recommendations.push({
            type: 'info',
            title: 'Review DynamoDB usage patterns',
            description: 'For consistent workloads, provisioned capacity with auto-scaling may be cheaper',
            savings: 'Up to 70%'
          })
        }

        recommendations.push({
          type: 'optimization',
          title: 'Enable DynamoDB TTL',
          description: 'Automatically delete expired items to reduce storage costs',
          savings: '~10%'
        })
      }

      // ElastiCache optimization
      if (resource.resourceType === 'aws_elasticache_replication_group' || resource.resourceType === 'aws_elasticache_cluster') {
        recommendations.push({
          type: 'optimization',
          title: `Reserve capacity for ${resource.name}`,
          description: 'ElastiCache Reserved Nodes offer up to 55% discount',
          savings: 'Up to 55%'
        })

        if (resource.specs?.nodeType?.includes('cache.r')) {
          recommendations.push({
            type: 'info',
            title: 'Review cache node type',
            description: 'Consider cache.m instances if memory optimization is not critical',
            savings: '~20%'
          })
        }
      }

      // ECS/Fargate optimization
      if (resource.resourceType === 'aws_ecs_service') {
        recommendations.push({
          type: 'optimization',
          title: 'Use Fargate Spot for non-critical tasks',
          description: 'Fargate Spot offers up to 70% discount for interruptible workloads',
          savings: 'Up to 70%'
        })
      }

      // NAT Gateway optimization
      if (resource.resourceType === 'aws_nat_gateway') {
        recommendations.push({
          type: 'optimization',
          title: 'Consider NAT Instance for non-production',
          description: 'NAT Instances can be 50-75% cheaper than NAT Gateways for low-traffic environments',
          savings: '50-75%'
        })
      }

      // Load Balancer optimization
      if (resource.resourceType === 'aws_lb' || resource.resourceType === 'aws_alb' || resource.resourceType === 'aws_elb') {
        recommendations.push({
          type: 'info',
          title: 'Optimize load balancer configuration',
          description: 'Consider connection draining, idle timeout, and cross-zone load balancing settings',
          savings: '~10%'
        })
      }

      // CloudFront optimization
      if (resource.resourceType === 'aws_cloudfront_distribution') {
        recommendations.push({
          type: 'optimization',
          title: 'Optimize CloudFront caching',
          description: 'Increase cache TTLs and use Origin Shield to reduce origin requests',
          savings: '20-40%'
        })
      }
    })

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'info',
        title: 'No recommendations yet',
        description: 'Start by adding Terraform resources in the input area above. Once you paste your Terraform configuration, we\'ll analyze your infrastructure and provide personalized cost optimization suggestions.',
      })
    }

    return recommendations
  }

  const recommendations = generateRecommendations()

  const getIcon = (type: string) => {
    switch (type) {
      case 'optimization':
        return <TrendingDownIcon className="h-4 w-4" />
      case 'warning':
        return <AlertTriangleIcon className="h-4 w-4" />
      default:
        return <InfoIcon className="h-4 w-4" />
    }
  }

  const getVariant = (type: string): "default" | "destructive" => {
    return type === 'warning' ? 'destructive' : 'default'
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Cost Optimization Recommendations</CardTitle>
        <CardDescription>
          Suggestions to reduce your AWS infrastructure costs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`grid gap-3 ${recommendations.length === 1 ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
          {recommendations.map((rec, index) => (
            <Alert key={index} variant={getVariant(rec.type)}>
              {getIcon(rec.type)}
              <AlertTitle className="!line-clamp-none whitespace-normal">
                {rec.title}
                {rec.savings && (
                  <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">
                    Save {rec.savings}
                  </span>
                )}
              </AlertTitle>
              <AlertDescription className="whitespace-normal">
                {rec.description}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}