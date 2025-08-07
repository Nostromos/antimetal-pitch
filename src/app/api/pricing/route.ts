import { RequestHandler } from "next/dist/server/next";
import { NextRequest, NextResponse } from "next/server";
import { PricingClient, DescribeServicesCommand } from "@aws-sdk/client-pricing";
import type { PricingClientConfig } from "@aws-sdk/client-pricing";


const CONFIG: PricingClientConfig = {
}

export async function GET(request: NextRequest) {
  const input = {
    "FormatVersion": "aws_v1",
    // "MaxResults": "100",
    // "NextToken": "1",
    // "ServiceCode": ""
  }
  const client = new PricingClient(CONFIG);
  const command = new DescribeServicesCommand(input);
  const response = await client.send(command);
  // const readableResponse = await response.json();
  return response;
}