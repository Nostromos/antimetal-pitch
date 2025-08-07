<p align="center">
  <img src="./public/terraform-aws.avif" alt="Logos for Terraform and AWS on a dark background" />
</p>
<h1 align="center"><i>Terraform AWS Cost Estimator</i></h1>

<p align="center">
  <a>
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  </a>
  <a>
    <img alt="React" src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  </a>
  <a>
    <img alt="TypeScript" src="https://shields.io/badge/TypeScript-3178C6?logo=TypeScript&logoColor=FFF&style=for-the-badge" />
  </a> 
  <a>
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  </a>
  <a>
    <img alt="AWS" src="https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white" />
  </a>
</p>

## Overview

>[!TIP]
> In the demo site, click the Load Demo button to automatically paste in a sample tf config.

This is a very quick feature prototype I put together for an application to a really cool company I'd love to work for. I know they have a cost optimization feature but I needed something I could do in less than 24 hours and possibly integrate into the IDE. I ended up building a very simple Terraform parser that takes configs, parses out resources, hits the AWS Pricing API, and returns rough cost (assuming 730 hours / month). 

If I had time, there are many many filters I'd add into this - region, timing, estimated storage needs, data flows, etc. So many things go into infra pricing that its a bit Quixotic to try and account for it all, but there are high-impact things you can surface for users: historical pricing, how config changes affect cost over time, assumptions baked into *THEIR* config files (show them assumptions they might not have thought about), cutting through complexity of AWS services, etc.

The optimizations feature uses pre-written recommendations but as I'm sure you figured out when building your own feature, you can do things like see what's on a savings plan and what isn't, then offer RIs for non-savings plan resources. I didn't even get into bidding on spot instances but there are lots of savings to be had there. 

Another important thing to note - I did very little of the UI tweaking for this (it's almost entirely shadcn) and had Claude generate a lot of the sample data and things like the Terraform to AWS service map. I wrote quite a bit of the parser and API myself but had claude do the tedious things. 

## Features

- **Real-time Terraform Parsing** - Instantly parse and analyze Terraform configurations
- **AWS Cost Estimation** - Get accurate cost estimates using AWS Pricing API
- **Smart Recommendations** - Receive intelligent cost optimization suggestions
- **Multi-Resource Support** - Handles EC2, RDS, S3, Lambda, DynamoDB, ElastiCache, and more
- **Visual Cost Breakdown** - See hourly, monthly, and yearly cost projections
- **Modern UI** - Built with Next.js 15, React 19, and shadcn/ui components

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Nostromos/terraform-cost-estimator
cd terraform-cost-estimator

# Install dependencies
npm install

# Set up AWS credentials (optional, for pricing API)
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Usage

1. **Paste or Load Terraform Configuration**
   - Paste your Terraform configuration in the text area
   - Or click "Load Demo" to see a sample configuration

2. **View Parsed Resources**
   - See all detected AWS resources with their specifications
   - Supports EC2, RDS, S3, Lambda, DynamoDB, and more

3. **Review Cost Estimates**
   - Get instant cost breakdowns per resource
   - View total costs in hourly, monthly, and yearly formats
   - Based on AWS on-demand pricing

4. **Optimize Your Infrastructure**
   - Receive tailored optimization recommendations
   - See potential savings percentages
   - Learn about Reserved Instances, Spot pricing, and more

## Project Structure

```
src/
├── app/                         # Next.js App Router
│   ├── api/                     # API routes
│   │   └── pricing/             # AWS Pricing API integration
│   ├── globals.css              # Global styles
│   └── page.tsx                 # Main application page
├── components/                  # React components
│   ├── ui/                      # shadcn/ui components
│   ├── terraform-input.tsx      # Terraform config input
│   ├── parsed-resources.tsx     # Resource display
│   ├── cost-breakdown.tsx       # Cost visualization
│   └── cost-recommendations.tsx # Optimization suggestions
└── lib/                         # Core logic
    ├── terraformParser.ts       # Terraform HCL parser
    ├── TFtoAWSServiceCodeMap.ts # Resource mapping
    └── demo-terraform-config.ts # Demo configuration
```

## Supported AWS Resources

- **Compute**: EC2 instances, Auto Scaling Groups, Lambda functions
- **Storage**: S3 buckets, EBS volumes, EFS file systems
- **Database**: RDS instances, DynamoDB tables, ElastiCache clusters
- **Networking**: Load Balancers, NAT Gateways, CloudFront distributions
- **Container**: ECS services, Fargate tasks
- **Analytics**: OpenSearch domains
- **Messaging**: SQS queues

## Cost Optimization Recommendations

The tool provides intelligent recommendations across multiple categories:

### Instance Optimization
- Upgrade from t2 to t3 instances
- Switch to ARM-based Graviton instances (up to 40% savings)
- Right-sizing recommendations
- Spot instances for fault-tolerant workloads

### Storage Optimization  
- Migrate from gp2 to gp3 EBS volumes (20% savings)
- S3 Intelligent-Tiering and lifecycle policies
- Glacier for backup data (up to 95% savings)

### Database Optimization
- Aurora Serverless v2 for variable workloads
- RDS storage auto-scaling
- Reserved Instances (up to 69% savings)
- DynamoDB on-demand vs provisioned capacity

### Network & Compute
- NAT Instance vs NAT Gateway comparison
- CloudFront caching strategies
- Fargate Spot for ECS tasks
- Lambda memory optimization

## Tech Stack

- **Framework**: Next.js 15.4.6 with App Router
- **UI**: React 19.1.0 with TypeScript 5
- **Styling**: Tailwind CSS v4 with shadcn/ui
- **AWS Integration**: AWS SDK for JavaScript v3
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React and Tabler Icons

## Development

```bash
# Run development server
npm run dev

# Build for production  
npm run build

# Run production server
npm start

# Run linting
npm run lint
```

## Limitations & Future Improvements

### Current Limitations
- Pricing is based on us-east-1 region (configurable in code)
- Uses on-demand pricing only (Reserved/Spot pricing in recommendations)
- Assumes 730 hours/month for all resources
- Data transfer costs not included
- Basic Terraform parsing (complex expressions not fully supported)

### Potential Enhancements
- Historical pricing trends
- Multi-region support
- Terraform state file integration
- Cost comparison between configurations
- Export reports to PDF/CSV
- Integration with AWS Cost Explorer
- Support for other IaC tools (CloudFormation, Pulumi)