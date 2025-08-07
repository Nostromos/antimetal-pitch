"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ParsedResource {
  type: string
  name: string
  resourceType: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  specs: any
  serviceCode?: string
}

interface ParsedResourcesProps {
  resources: ParsedResource[]
}

export function ParsedResources({ resources }: ParsedResourcesProps) {
  const getResourceIcon = (type: string) => {
    const icons: Record<string, string> = {
      'EC2': '🖥️',
      'RDS': '🗄️',
      'S3': '🪣',
      'Lambda': '⚡',
      'DynamoDB': '📊',
    }
    return icons[type] || '📦'
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Parsed Resources</CardTitle>
        <CardDescription>
          {resources.length} resource{resources.length !== 1 ? 's' : ''} detected
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {resources.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No resources detected. Start by adding Terraform configuration.
            </div>
          ) : (
            <div className="space-y-3">
              {resources.map((resource, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <span className="text-2xl">{getResourceIcon(resource.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{resource.name}</span>
                      <Badge variant="secondary">{resource.type}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {resource.resourceType}
                    </div>
                    <div className="text-sm mt-2">
                      {resource.type === 'EC2' && resource.specs && (
                        <div>
                          Instance: {resource.specs.instanceType} × {resource.specs.count}
                          {resource.specs.storage && (
                            <span className="block">
                              Storage: {resource.specs.storage.size}GB {resource.specs.storage.type}
                            </span>
                          )}
                        </div>
                      )}
                      {resource.type === 'RDS' && resource.specs && (
                        <div>
                          Class: {resource.specs.instanceClass}
                          <span className="block">
                            Engine: {resource.specs.engine} | Storage: {resource.specs.storage}GB
                          </span>
                        </div>
                      )}
                      {resource.type === 'Lambda' && resource.specs && (
                        <div>
                          Runtime: {resource.specs.runtime}
                          <span className="block">
                            Memory: {resource.specs.memorySize}MB | Timeout: {resource.specs.timeout}s
                          </span>
                        </div>
                      )}
                      {resource.type === 'DynamoDB' && resource.specs && (
                        <div>
                          Billing: {resource.specs.billingMode}
                          {resource.specs.readCapacity && (
                            <span className="block">
                              RCU: {resource.specs.readCapacity} | WCU: {resource.specs.writeCapacity}
                            </span>
                          )}
                        </div>
                      )}
                      {resource.type === 'S3' && resource.specs && (
                        <div>
                          Estimated Storage: {resource.specs.estimatedStorage}GB
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}