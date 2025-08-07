import { NextRequest, NextResponse } from "next/server";
import { 
  PricingClient, 
  GetProductsCommand,
  type GetProductsCommandInput,
  type PricingClientConfig,
  type Filter 
} from "@aws-sdk/client-pricing";

const CONFIG: PricingClientConfig = {
  region: 'us-east-1', // Pricing API is only available in us-east-1
}

interface ResourceSpecs {
  instanceType?: string;
  instanceClass?: string;
  count?: number;
  storage?: {
    size: number;
    type?: string;
  };
  allocatedStorage?: number;
  estimatedStorage?: number;
  engine?: string;
  multiAz?: boolean;
  memorySize?: number;
  runtime?: string;
}

interface ParsedResource {
  type: string;
  name: string;
  resourceType: string;
  specs: ResourceSpecs;
  serviceCode: string;
  pricingDimensions?: Record<string, unknown>;
}

export async function GET() {
  try {
    // Simple test endpoint
    return NextResponse.json({ status: 'ok', message: 'Pricing API is ready' });
  } catch (error) {
    console.error('Pricing API Route Error:', error);
    return NextResponse.json({ error: 'Failed to initialize pricing client', details: error }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { resources, region = 'us-east-1' } = await request.json();
    
    if (!resources || !Array.isArray(resources)) {
      return NextResponse.json({ error: 'Invalid request: resources array required' }, { status: 400 });
    }

    const client = new PricingClient(CONFIG);
    const pricingData = [];

    for (const resource of resources) {
      try {
        const pricing = await fetchResourcePricing(client, resource, region);
        pricingData.push({
          resourceName: resource.name,
          resourceType: resource.type,
          pricing
        });
      } catch (error) {
        console.error(`Error fetching pricing for ${resource.name}:`, error);
        pricingData.push({
          resourceName: resource.name,
          resourceType: resource.type,
          pricing: { error: 'Unable to fetch pricing', hourly: 0, monthly: 0, yearly: 0 }
        });
      }
    }

    const totalCosts = calculateTotalCosts(pricingData);

    return NextResponse.json({
      resources: pricingData,
      total: totalCosts,
      region,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Pricing API Route Error:', error);
    return NextResponse.json({ error: 'Failed to fetch pricing data', details: error }, { status: 500 });
  }
}

async function fetchResourcePricing(
  client: PricingClient, 
  resource: ParsedResource, 
  region: string
) {
  const filters = buildPricingFilters(resource, region);
  
  if (!filters || filters.length === 0) {
    return { hourly: 0, monthly: 0, yearly: 0, message: 'No pricing filters available' };
  }

  const input: GetProductsCommandInput = {
    ServiceCode: resource.serviceCode,
    Filters: filters,
    FormatVersion: 'aws_v1',
    MaxResults: 1,
  };

  const command = new GetProductsCommand(input);
  const response = await client.send(command);

  if (!response.PriceList || response.PriceList.length === 0) {
    return { hourly: 0, monthly: 0, yearly: 0, message: 'No pricing data found' };
  }

  const priceData = JSON.parse(response.PriceList[0]);
  return calculateResourceCost(priceData, resource);
}

function buildPricingFilters(resource: ParsedResource, region: string): Filter[] {
  const filters: Filter[] = [
    {
      Type: 'TERM_MATCH' as const,
      Field: 'location',
      Value: getRegionName(region)
    }
  ];

  switch (resource.type) {
    case 'EC2':
      if (resource.specs?.instanceType) {
        filters.push({
          Type: 'TERM_MATCH' as const,
          Field: 'instanceType',
          Value: resource.specs.instanceType
        });
      }
      filters.push({
        Type: 'TERM_MATCH' as const,
        Field: 'tenancy',
        Value: 'Shared'
      });
      filters.push({
        Type: 'TERM_MATCH' as const,
        Field: 'operatingSystem',
        Value: 'Linux'
      });
      filters.push({
        Type: 'TERM_MATCH' as const,
        Field: 'preInstalledSw',
        Value: 'NA'
      });
      filters.push({
        Type: 'TERM_MATCH' as const,
        Field: 'capacitystatus',
        Value: 'Used'
      });
      break;

    case 'RDS':
      if (resource.specs?.instanceClass) {
        filters.push({
          Type: 'TERM_MATCH' as const,
          Field: 'instanceType',
          Value: resource.specs.instanceClass
        });
      }
      if (resource.specs?.engine) {
        filters.push({
          Type: 'TERM_MATCH' as const,
          Field: 'databaseEngine',
          Value: mapRDSEngine(resource.specs.engine)
        });
      }
      filters.push({
        Type: 'TERM_MATCH' as const,
        Field: 'deploymentOption',
        Value: resource.specs?.multiAz ? 'Multi-AZ' : 'Single-AZ'
      });
      break;

    case 'Lambda':
      // Lambda pricing is based on requests and compute time
      filters.push({
        Type: 'TERM_MATCH' as const,
        Field: 'group',
        Value: 'AWS-Lambda-Requests'
      });
      break;

    case 'S3':
      filters.push({
        Type: 'TERM_MATCH' as const,
        Field: 'storageClass',
        Value: 'General Purpose'
      });
      filters.push({
        Type: 'TERM_MATCH' as const,
        Field: 'volumeType',
        Value: 'Standard'
      });
      break;

    case 'DynamoDB':
      filters.push({
        Type: 'TERM_MATCH' as const,
        Field: 'group',
        Value: 'DDB-WriteUnits'
      });
      break;
  }

  return filters;
}

interface PriceData {
  terms?: {
    OnDemand?: Record<string, {
      priceDimensions?: Record<string, {
        pricePerUnit?: { USD?: string };
        unit?: string;
      }>;
    }>;
  };
}

function calculateResourceCost(priceData: PriceData, resource: ParsedResource) {
  try {
    const terms = priceData.terms?.OnDemand;
    if (!terms) {
      return { hourly: 0, monthly: 0, yearly: 0, message: 'No on-demand pricing found' };
    }

    // Get the first pricing term
    const termKey = Object.keys(terms)[0];
    const priceDimensions = terms[termKey]?.priceDimensions;
    
    if (!priceDimensions) {
      return { hourly: 0, monthly: 0, yearly: 0, message: 'No price dimensions found' };
    }

    // Get the first price dimension
    const dimensionKey = Object.keys(priceDimensions)[0];
    const pricePerUnit = parseFloat(priceDimensions[dimensionKey]?.pricePerUnit?.USD || '0');
    const unit = priceDimensions[dimensionKey]?.unit || 'Hrs';

    let hourlyRate = 0;

    // Calculate based on unit type
    if (unit === 'Hrs' || unit === 'Hrs') {
      hourlyRate = pricePerUnit;
    } else if (unit === 'GB-Mo') {
      // For storage, convert GB-month to hourly
      const storageSize = resource.specs?.storage?.size || 
                         resource.specs?.allocatedStorage || 
                         resource.specs?.estimatedStorage || 0;
      hourlyRate = (pricePerUnit * storageSize) / 730; // Average hours in month
    } else if (unit === 'Requests') {
      // For Lambda, estimate based on expected requests
      const estimatedRequests = 1000000; // 1M requests per month as default
      hourlyRate = (pricePerUnit * estimatedRequests) / 730;
    }

    // Multiply by count if applicable
    const count = resource.specs?.count || 1;
    hourlyRate *= count;

    return {
      hourly: Math.round(hourlyRate * 100) / 100,
      monthly: Math.round(hourlyRate * 730 * 100) / 100,
      yearly: Math.round(hourlyRate * 8760 * 100) / 100,
      unit,
      pricePerUnit
    };
  } catch (error) {
    console.error('Error calculating cost:', error);
    return { hourly: 0, monthly: 0, yearly: 0, error: 'Calculation error' };
  }
}

interface PricingDataItem {
  resourceName: string;
  resourceType: string;
  pricing: {
    hourly?: number;
    monthly?: number;
    yearly?: number;
    error?: string;
  };
}

function calculateTotalCosts(pricingData: PricingDataItem[]) {
  const totals = pricingData.reduce((acc, item) => {
    if (item.pricing && !item.pricing.error) {
      acc.hourly += item.pricing.hourly || 0;
      acc.monthly += item.pricing.monthly || 0;
      acc.yearly += item.pricing.yearly || 0;
    }
    return acc;
  }, { hourly: 0, monthly: 0, yearly: 0 });

  return {
    hourly: Math.round(totals.hourly * 100) / 100,
    monthly: Math.round(totals.monthly * 100) / 100,
    yearly: Math.round(totals.yearly * 100) / 100
  };
}

function getRegionName(region: string): string {
  const regionMap: Record<string, string> = {
    'us-east-1': 'US East (N. Virginia)',
    'us-east-2': 'US East (Ohio)',
    'us-west-1': 'US West (N. California)',
    'us-west-2': 'US West (Oregon)',
    'eu-west-1': 'EU (Ireland)',
    'eu-central-1': 'EU (Frankfurt)',
    'ap-southeast-1': 'Asia Pacific (Singapore)',
    'ap-northeast-1': 'Asia Pacific (Tokyo)',
  };
  return regionMap[region] || 'US East (N. Virginia)';
}

function mapRDSEngine(engine: string): string {
  const engineMap: Record<string, string> = {
    'mysql': 'MySQL',
    'postgres': 'PostgreSQL',
    'mariadb': 'MariaDB',
    'aurora': 'Aurora MySQL',
    'aurora-mysql': 'Aurora MySQL',
    'aurora-postgresql': 'Aurora PostgreSQL',
  };
  return engineMap[engine] || engine;
}