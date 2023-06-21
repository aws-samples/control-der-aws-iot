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
PROJECT_PREFIX=$PROJECT_NAME$PROJECT_STAGE

MODBUS_NAME=$(cat $APP_CONFIG | jq -r '.Stack.ComponentDeployment.ModbusTCPAdapter.Name') 
MODBUS_PATH=$(cat $APP_CONFIG | jq -r '.Stack.ComponentDeployment.ModbusTCPAdapter.CodePath') 

CONTROLLER_NAME=$(cat $APP_CONFIG | jq -r '.Stack.ComponentDeployment.ModbusController.Name') 
CONTROLLER_PATH=$(cat $APP_CONFIG | jq -r '.Stack.ComponentDeployment.ModbusController.CodePath') 

BINARIES=$(cat $APP_CONFIG | jq -r '.Stack.ModbusSimulator.BinaryPath') 

echo ==-------Modbus simulator binary---------==
mv $BINARIES/diagslave-*.tgz $BINARIES/diagslave.tgz

echo ==-------ModbusTCPAdapter---------==
echo $MODBUS_NAME
echo $MODBUS_PATH
COMP_NAME=$MODBUS_NAME
BASE_PATH=$MODBUS_PATH

ZIP_FILE=$PROJECT_PREFIX-$COMP_NAME.zip
cd $BASE_PATH
if [ -d "zip" ]; then
    rm -r "zip"
fi
mkdir zip
cd src
zip -r $ZIP_FILE ./*  -x \*__pycache__\*
mv $ZIP_FILE ../zip
cd ../../../..
echo .
echo .


echo ==-------ModbusController---------==
echo $CONTROLLER_NAME
echo $CONTROLLER_PATH
COMP_NAME=$CONTROLLER_NAME
BASE_PATH=$CONTROLLER_PATH

ZIP_FILE=$PROJECT_PREFIX-$COMP_NAME.zip
cd $BASE_PATH
if [ -d "zip" ]; then
    rm -r "zip"
fi
mkdir zip
cd src
zip -r $ZIP_FILE ./*  -x \*__pycache__\*
mv $ZIP_FILE ../zip
cd ../../../..
echo .
echo .
