import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { readFileSync } from 'fs';

import * as base from '../../../lib/template/stack/base/base-stack';
import { AppContext } from '../../../lib/template/app-context';
import { EC2CommonStack } from '../common/ec2-common-stack';

export class ThermostatStack extends base.BaseStack {
  
  constructor(appContext: AppContext, stackConfig: any, commonStack: EC2CommonStack) {

    super(appContext, stackConfig);

    /* Creation of the VPC to host the AWS resources */
    let vpc: ec2.Vpc = commonStack.vpc;
    
    /* Creation of the role for both ASGs */
    let gwSG: ec2.ISecurityGroup = this.getEC2SG(vpc);
    
    /* Creation of the role for the EC2s to access required services */
    let ec2Role: iam.Role = this.getEC2Role();
    
    let iotTempRole: iam.Role = this.createCredential(ec2Role);
    
    this.enableAssumeRole(iotTempRole, ec2Role);

    let bucket = commonStack.uploadBucket;
   
    this.uploadBinaryToS3(bucket, stackConfig);

    commonStack.gwEC2 = this.provisionEC2Node(vpc, gwSG, ec2Role, appContext);
  }
  
  /* Enable the traffic from the the Master to the simulator in order to read via Modbus */
  private openSGFromThermostatToModbus(modbusSG: ec2.ISecurityGroup, gwSG: ec2.ISecurityGroup, modbusPort: number){

    modbusSG.addIngressRule(gwSG,ec2.Port.tcp(modbusPort), "Read modbus simulator from GG master");
  }

  private enableAssumeRole(iotRole: iam.Role, ec2Role: iam.Role){
    
    let customPolicyDoc = new iam.Policy(this, 'iam-ec2-iot-policy', {
        statements: [new iam.PolicyStatement({
          actions: ["sts:AssumeRole"],
          resources: [iotRole.roleArn],
        })],
      });
      
      ec2Role.attachInlinePolicy(customPolicyDoc);
  }

  private getEC2SG(vpc: ec2.Vpc) {

    let primarySG: ec2.SecurityGroup = new ec2.SecurityGroup(this, "sg-ec2-derms", {
      securityGroupName: "ec2-derms-gw",
      vpc: vpc
    });

    return primarySG;
  }

  private getEC2Role() {

    // Setting the list of the policies necessary to enable the EC2 to work
    let managedPolicies: iam.IManagedPolicy[] = [
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3ReadOnlyAccess")
    ];
    
    // Role to be assumed by EC2 instances
    let assumedBy: iam.IPrincipal = new iam.ServicePrincipal("ec2.amazonaws.com");
  
    // Setting the role for the EC2 that are going to spawn
    let ec2Role: iam.Role = new iam.Role(this, "derms-cluster-ec2-role", {
      managedPolicies: managedPolicies,
      assumedBy: assumedBy
    });
  
    return ec2Role;
  }
 
  private createInstallerTempRole(provisionStatement: iam.PolicyStatement, devEnvStatement: iam.PolicyStatement, provisionStarredStatement: iam.PolicyStatement, roleName: string, ec2Role: iam.Role) {
      const tempRole = new iam.Role(this, roleName, {
          roleName: `${this.projectPrefix}-${roleName}`,
          assumedBy: new iam.ArnPrincipal(ec2Role.roleArn)
      });

      tempRole.addToPolicy(provisionStatement);
      tempRole.addToPolicy(devEnvStatement);
      tempRole.addToPolicy(provisionStarredStatement);

      this.exportOutput('InstallerTempRoleARN', tempRole.roleArn)
      
      return tempRole;
  }

  // https://docs.aws.amazon.com/greengrass/v2/developerguide/provision-minimal-iam-policy.html
  private createThingInstallerProvisionPolicy(): iam.PolicyStatement {
      const statement = {
          "Effect": "Allow",
          "Action": [
              "iot:AddThingToThingGroup",
              "iot:AttachPolicy",
              "iot:CreatePolicy",
              "iot:CreateRoleAlias",
              "iot:CreateThing",
              "iot:DescribeRoleAlias",
              "iot:DescribeThingGroup",
              "iot:GetPolicy",
              "iam:GetRole",
              "iam:CreateRole",
              "iam:PassRole",
              "iam:CreatePolicy",
              "iam:AttachRolePolicy",
              "iam:GetPolicy"
          ],
          "Resource": [
            "arn:aws:iam::"+this.commonProps.env?.account+":*", 
            "arn:aws:iot:"+this.commonProps.env?.region+":"+this.commonProps.env?.account+":*"
          ]
      };

      return iam.PolicyStatement.fromJson(statement);
  }

