#!/usr/bin/env node
import { AppContext } from '../lib/template/app-context';
import { ThingInstallerStack } from './stack/iot/thing-installer-stack';
import { ComponentUploadStack } from './stack/greengrass/component-upload-stack';
import { ComponentDeploymentStack } from './stack/greengrass/component-deployment-stack';
import { ThermostatStack } from './stack/greengrass/thermostat-stack';
import { EC2CommonStack } from './stack/common/ec2-common-stack';
import { IoTCoreStack } from './stack/iot/iot-core-stack';


const appContext = new AppContext({
    appConfigEnvName: 'APP_CONFIG',
});

if (appContext.stackCommonProps != undefined) {
    let commonStack = new EC2CommonStack(appContext, appContext.appConfig.Stack.EC2Common);
    new ThingInstallerStack(appContext, appContext.appConfig.Stack.ThingInstaller);
    new ComponentUploadStack(appContext, appContext.appConfig.Stack.ComponentUpload, commonStack);
    new ComponentDeploymentStack(appContext, appContext.appConfig.Stack.ComponentDeployment, commonStack);
    new ThermostatStack(appContext, appContext.appConfig.Stack.Thermostat, commonStack);
    new IoTCoreStack(appContext, appContext.appConfig.Stack.IoTCore);

} else {
    
    console.error('[Error] wrong AppConfigFile');
}