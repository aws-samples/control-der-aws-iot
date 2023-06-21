import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cr from '@aws-cdk/custom-resources';
import * as s3 from '@aws-cdk/aws-s3';

import * as base from '../../../lib/template/stack/base/base-stack';
import { AppContext } from '../../../lib/template/app-context';
import { EC2CommonStack } from '../common/ec2-common-stack'

import * as public_comp from './public-component-template';
import * as modbus_tcp from './modbus-tcp-adapter-construct';
import * as modbus_controller from './modbus-controller-construct';


export class ComponentDeploymentStack extends base.BaseStack {
    
    constructor(appContext: AppContext, stackConfig: any, commonStack: EC2CommonStack) {
        super(appContext, stackConfig);
        
        const components: any = {};
        const uploadBucket = commonStack.uploadBucket;

        if(appContext.stackCommonProps) {

            new modbus_tcp.ModubsTCPAdapterComponent(this, stackConfig.ModbusTCPAdapter.Name, {
                projectPrefix: this.projectPrefix,
                appConfig: this.commonProps.appConfig,
                appConfigPath: this.commonProps.appConfigPath,
                stackConfig: this.stackConfig,
                account: this.account,
                region: this.region,
                modbusIP: "localhost",
                
                bucket: uploadBucket,
                compConfig: stackConfig.ModbusTCPAdapter,
                components: components
            })
            new modbus_controller.ModubsControllerComponent(this, stackConfig.ModbusController.Name, {
                projectPrefix: this.projectPrefix,
                appConfig: this.commonProps.appConfig,
                appConfigPath: this.commonProps.appConfigPath,
                stackConfig: this.stackConfig,
                account: this.account,
                region: this.region,

                bucket: uploadBucket,
                compConfig: stackConfig.ModbusController,
                components: components
            })
        } else {

            console.error("Could not create ModbusTCPAdapter due to target simulator IP not present in config");
        }
        
        this.createPublicComponents(components, stackConfig.PublicComponents);

        this.createPrivateComponents(components,stackConfig);
    }

    private createPublicComponents(components: any, publicCompList: any[]) {

        publicCompList.forEach(item => new public_comp.PublicComponentTemplate(components, {
            componentName: item.Name,
            componentVersion: item.Version,
            configurationUpdate: item.ConfigurationUpdate
        }));
    }

    private createPrivateComponents(components: any, stackConfig: any) {
        
        components[`${stackConfig.ModbusTCPAdapter.Name}`] = {
            componentVersion: stackConfig.ModbusTCPAdapter.Version,
            configurationUpdate: {
                merge: JSON.stringify(stackConfig.ModbusTCPAdapter.ComponentConfiguration)
            }
        };
 
        components[`${stackConfig.ModbusController.Name}`] = {
            componentVersion: stackConfig.ModbusController.Version
        };

        const deploymentName = this.projectPrefix;
        const thingGroupName = this.commonProps.appConfig.Stack.ThingInstaller.ThingGroupName;
        const thingTargetArn = `arn:aws:iot:${this.region}:${this.account}:thinggroup/${thingGroupName}`

        const name = 'ComponentDeploymnet';
        const provider = this.createComponentDeploymentProvider(`${name}ProviderLambda`);
        new cdk.CustomResource(this, `ComponentDeploymnetCustomResource`, {
            serviceToken: provider.serviceToken,
            properties: {
                TARGET_ARN: thingTargetArn,
                DEPLOYMENT_NAME: deploymentName,
                COMPONENTS: JSON.stringify(components)
            }
        });
    }

    private createComponentDeploymentProvider(lambdaBaseName: string): cr.Provider {
        const lambdaName: string = `${this.projectPrefix}-${lambdaBaseName}`;

        const lambdaRole = new iam.Role(this, `${lambdaBaseName}Role`, {
            roleName: `${lambdaName}Role`,
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' }
            ]
        });

        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                "iot:*",
                "greengrass:*"
            ],
            effect: iam.Effect.ALLOW,
            resources: [
                "arn:aws:iot:"+this.commonProps.env?.region+":"+this.commonProps.env?.account+":*", 
                "arn:aws:greengrass:"+this.commonProps.env?.region+":"+this.commonProps.env?.account+":*"
            ]
        }));

        const func = new lambda.Function(this, lambdaBaseName, {
            functionName: `${lambdaName}Function`,
            code: lambda.Code.fromAsset('./codes/lambda/custom_gg_comp_deploy/src'),
            handler: 'handler.handle',
            timeout: cdk.Duration.seconds(600),
            runtime: lambda.Runtime.PYTHON_3_9,
            role: lambdaRole,
        });

        return new cr.Provider(this, 'GreengrassCompDeploy', {
            onEventHandler: func
        });
    }
}