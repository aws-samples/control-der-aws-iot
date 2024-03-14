import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

import * as base from '../../../lib/template/stack/base/base-stack';
import { AppContext } from '../../../lib/template/app-context';
import { EC2CommonStack } from '../common/ec2-common-stack'

export class ComponentUploadStack extends base.BaseStack {
    
    constructor(appContext: AppContext, stackConfig: any, commonStack: EC2CommonStack) {
        super(appContext, stackConfig);

        let bucket : s3.Bucket = this.createS3Bucket(this.stackConfig.BucketName);
        commonStack.uploadBucket=bucket;

        const componentConfig: any = this.commonProps.appConfig.Stack['ComponentDeployment']
        
        let compName = `${this.projectPrefix}-${componentConfig['ModbusTCPAdapter']['Name']}`;
        let compVersion = componentConfig['ModbusTCPAdapter']['Version'];
        let bucketKey = this.stackConfig.BucketPrefix;

        new s3deploy.BucketDeployment(this, "ModbusTCPAdapter", {
            sources: [s3deploy.Source.asset(componentConfig.ModbusTCPAdapter.CodePath+"/zip")],
            destinationBucket: bucket,
            destinationKeyPrefix: `${bucketKey}/${compName}/${compVersion}`
        });

        compName = `${this.projectPrefix}-${componentConfig['ModbusController']['Name']}`;
        compVersion = componentConfig['ModbusController']['Version'];

        new s3deploy.BucketDeployment(this, "ModbusController", {
            sources: [s3deploy.Source.asset(componentConfig.ModbusController.CodePath+"/zip")],
            destinationBucket: bucket,
            destinationKeyPrefix: `${bucketKey}/${compName}/${compVersion}`
        });
    }
}