"use client"

import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { demoTerraformConfig } from "@/lib/demo-terraform-config"

interface TerraformInputProps {
  value: string
  onChange: (value: string) => void
}

export function TerraformInput({ value, onChange }: TerraformInputProps) {
  const loadDemoConfig = () => {
    onChange(demoTerraformConfig)
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Terraform Configuration</CardTitle>
            <CardDescription>
              Paste your Terraform configuration to estimate AWS costs
            </CardDescription>
          </div>
          <Button onClick={loadDemoConfig} variant="outline" size="sm">
            Load Demo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder={`resource "aws_instance" "example" {
  instance_type = "t3.micro"
  ami           = "ami-0c55b159cbfafe1f0"
  
  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }
}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[400px] max-h-[400px] overflow-y-auto font-mono text-sm resize-none"
        />
      </CardContent>
    </Card>
  )
}