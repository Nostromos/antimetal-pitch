"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { TerraformInput } from "@/components/terraform-input"
import { ParsedResources } from "@/components/parsed-resources"
import { CostRecommendations } from "@/components/cost-recommendations"
import { CostBreakdown } from "@/components/cost-breakdown"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { TerraformParser } from "@/lib/terraformParser"

export default function Page() {
  const [terraformConfig, setTerraformConfig] = useState("")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [parsedResources, setParsedResources] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [costData, setCostData] = useState<any>(null)
  const [loadingCosts, setLoadingCosts] = useState(false)
  const [costError, setCostError] = useState<string | null>(null)
  const parser = new TerraformParser()

  useEffect(() => {
    if (terraformConfig) {
      try {
        const { resources } = parser.parseConfig(terraformConfig)
        setParsedResources(resources)
      } catch (error) {
        console.error('Error parsing Terraform config:', error)
        setParsedResources([])
      }
    } else {
      setParsedResources([])
      setCostData(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terraformConfig])

  // Fetch pricing when resources change
  useEffect(() => {
    const fetchPricing = async () => {
      if (parsedResources.length === 0) {
        setCostData(null)
        return
      }

      setLoadingCosts(true)
      setCostError(null)

      try {
        const response = await fetch('/api/pricing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resources: parsedResources,
            region: 'us-east-1'
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch pricing: ${response.statusText}`)
        }

        const data = await response.json()
        setCostData(data)
      } catch (error) {
        console.error('Error fetching pricing:', error)
        setCostError(error instanceof Error ? error.message : 'Failed to fetch pricing data')
      } finally {
        setLoadingCosts(false)
      }
    }

    fetchPricing()
  }, [parsedResources])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 lg:p-6">
            {/* Top half: Input and Parsed Resources side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[500px]">
              <TerraformInput 
                value={terraformConfig}
                onChange={setTerraformConfig}
              />
              <ParsedResources resources={parsedResources} />
            </div>
            
            {/* Middle: Cost Breakdown */}
            <CostBreakdown 
              loading={loadingCosts}
              error={costError || undefined}
              data={costData}
            />
            
            {/* Bottom: Recommendations */}
            <CostRecommendations resources={parsedResources} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
