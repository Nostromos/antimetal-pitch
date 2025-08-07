import terraformToAWSServiceCode from "./TFtoAWSServiceCodeMap";

export class TerraformParser {
  serviceCodeMap: Record<string, string>;

  constructor() {
    this.serviceCodeMap = terraformToAWSServiceCode;
  }

  parseConfig(terraformContent: string) {
    const resources = [];
    const serviceCodesToGet = new Set();

    const resourceRegex = /resource\s+"([^"]+)"\s+"([^"]+)"\s*{([^}]*)}/g;

    let match;

    while ((match = resourceRegex.exec(terraformContent)) !== null) {
      const type = match[1];
      const name = match[2];
      const body = match[3];

      const code = this.serviceCodeMap[type];
      if (code) {
        serviceCodesToGet.add(code);
      }

      const parsedResource = this.parseByType(type, name, body)
      if (parsedResource) {
        resources.push({
          ...parsedResource,
          serviceCode: code || "Uknown"
        });
      }
    }

    return { resources, serviceCodesToGet: Array.from(serviceCodesToGet)}
  }

  parseByType(type: string, name: string, body: string) {
    switch (type) {
      case 'aws_instance':
        return this.parseEC2Instance(name, body);
      case 'aws_db_instance':
        return this.parseRDSInstance(name, body);
      case 'aws_s3_bucket':
        return this.parseS3Bucket(name);
      case 'aws_lambda_function':
        return this.parseLambdaFunction(name, body);
      case 'aws_dynamodb_table':
        return this.parseDynamoDBTable(name, body);
      // There's gotta be a better/easier way than this but good enough for a prototype
      default:
        return this.parseOtherResource(type, name);
    }
  }

  parseEC2Instance(name: string, body: string) {
    const instanceType = this.parseValue(body, 'instance_type');
    const count = this.parseValue(body, 'count') || '1';
    const ami = this.parseValue(body, 'ami');

    // Extract EBS volumes
    const rootBlockDevice = this.extractBlock(body, 'root_block_device');
    const volumeSize = rootBlockDevice ?
      this.parseValue(rootBlockDevice, 'volume_size') || '8' : '8';
    const volumeType = rootBlockDevice ?
      this.parseValue(rootBlockDevice, 'volume_type') : 'gp2';

    return {
      type: 'EC2',
      name: name,
      resourceType: 'aws_instance',
      specs: {
        instanceType: instanceType,
        count: parseInt(count),
        storage: {
          size: parseInt(volumeSize),
          type: volumeType
        }
      },
      pricingDimensions: {
        'instanceType': instanceType,
        'operatingSystem': this.inferOSFromAMI(ami),
        'preInstalledSw': 'NA',
        'tenancy': 'Shared',
        'licenseModel': 'No License required'
      }
    };
  }

  parseRDSInstance(name: string, body: string) {
    const instanceClass = this.parseValue(body, 'instance_class');
    const engine = this.parseValue(body, 'engine');
    const allocatedStorage = this.parseValue(body, 'allocated_storage');
    const storageType = this.parseValue(body, 'storage_type') || 'gp2';
    const multiAz = this.parseValue(body, 'multi_az') === 'true';

    return {
      type: 'RDS',
      name: name,
      resourceType: 'aws_db_instance',
      specs: {
        instanceClass: instanceClass,
        engine: engine,
        storage: parseInt(allocatedStorage || '0'),
        storageType: storageType,
        multiAz: multiAz
      },
      pricingDimensions: {
        'instanceType': instanceClass,
        'databaseEngine': this.mapRDSEngine(engine),
        'deploymentOption': multiAz ? 'Multi-AZ' : 'Single-AZ',
        'licenseModel': 'No license required'
      }
    };
  }

  parseLambdaFunction(name: string, body: string) {
    const runtime = this.parseValue(body, 'runtime');
    const memorySize = this.parseValue(body, 'memory_size') || '128';
    const timeout = this.parseValue(body, 'timeout') || '3';

    return {
      type: 'Lambda',
      name: name,
      resourceType: 'aws_lambda_function',
      specs: {
        runtime: runtime,
        memorySize: parseInt(memorySize),
        timeout: parseInt(timeout)
      },
      pricingDimensions: {
        'group': 'AWS-Lambda-Requests',
        'groupDescription': 'Invocation call for a Lambda function'
      }
    };
  }

  parseDynamoDBTable(name: string, body: string) {
    const billingMode = this.parseValue(body, 'billing_mode') || 'PROVISIONED';
    const readCapacity = this.parseValue(body, 'read_capacity');
    const writeCapacity = this.parseValue(body, 'write_capacity');

    return {
      type: 'DynamoDB',
      name: name,
      resourceType: 'aws_dynamodb_table',
      specs: {
        billingMode: billingMode,
        readCapacity: readCapacity ? parseInt(readCapacity) : null,
        writeCapacity: writeCapacity ? parseInt(writeCapacity) : null
      },
      pricingDimensions: {
        'group': billingMode === 'PAY_PER_REQUEST' ?
          'DDB-OnDemand' : 'DDB-Provisioned',
        'groupDescription': billingMode === 'PAY_PER_REQUEST' ?
          'DynamoDB On-Demand Capacity' : 'DynamoDB Provisioned Capacity'
      }
    };
  }

  parseS3Bucket(name: string) {
    // pricing based on usage, not declaration
    return {
      type: 'S3',
      name: name,
      resourceType: 'aws_s3_bucket',
      specs: {
        // Would need to estimate storage usage
        estimatedStorage: 100 // GB
      },
      pricingDimensions: {
        'storageClass': 'Standard',
        'volumeType': 'Standard'
      }
    };
  }

  parseOtherResource(type: string, name: string) {
    return {
      type: type.replace('aws_', ''),
      name: name,
      resourceType: type,
      specs: {},
      serviceCode: this.serviceCodeMap[type] || 'Unknown'
    };
  }

  parseValue(text: string, key: string) {
    const regex = new RegExp(`${key}\\s*=\\s*"?([^"\\n]+)"?`);
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  extractBlock(text: string, blockName: string) {
    const regex = new RegExp(`${blockName}\\s*{([^}]*)}`);
    const match = text.match(regex);
    return match ? match[1] : null;
  }

  inferOSFromAMI(ami: string | null) {
    if (!ami) return 'Linux';
    if (ami.includes('windows')) return 'Windows';
    if (ami.includes('rhel')) return 'RHEL';
    if (ami.includes('suse')) return 'SUSE';
    return 'Linux';
  }

  mapRDSEngine(engine: string | null) {
    if (!engine) return 'Unknown';
    const engineMap: Record<string, string> = {
      'postgres': 'PostgreSQL',
      'mysql': 'MySQL',
      'mariadb': 'MariaDB',
      'oracle': 'Oracle',
      'sqlserver': 'SQL Server',
      'aurora': 'Aurora',
      'aurora-mysql': 'Aurora MySQL',
      'aurora-postgresql': 'Aurora PostgreSQL'
    };
    return engineMap[engine] || engine;
  }
}

export default TerraformParser;