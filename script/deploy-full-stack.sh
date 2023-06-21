#!/bin/sh

EID=$(id -u)
if [ $EID -eq 0 ] 
then
    echo "Please run as non-root"
    exit 1
fi
echo "Running as non root"

if [ -z "$APP_CONFIG" ]; then 
    echo "APP CONFIG is not defined, please export APP_CONFIG=./config/app-config-demo.json";
    exit 1;
fi

PROJECT_NAME=$(cat $APP_CONFIG | jq -r '.Project.Name') #ex> IoTData
PROJECT_STAGE=$(cat $APP_CONFIG | jq -r '.Project.Stage') #ex> Dev
PROFILE_NAME=$(cat $APP_CONFIG | jq -r '.Project.Profile') #ex> cdk-demo

echo ==--------ConfigInfo---------==
echo $APP_CONFIG
echo $PROFILE_NAME
echo .
echo .

echo ==--------ListStacks---------==
cdk list
echo .
echo .


echo ==--------DeployStacksStepByStep---------==
cdk deploy *-EC2CommonStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-ThingInstallerStack --require-approval never --profile $PROFILE_NAME --outputs-file ./script/thing/outout-thing-installer-stack-$PROJECT_NAME$PROJECT_STAGE.json
cdk deploy *-ComponentUploadStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-ComponentDeploymentStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-ModbusSimulatorStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-ThermostatStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-IoTCoreStack --require-approval never --profile $PROFILE_NAME
echo .
echo .