  // https://docs.aws.amazon.com/greengrass/v2/developerguide/provision-minimal-iam-policy.html
  private createThingStarredProvisionPolicy(): iam.PolicyStatement {
      const statement = {
          "Effect": "Allow",
          "Action": [
              "iot:AttachThingPrincipal",
              "iot:CreateKeysAndCertificate",
              "iot:DescribeEndpoint",
              "iot:GetPolicy",
              "sts:GetCallerIdentity"
          ],
          "Resource": [
            "*"
          ]
      };

      return iam.PolicyStatement.fromJson(statement);
  }

  private createThingInstallerDevEnvPolicy(): iam.PolicyStatement {
      const statement = {
          "Sid": "DeployDevTools",
          "Effect": "Allow",
          "Action": [
              "greengrass:CreateDeployment",
              "iot:CancelJob",
              "iot:CreateJob",
              "iot:DeleteThingShadow",
              "iot:DescribeJob",
              "iot:DescribeThing",
              "iot:DescribeThingGroup",
              "iot:GetThingShadow",
              "iot:UpdateJob",
              "iot:UpdateThingShadow"
          ],
          "Resource": [
            "arn:aws:iot:"+this.commonProps.env?.region+":"+this.commonProps.env?.account+":*", 
            "arn:aws:greengrass:"+this.commonProps.env?.region+":"+this.commonProps.env?.account+":*"
          ]
      };

      return iam.PolicyStatement.fromJson(statement);
  }

  private createCredential(ec2Role: iam.Role) {

      const thingProvisionPolicyStatement = this.createThingInstallerProvisionPolicy();
      const thingDevEnvPolicyStatement = this.createThingInstallerDevEnvPolicy();
      const thingStarredProvisionPolicyStatement = this.createThingStarredProvisionPolicy();

      const tempRoleName = this.stackConfig.TempCredential.TempSetupRoleName;
      return this.createInstallerTempRole(thingProvisionPolicyStatement, thingDevEnvPolicyStatement,thingStarredProvisionPolicyStatement, tempRoleName, ec2Role);
  }

  /* Subnet selection for the cluster, this statement selects all the private subnets of all AZs in the region */
  private getPrimarySubnets() {

    let privateSubnets: ec2.SubnetSelection = { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS };
    return privateSubnets;
  }

  /* Read the local file at run time */
  private getBootScript(appContext: AppContext) {

    //Initialize variables for the boot script
    let thingGroup = appContext.appConfig.Stack.ThingInstaller.ThingGroupName;
    let thingName = appContext.appConfig.Project.ThingName;
    let roleAlias = appContext.appConfig.Project.RoleName+"Alias";
    let roleName = appContext.appConfig.Project.RoleName;
    let iotRole = appContext.appConfig.Project.IoTRole;
  
    //Build addition to the boot script with the config values
    let header="#!/bin/bash\n"
    let variables="THING_NAME="+thingName+"\n"
    variables=variables+"THING_GROUP="+thingGroup+"\n"
    variables=variables+"ROLE_ALIAS_NAME="+roleAlias+"\n"
    variables=variables+"ROLE_NAME="+roleName+"\n"
    variables=variables+"IOT_ROLE="+iotRole+"\n"
    
    let bootFile: string = readFileSync('./script/thing/ec2-ggv2-boot.txt', 'utf-8');
    let result = header+variables+bootFile

    return result;
  }

  private provisionEC2Node(vpc: ec2.Vpc, sg: ec2.ISecurityGroup, role: iam.Role, appContext: AppContext) {

    // Fetch user data for primary asg
    let primaryUserData: ec2.UserData = ec2.UserData.custom(this.getBootScript(appContext));

    return new ec2.Instance(this, "derms-ggv2-thermostat", {
      vpc: vpc,
      vpcSubnets: this.getPrimarySubnets(),
      instanceName: "derms-ggv2-thermostat",
      role: role,
      userData: primaryUserData,
      machineImage: this.getPrimaryAMI(),
      securityGroup: sg,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MEDIUM)
    });
  }
  
  private getPrimaryAMI() {

    // Setup properties of the primary cluster AMIs
    let primaryAMI: ec2.IMachineImage = new ec2.AmazonLinuxImage({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2 })

    return primaryAMI;
  }

  private uploadBinaryToS3(bucket: s3.Bucket, stackConfig: any) {

    let compName = this.commonProps.appConfig.Stack.Thermostat.Name;
    new s3deploy.BucketDeployment(this, "upload-simulator-binary", {
        sources: [s3deploy.Source.asset(this.commonProps.appConfig.Stack.Thermostat.BinaryPath)],
        destinationBucket: bucket,
        destinationKeyPrefix: `${stackConfig.BucketPrefix}/${compName}`
    });
    
    //save destination prefix for the ec2 to use it
    new ssm.StringParameter(this, 'modbusSimulatorPath', {
      description: 'S3 path for the application simulator',
      parameterName: 'modbusSimulatorPath',
      stringValue: `s3://${bucket.bucketName}/${stackConfig.BucketPrefix}/${compName}/diagslave.tgz`,
    });
}
}