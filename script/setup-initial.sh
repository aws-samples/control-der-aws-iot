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

# Configuration File Path
CONFIG_INFRA=$APP_CONFIG

echo ==--------CheckDedendencies---------==
# npm install -g aws-cdk
NPMVERSION=$(npm --version)
CDKVERSION=$(cdk --version)
JQVERSION=$(jq --version)
ZIP=$(which zip)
UNZIP=$(which unzip)
AWSCLI=$(which aws)
PYTHON3=$(python3 --version)

if [ -z "$PYTHON3" ]; then
  echo 'PYTHON 3 is not installed, please install. For further info please check the prerequisites inside the README'
  exit 1
fi
echo "PYTHON found: "$PYTHON3
if [ -z "$NPMVERSION" ]; then
  echo 'NPM is not installed, please install. For further info please check the prerequisites inside the README'
  exit 1
fi
echo "NPM found: "$NPMVERSION
if [ -z "$CDKVERSION" ]; then
  echo 'CDK is not installed, please install. For further info please check the prerequisites inside the README'
  exit 1
fi
echo "CDK found: "$CDKVERSION
if [ -z "$JQVERSION" ]; then
  echo 'JQ is not installed, please install. For further info please check the prerequisites inside the README'
  exit 1
fi
echo "JQ found: "$JQVERSION
if [ -z "$ZIP" ]; then
  echo 'ZIP is not installed, please install. For further info please check the prerequisites inside the README'
  exit 1
fi
echo "ZIP found"
if [ -z "$UNZIP" ]; then
  echo 'UNZIP is not installed, please install. For further info please check the prerequisites inside the README'
  exit 1
fi
echo "UNZIP found"
if [ -z "$AWSCLI" ]; then
  echo 'The AWS CLI is not installed, please install. For further info please check the prerequisites inside the README'
  exit 1
fi

echo ==--------CheckConfiguration---------==
ACCOUNT=$(cat $CONFIG_INFRA | jq -r '.Project.Account') #ex> 123456789123
REGION=$(cat $CONFIG_INFRA | jq -r '.Project.Region') #ex> us-east-1
PROFILE_NAME=$(cat $CONFIG_INFRA | jq -r '.Project.Profile') #ex> cdk-demo

echo ==--------ConfigInfo---------==
echo $CONFIG_INFRA
echo $ACCOUNT
echo $REGION
echo $PROFILE_NAME
echo .
echo .

echo ==--------InstallCDKDependencies---------==
npm install
echo .
echo .

echo ==--------BootstrapCDKEnvironment---------==
cdk bootstrap aws://$ACCOUNT/$REGION --profile $PROFILE_NAME
echo .
echo .
