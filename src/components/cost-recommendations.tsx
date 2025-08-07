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

        // Check for gp2 volumes
        if (resource.specs.storage?.type === 'gp2') {
          recommendations.push({
            type: 'optimization',
            title: `Upgrade ${resource.name} storage to gp3`,
            description: 'GP3 volumes offer 20% lower cost than GP2 with better baseline performance',
            savings: '~20%'
          })
        }

        // Large instance without reserved pricing
        if (resource.specs.instanceType?.includes('large')) {
          recommendations.push({
            type: 'info',
            title: 'Consider Reserved Instances',
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
            title: 'Consider Aurora Serverless',
            description: `For variable workloads, Aurora Serverless v2 can reduce costs by auto-scaling`,
          })
        }
      }

      if (resource.type === 'S3' && resource.specs) {
        if (resource.specs.estimatedStorage > 500) {
          recommendations.push({
            type: 'optimization',
            title: 'Consider S3 storage classes',
            description: 'For infrequently accessed data, use S3 IA or Glacier for up to 95% savings',
            savings: 'Up to 95%'
          })
        }
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