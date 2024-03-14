import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as gg2 from 'aws-cdk-lib/aws-greengrassv2';
import { Construct } from 'constructs';

import * as base from '../../../lib/template/construct/base/base-construct';

export interface ConstructProps extends base.ConstructCommonProps {
    bucket: s3.IBucket;
    compConfig: any;
    components: any;
}

export class ModubsControllerComponent extends base.BaseConstruct {
    private compName: string;
    private thingName: string;

    constructor(scope: Construct, id: string, props: ConstructProps) {
        super(scope, id, props);

        this.compName = `${this.projectPrefix}-${props.compConfig['Name']}`;
        this.thingName = this.commonProps.appConfig.Project.ThingName;

        const receipe: any = this.createRecipe(props.bucket, props.compConfig);
    
        const ggComponent = new gg2.CfnComponentVersion(this, `${this.compName}Comp`, {
            inlineRecipe: JSON.stringify(receipe)
        });
    }

    private createRecipe(bucket: s3.IBucket, compConfig: any): any {
        const compVersion = compConfig['Version'];
        const bucketKey = this.commonProps.appConfig.Stack.ComponentUpload.BucketPrefix;

        const recipe: any = {
            "RecipeFormatVersion": "2020-01-25",
            "ComponentName": "aws.greengrass.derms.demo.ModbusController",
            "ComponentVersion": "1.0.0",
            "ComponentDescription": "Modbus TCP protocol adapter",
            "ComponentPublisher": "Amazon",
            "ComponentConfiguration": {
                "DefaultConfiguration": {
                    "Modbus": {
                        "Devices": [
                          {
                            "Name": "thermostat",
                            "ShadowName": ""
                          }]
                    },
                    "accessControl": {
                        "aws.greengrass.ipc.pubsub": {
                              "aws.greengrass.derms.demo.ModbusController:pubsub:1": {
                                "policyDescription": "Allows publish to all topics.",
                                "operations": [
                                  "aws.greengrass#PublishToTopic"
                                ],
                                "resources": [
                                  "*"
                                ]
                            },
                            "aws.greengrass.derms.demo.ModbusController:pubsub:2": {
                                "policyDescription": "Allows subscribe to all topics.",
                                "operations": [
                                  "aws.greengrass#SubscribeToTopic"
                                ],
                                "resources": [
                                  "*"
                                ]
                            }
                        },
                        "aws.greengrass.ShadowManager": {
                        "aws.greengrass.derms.demo.ModbusController:ShadowManager:3": {
                            "policyDescription": "Allows manage shadows to all resources.  ",
                            "operations": [
                              "aws.greengrass#GetThingShadow",
                              "aws.greengrass#UpdateThingShadow"
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
                            "script": `python3 -m pip install awsiotsdk \n chmod +xw {artifacts:decompressedPath}/${this.compName}/controller.py \n sed -i 's/thing_name_placeholder/${this.thingName}/' {artifacts:decompressedPath}/${this.compName}/controller.py \n python3 -u {artifacts:decompressedPath}/${this.compName}/controller.py`,
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