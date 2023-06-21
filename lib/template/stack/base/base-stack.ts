/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3'
import * as ssm from '@aws-cdk/aws-ssm'

import { AppContext } from '../../app-context'

export interface StackCommonProps extends cdk.StackProps {
    projectPrefix: string;
    appConfig: any;
    appConfigPath: any;
}

export class BaseStack extends cdk.Stack {
    protected projectPrefix: string;
    protected commonProps: StackCommonProps;
    protected stackConfig: any;

    constructor(appContext: AppContext, stackConfig: any) {
        super(appContext.cdkApp, stackConfig.Name, appContext.stackCommonProps);

        this.stackConfig = stackConfig;
        this.commonProps = appContext.stackCommonProps!;
        this.projectPrefix = appContext.stackCommonProps!.projectPrefix;
    }

    protected exportOutput(key: string, value: string) {
        new cdk.CfnOutput(this, `Output-${key}`, {
            exportName: `${this.projectPrefix}-${key}`,
            value: value
        });
    }

    protected createS3Bucket(baseName: string): s3.Bucket {
        const suffix: string = `${this.commonProps.env?.region}-${this.commonProps.env?.account?.substr(0, 5)}`

        const s3Bucket = new s3.Bucket(this, baseName, {
            bucketName: `${this.projectPrefix}-${baseName}-${suffix}`.toLowerCase().replace('_', '-'),
            versioned: false,
            removalPolicy: cdk.RemovalPolicy.DESTROY, //In prod put RETAIN
            autoDeleteObjects: true //In prod put false
        });

        return s3Bucket;
    }

    protected putParameter(paramKey: string, paramValue: string): string {
        const paramKeyWithPrefix = `${this.projectPrefix}-${paramKey}`;

        new ssm.StringParameter(this, paramKey, {
            parameterName: paramKeyWithPrefix,
            stringValue: paramValue,
        });

        return paramKey;
    }

    protected getParameter(paramKey: string): string {
        const paramKeyWithPrefix = `${this.projectPrefix}-${paramKey}`;
        
        return ssm.StringParameter.valueForStringParameter(
            this,
            paramKeyWithPrefix
        );
    }
}