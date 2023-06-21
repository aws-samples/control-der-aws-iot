import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cr from '@aws-cdk/custom-resources';
import * as iot from '@aws-cdk/aws-iot';

import * as base from '../../../lib/template/stack/base/base-stack';
import { AppContext } from '../../../lib/template/app-context';
export class ThingInstallerStack extends base.BaseStack {

    constructor(appContext: AppContext, stackConfig: any) {
        super(appContext, stackConfig);
        
        this.exportOutput('ThingGroupName', this.stackConfig.ThingGroupName);
        this.exportOutput('ProjectRegion', this.region);
        
        this.createThingInstallerGroup(this.stackConfig.ThingGroupName);
        this.createIoTRole(appContext.appConfig.Project.RoleName);
        this.createAWSIoTPolicy(appContext.appConfig.Project.IoTRole);
    
    }

    createAWSIoTPolicy(policyName: string) {

        // The code below shows an example of how to instantiate this type.
        // The values are placeholders you should change.
        let policyDocument: any = {
              "Version": "2012-10-17",
              "Statement": [
                {
                  "Effect": "Allow",
                  "Action": [
                    "iot:Connect",
                    "iot:Publish",
                    "iot:Subscribe",
                    "iot:Receive",
                    "iot:ListNamedShadowsForThing",
                    "iot:UpdateThingShadow",
                    "iot:GetThingShadow",
                    "iot:DeleteThingShadow"
                  ],
                  "Resource": [ 
                      "arn:aws:iot:"+this.commonProps.env?.region+":"+this.commonProps.env?.account+":*"
                    ]
                },
                {
                  "Effect": "Allow",
                  "Action": [
                    "greengrass:*"
                  ],
                  "Resource": ["*"]
                }]
          };

        const cfnPolicy = new iot.CfnPolicy(this, 'MyCfnPolicy', {
          policyDocument: policyDocument,
          policyName: policyName,
        });
    }

    private createThingInstallerGroup(groupName: string) {
        const lambdaBaseName: string = 'create-iot-thing-group';
        const lambdaName: string = `${lambdaBaseName}`;

        const lambdaRole = new iam.Role(this, `${lambdaBaseName}Role`, {
            roleName: `${lambdaName}Role`,
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' }
            ]
        });
        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                "iot:CreateThingGroup",
                "iot:DeleteThingGroup"
            ],
            effect: iam.Effect.ALLOW,
            resources: ['arn:aws:iot:'+this.commonProps.env?.region+':'+this.commonProps.env?.account+':*']
        }));

        const func = new lambda.Function(this, lambdaBaseName, {
            functionName: `${lambdaName}Function`,
            code: lambda.Code.fromAsset('./codes/lambda/custom_iot_thing_group/src'),
            handler: 'handler.handle',
            timeout: cdk.Duration.seconds(120),
            runtime: lambda.Runtime.PYTHON_3_9,
            role: lambdaRole,
        });

        const provider = new cr.Provider(this, 'CreateIotGroupProvider', {
            onEventHandler: func
        });

        new cdk.CustomResource(this, `CreateIotGroupCustomResource`, {
            serviceToken: provider.serviceToken,
            properties: {
                ThingGroupName: groupName,
            }
        });
    }

    private createIoTRole(roleName: string) {

        const tokenRole = new iam.Role(this, roleName, {
            roleName: `${roleName}`,
            assumedBy: new iam.ServicePrincipal('credentials.iot.amazonaws.com'),
        });
        tokenRole.addToPolicy(this.createGreengrassV2TokenExchangeRoleAccessPolicy());
        
        tokenRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "s3:GetObject",
                "s3:PutObject",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogStreams"
            ],
            resources: [
                    "arn:aws:s3:::*", 
                    "arn:aws:logs:"+this.commonProps.env?.region+":"+this.commonProps.env?.account+":*"
            ]
        }));

        const tokenRoleAliasName = `${roleName}Alias`;
        const provider = this.createCustomResourceProvider(`${roleName}Provider`);
        new cdk.CustomResource(this, `IoTRoleAliasCustomResource`, {
            serviceToken: provider.serviceToken,
            properties: {
                TokenRoleARN: tokenRole.roleArn,
                IoTRoleAliasName: tokenRoleAliasName
            }
        });

        this.exportOutput('IoTTokenRole', tokenRole.roleName);
        this.exportOutput('IoTTokenRoleAlias', tokenRoleAliasName);
    }

    private createGreengrassV2TokenExchangeRoleAccessPolicy(): iam.PolicyStatement {
        const policy = iam.PolicyStatement.fromJson({
            "Effect": "Allow",
            "Action": [
                "iot:DescribeCertificate",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogStreams",
                "iot:Connect",
                "iot:Publish",
                "iot:Subscribe",
                "iot:Receive",
                "s3:GetBucketLocation",
                "iot:ListNamedShadowsForThing",
                "iot:GetThingShadow",
                "iot:DeleteThingShadow",
                "iot:UpdateThingShadow"
            ],
            "Resource": [
                "arn:aws:logs:"+this.commonProps.env?.region+":"+this.commonProps.env?.account+":*", 
                "arn:aws:iot:"+this.commonProps.env?.region+":"+this.commonProps.env?.account+":*", 
                "arn:aws:s3:::*"
            ]
        });

        return policy;
    }

    private createCustomResourceProvider(lambdaBaseName: string): cr.Provider {
        const lambdaName: string = `${lambdaBaseName}`;

        const lambdaRole = new iam.Role(this, `${lambdaBaseName}Role`, {
            roleName: `${lambdaName}Role`,
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' }
            ]
        });

        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: ["iot:*"],
            effect: iam.Effect.ALLOW,
            resources: ["arn:aws:iot:"+this.commonProps.env?.region+":"+this.commonProps.env?.account+":*"]
        }));

        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: ["iam:*"],
            effect: iam.Effect.ALLOW,
            resources: ["arn:aws:iam::"+this.commonProps.env?.account+":*"]
        }));

        const func = new lambda.Function(this, lambdaBaseName, {
            functionName: `${lambdaName}Function`,
            code: lambda.Code.fromAsset('./codes/lambda/custom_iot_role_alias/src'),
            handler: 'handler.handle',
            timeout: cdk.Duration.seconds(60),
            runtime: lambda.Runtime.PYTHON_3_9,
            role: lambdaRole,
        });

        return new cr.Provider(this, 'IoTRoleAlias', {
            onEventHandler: func
        });
    }
}