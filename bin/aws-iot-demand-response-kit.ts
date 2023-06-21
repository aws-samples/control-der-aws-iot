#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsIotDemandResponseKitStack } from '../lib/aws-iot-demand-response-kit-stack';

const app = new cdk.App();
new AwsIotDemandResponseKitStack(app, 'AwsIotDemandResponseKitStack', {
   env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});