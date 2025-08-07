"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, DollarSign, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ResourcePricing {
  resourceName: string
  resourceType: string
  pricing: {
    hourly?: number
    monthly?: number
    yearly?: number
    error?: string
    message?: string
    unit?: string
    pricePerUnit?: number
  }
}

interface CostBreakdownProps {
  loading?: boolean
  error?: string
  data?: {
    resources: ResourcePricing[]
    total: {
      hourly: number
      monthly: number
      yearly: number
    }
    region: string
    timestamp: string
  }
}

export function CostBreakdown({ loading, error, data }: CostBreakdownProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
          <CardDescription>Calculating AWS costs...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
          <CardDescription>Unable to calculate costs</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.resources.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
          <CardDescription>Enter Terraform configuration to see cost estimates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Cost estimates will appear here once you add resources</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Cost Breakdown</CardTitle>
        <CardDescription>
          Estimated AWS costs for {data.region || 'us-east-1'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Cost Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Hourly</div>
            <div className="text-2xl font-bold">{formatCurrency(data.total.hourly)}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Monthly</div>
            <div className="text-2xl font-bold">{formatCurrency(data.total.monthly)}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Yearly</div>
            <div className="text-2xl font-bold">{formatCurrency(data.total.yearly)}</div>
          </div>
        </div>

        {/* Per-Resource Breakdown */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Resource Costs
          </h3>
          {data.resources.map((resource, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold">{resource.resourceName}</div>
                  <Badge variant="secondary" className="mt-1">
                    {resource.resourceType}
                  </Badge>
                </div>
                {resource.pricing.error ? (
                  <Badge variant="destructive">Error</Badge>
                ) : resource.pricing.message ? (
                  <Badge variant="outline">Limited Data</Badge>
                ) : null}
              </div>
              
              {resource.pricing.error ? (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {resource.pricing.error}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Hourly: </span>
                    <span className="font-medium">
                      {formatCurrency(resource.pricing.hourly || 0)}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Monthly: </span>
                    <span className="font-medium">
                      {formatCurrency(resource.pricing.monthly || 0)}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Yearly: </span>
                    <span className="font-medium">
                      {formatCurrency(resource.pricing.yearly || 0)}
                    </span>
                  </div>
                </div>
              )}
              
              {resource.pricing.message && (
                <p className="text-xs text-muted-foreground mt-2">
                  {resource.pricing.message}
                </p>
              )}
              
              {resource.pricing.unit && (
                <p className="text-xs text-muted-foreground mt-2">
                  Pricing unit: {resource.pricing.unit} at {formatCurrency(resource.pricing.pricePerUnit || 0)}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            These are estimated costs based on on-demand pricing. Actual costs may vary based on usage patterns, 
            data transfer, and additional services. Consider Reserved Instances or Savings Plans for better rates.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}