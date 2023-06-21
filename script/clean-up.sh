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

PROJECT_NAME=$(cat $APP_CONFIG | jq -r '.Project.Name') 
PROJECT_STAGE=$(cat $APP_CONFIG | jq -r '.Project.Stage') 
PROFILE_NAME=$(cat $APP_CONFIG | jq -r '.Project.Profile') 
REGION=$(cat $APP_CONFIG | jq -r '.Project.Region') 
THING_NAME=$(cat $APP_CONFIG | jq -r '.Project.ThingName') 
IOT_ROLE=$(cat $APP_CONFIG | jq -r '.Project.IoTRole') 

echo ==--------ConfigInfo---------==
echo $APP_CONFIG
echo $PROFILE_NAME
echo .
echo .

echo ==--------Certificate cleanup---------==
echo "Removing gg certs from policy.." $IOT_ROLE
echo .
POLICY_NAME=$PROJECT_NAME$PROJECT_STAGE-$IOT_ROLE
CERTS_ARN=$(aws iot list-targets-for-policy --policy-name $POLICY_NAME --query targets --output text --region $REGION)
for cert in $CERTS_ARN 
do 
    echo "Removing policies from certificate $cert"
    CERT_POLICIES=$(aws iot list-attached-policies --target $cert --query policies[*].policyName --output text --region $REGION)
    for policy in $CERT_POLICIES
    do 
        aws iot detach-policy --policy-name $policy --target $cert --region $REGION
    done
    
    echo "Deactivating certificate $cert"
    cert_id=$(echo $cert | cut -d "/" -f 2)
    aws iot update-certificate --certificate-id $cert_id --new-status INACTIVE --region $REGION
    echo "Detaching thing from cert $cert"
    aws iot detach-thing-principal --principal $cert --thing-name $PROJECT_NAME$PROJECT_STAGE-$THING_NAME --region $REGION
    echo "Removing cert $cert"
    aws iot delete-certificate --certificate-id $cert_id --region $REGION
done

echo "Deleting thing $PROJECT_NAME$PROJECT_STAGE-$THING_NAME"
aws iot delete-thing --thing-name $PROJECT_NAME$PROJECT_STAGE-$THING_NAME --region $REGION

echo "Removing IoT Policy $IOT_ROLE"
aws iot delete-policy --policy-name $POLICY_NAME --region $REGION

echo ==--------DestroyStacks---------==
echo .
echo .
cdk destroy --all --force