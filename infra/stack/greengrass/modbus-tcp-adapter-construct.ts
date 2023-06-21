import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as gg2 from '@aws-cdk/aws-greengrassv2';

import * as base from '../../../lib/template/construct/base/base-construct';

export interface ConstructProps extends base.ConstructCommonProps {
    bucket: s3.Bucket;
    compConfig: any;
    components: any;
    modbusIP: any;
}

export class ModubsTCPAdapterComponent extends base.BaseConstruct {
    private compName: string;

    constructor(scope: cdk.Construct, id: string, props: ConstructProps) {
        super(scope, id, props);

        this.compName = `${this.projectPrefix}-${props.compConfig['Name']}`;
        
        const receipe: any = this.createRecipe(props.bucket, props.compConfig, props.modbusIP);

        const ggComponent = new gg2.CfnComponentVersion(this, `${this.compName}Comp`, {
            inlineRecipe: JSON.stringify(receipe)
        });
    }

    private createRecipe(bucket: s3.Bucket, compConfig: any, modbusIP: any): any {
        const compVersion = compConfig['Version'];
        const bucketKey = this.commonProps.appConfig.Stack.ComponentUpload.BucketPrefix;

        const recipe: any = {
            "RecipeFormatVersion": "2020-01-25",
            "ComponentName": "aws.greengrass.labs.ModbusTCP",
            "ComponentVersion": "1.0.0",
            "ComponentDescription": "Modbus TCP protocol adapter",
            "ComponentPublisher": "Amazon",
            "ComponentConfiguration": {
                "DefaultConfiguration": {
                    "Modbus": {
                        "Endpoints": [
                          {
                            "Host": "localhost",
                            "Port": 502,
                            "Devices": [
                              {
                                "Name": "thermostat",
                                "UnitId": 0
                              }
                            ]
                          }
                        ]
                    },
                    "accessControl": {
                        "aws.greengrass.ipc.pubsub": {
                          "aws.greengrass.labs.ModbusTCP:pubsub:1": {
                            "policyDescription": "Allows publish to all topics.",
                            "operations": [
                              "aws.greengrass#PublishToTopic"
                            ],
                            "resources": [
                              "*"
                            ]
                          },
                          "aws.greengrass.labs.ModbusTCP:pubsub:2": {
                            "policyDescription": "Allows subscribe to all topics.",
                            "operations": [
                              "aws.greengrass#SubscribeToTopic"
                            ],
                            "resources": [
                              "*"
                            ]
                          }
                        }
                    }
                }
            },
            "Manifests": [
                {
                    "Platform": {
                        "os": "linux"
                    },
                    "Lifecycle": {
                        "Run": {
                            "script": `chmod +x {artifacts:decompressedPath}/${this.compName}/ModbusTCP-1.0.0.jar \n java -jar {artifacts:decompressedPath}/${this.compName}/ModbusTCP-1.0.0.jar`,
                            "RequiresPrivilege": true
                        },
                    },
                    "Artifacts": [
                        {
                            "URI": `s3://${bucket.bucketName}/${bucketKey}/${this.compName}/${compVersion}/${this.compName}.zip`,
                            "Unarchive": "ZIP"
                        }
                    ]
                }
            ]
        };

        return recipe;
    }
}
