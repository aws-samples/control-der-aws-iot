import * as iot from 'aws-cdk-lib/aws-iot';
import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam'

import * as base from '../../../lib/template/stack/base/base-stack';
import { AppContext } from '../../../lib/template/app-context';

export class IoTCoreStack extends base.BaseStack {

  constructor(appContext: AppContext, stackConfig: any) {
      super(appContext, stackConfig);
      
      this.createIoTRule(appContext);
  }

  createIoTRuleRole(topic: sns.Topic) {
    
    const role = new iam.Role(this, `TopicRuleRole`, {
        roleName: `TopicRuleRole`,
        assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
    });

    role.addToPolicy(new iam.PolicyStatement({
        actions: [
            "sns:Publish"
        ],
        effect: iam.Effect.ALLOW,
        resources: [
          topic.topicArn
        ]
    }));

    return role
  }

  //This method is responsible to create thet IoT Rule for notifying the status changes
  createIoTRule(appContext: AppContext) {

    const thingName = appContext.appConfig.Project.ThingName
    let sql_query = `SELECT concat("Dear user, the thermostat has been removed from the flexibility program due to a manual change in the setpoint. Automatic temperature: ", previous.state.reported.thermostat.target_temperature ,". Your requested temperature: ", current.state.reported.thermostat.target_temperature, ". To enroll your thermostat in the program again please use your mobile app. Thanks!") as AppNotification FROM '\$aws/things/${thingName}/shadow/update/documents' WHERE previous.state.reported.thermostat.mode<>current.state.reported.thermostat.mode AND current.state.reported.thermostat.mode='manual'`
    
    // This SNS topic will be required to push the notification to
    const topic = new sns.Topic(this, 'thermostat-notifications');

    //Create subscription for sending notifications
    new sns.Subscription(this, 'Subscription', {
      topic,
      endpoint: this.stackConfig.NotificationEmail,
      protocol: sns.SubscriptionProtocol.EMAIL
    });

    let topicRole = this.createIoTRuleRole(topic)
  
    new iot.CfnTopicRule(this, 'TopicRule', 
    {
      topicRulePayload: {
          actions: [{ 
              sns: {
                targetArn: topic.topicArn,
                messageFormat: "RAW",
                roleArn: topicRole.roleArn
              }
          }],
          sql: sql_query,
      }
    }
    );
  }
}
