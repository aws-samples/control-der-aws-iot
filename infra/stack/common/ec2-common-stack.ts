import * as ec2 from "@aws-cdk/aws-ec2";
import * as s3 from '@aws-cdk/aws-s3';

import * as base from '../../../lib/template/stack/base/base-stack';
import { AppContext } from '../../../lib/template/app-context';


export class EC2CommonStack extends base.BaseStack {
  public uploadBucket: s3.Bucket;
  public vpc: ec2.Vpc;

  /* We need to open the traffic from the Greengrass EC2 to the Modbus simulator */
  public gwEC2: ec2.Instance;
  
  constructor(appContext: AppContext, stackConfig: any) {

    super(appContext, stackConfig);

    /* Creation of the VPC to host the AWS resources */
    this.vpc = this.provisionVPC();
  }

  private provisionVPC() {

    // Public network group
    let publicSubnet: ec2.SubnetConfiguration = {
      cidrMask: 24,
      name: "derms_public",
      reserved: false, 
      subnetType: ec2.SubnetType.PUBLIC
    };

    // Private network group
    let privateSubnet: ec2.SubnetConfiguration = {
      cidrMask: 24,
      name: "derms_private",
      reserved: false,
      subnetType: ec2.SubnetType.PRIVATE_WITH_NAT
    };

    // Configuring networks to add to the VPC
    let subnetConfigs: ec2.SubnetConfiguration[] = [publicSubnet, privateSubnet];

    /* Create VPC with the configured networks */
    let vpc: ec2.Vpc = new ec2.Vpc(this, "derms_vpc", {
      cidr: "10.1.0.0/20",
      maxAzs: 3,
      subnetConfiguration: subnetConfigs
    });
 
    return vpc;
  }
  
}