import sys, json
import time
import awsiot.greengrasscoreipc
import concurrent.futures
import traceback
import random;
from awsiot.greengrasscoreipc.model import GetThingShadowRequest
from datetime import datetime
import awsiot.greengrasscoreipc.client as client
from awsiot.greengrasscoreipc.model import (
    SubscribeToTopicRequest,
    SubscriptionResponseMessage,
    PublishToTopicRequest,
    UnauthorizedError,
    UpdateThingShadowRequest,
    PublishMessage,
    BinaryMessage
)

#initialize the state
core_thing_name = "thing_name_placeholder"
thing_name = "thermostat"
target_temp="target_temperature"

#timeout for messages
TIMEOUT = 10

#delta topic to listen to
shadow_delta_topic = "$aws/things/"+core_thing_name+"/shadow/update/delta"
shadow_response_topic = "$aws/things/"+core_thing_name+"/shadow/update"
modbus_request_topic = "modbus/request/"+thing_name
mqtt_telemetry_topic = thing_name+"/telemetry"
modbus_response_topic = "modbus/response/"+thing_name

#Type of request towards the ModbusAdapter
modbus_write_request_type="WriteSingleRegister"
modbus_read_request_type="ReadHoldingRegisters"

# Method to read a new temperature from the thing
def read_register_thing():
    
    try:
        print("Sending command to read data from the thing")
        payload={
          "id": "ReadTemperature",
          "function": modbus_read_request_type,
          "address": 1,
          "quantity": 2
        }
        publish_to_mqtt(json.dumps(payload), modbus_request_topic)
        
    except Exception as e:
        print("Error set shadow", type(e), e)
        # except ResourceNotFoundError | UnauthorizedError | ServiceError

# Method to provide the message to change the setpoint of the thermostat
def change_setpoint(temperature, manual):
    
    idw= "WriteTemperatureSetpoint"
    if manual :
        idw="ManualWriteTemperatureSetpoint"
    
    try:
        print("Sending command to set the setpoint to ", temperature)
        payload={
          "id": idw,
          "function": modbus_write_request_type,
          "address": 1,
          "value": temperature
        }
        publish_to_mqtt(json.dumps(payload), modbus_request_topic)
        
    except Exception as e:
        print("Error set shadow", type(e), e)
        # except ResourceNotFoundError | UnauthorizedError | ServiceError

def publish_telemetry():
        
    json_data = {
        "device_id": "thermostat",
        "ambient_temperature" : random.randint(19, 25),
        "thermostat_time" : datetime.today().strftime('%Y-%m-%d %H:%M:%S'),
        "atmospheric_pressure": random.randint(98, 102),
        "humidity": random.randint(30, 50),
    }

    try:
        print("Sending telemetry for the temperature data ", json_data)
        publish_to_mqtt(json.dumps(json_data), mqtt_telemetry_topic)
        
    except Exception as e:
        print("Error set shadow", type(e), e)
        # except ResourceNotFoundError | UnauthorizedError | ServiceError


# Method to publish messages on pub/sub for the ModubsTCP Adapter component to read and send to the modbus thing
def publish_to_mqtt(payload, topic):
    try:
     
        publish_ipc_client = awsiot.greengrasscoreipc.connect()
        publish_request = PublishToTopicRequest()
        publish_request.topic = topic
        publish_message = PublishMessage()
        publish_message.binary_message = BinaryMessage()
        publish_message.binary_message.message = bytes(payload, "utf-8")
        publish_request.publish_message = publish_message
        publish_operation = publish_ipc_client.new_publish_to_topic()
        publish_operation.activate(publish_request)
        publish_future_response = publish_operation.get_response()

        try:
            publish_future_response.result(TIMEOUT)
            print('Successfully published to topic:', publish_request.topic, 'payload', payload)
        except concurrent.futures.TimeoutError as e:
            print('Timeout occurred while publishing to topic:', publish_request.topic, "with exception", str(e), file=sys.stderr)
        except UnauthorizedError as e:
            print('Unauthorized error while publishing to topic:', publish_request.topic, file=sys.stderr)
            raise e
        except Exception as e:
            print('Exception while publishing to topic:', publish_request.topic, file=sys.stderr)
            raise e
        
    except Exception as e:
        print("Error publish change", type(e), e)
        # except ResourceNotFoundError | UnauthorizedError | ServiceError

#Method to confirm shadow changes after actual modbus changes
def confirm_shadow_change(setpoint, mode):
    try:
        payload = {
            "state": {
                "reported": {
                    thing_name: {
                        "device_id": thing_name,
                        target_temp: setpoint,
                        "status": "online",
                        "mode": mode
                    }
                }
            }
        }
        
        publish_ipc_client = awsiot.greengrasscoreipc.connect()
        publish_request = PublishToTopicRequest()
        publish_request.topic = shadow_response_topic
        publish_message = PublishMessage()
        publish_message.binary_message = BinaryMessage()
        publish_message.binary_message.message = bytes(json.dumps(payload), "utf-8")
        publish_request.publish_message = publish_message
        publish_operation = publish_ipc_client.new_publish_to_topic()
        publish_operation.activate(publish_request)
        publish_future_response = publish_operation.get_response()

        try:
            publish_future_response.result(TIMEOUT)
            print('Successfully published to topic:', publish_request.topic, 'payload', payload)
        except concurrent.futures.TimeoutError as e:
            print('Timeout occurred while publishing to topic:', publish_request.topic, "with exception", str(e), file=sys.stderr)
        except UnauthorizedError as e:
            print('Unauthorized error while publishing to topic:', publish_request.topic, file=sys.stderr)
            raise e
        except Exception as e:
            print('Exception while publishing to topic:', publish_request.topic, file=sys.stderr)
            raise e
        
    except Exception as e:
        print("Error publish change", type(e), e)
        # except ResourceNotFoundError | UnauthorizedError | ServiceError
        
        #Method to confirm shadow changes after actual modbus changes
def shadow_change(setpoint, mode):
    try:
        payload = {
            "state": {
                "desired": {
                    thing_name: {
                        "device_id": thing_name,
                        target_temp: setpoint,
                        "status": "online",
                        "mode": mode
                    }
                }
            }
        }
        
        publish_ipc_client = awsiot.greengrasscoreipc.connect()
        publish_request = PublishToTopicRequest()
        publish_request.topic = shadow_response_topic
        publish_message = PublishMessage()
        publish_message.binary_message = BinaryMessage()
        publish_message.binary_message.message = bytes(json.dumps(payload), "utf-8")
        publish_request.publish_message = publish_message
        publish_operation = publish_ipc_client.new_publish_to_topic()
        publish_operation.activate(publish_request)
        publish_future_response = publish_operation.get_response()

        try:
            publish_future_response.result(TIMEOUT)
            print('Successfully published to topic:', publish_request.topic, 'payload', payload)
        except concurrent.futures.TimeoutError as e:
            print('Timeout occurred while publishing to topic:', publish_request.topic, "with exception", str(e), file=sys.stderr)
        except UnauthorizedError as e:
            print('Unauthorized error while publishing to topic:', publish_request.topic, file=sys.stderr)
            raise e
        except Exception as e:
            print('Exception while publishing to topic:', publish_request.topic, file=sys.stderr)
            raise e
        
    except Exception as e:
        print("Error publish change", type(e), e)
        # except ResourceNotFoundError | UnauthorizedError | ServiceError

#Method to deny a change in case the modbus adapter or the modbus device does not work properly
def deny_shadow_change():
    try:
     
        payload = {
            "state": {
                "reported": {
                    thing_name: {
                        "device_id": thing_name,
                        "status" : "error"
                    }
                }
            }
        }
        publish_ipc_client = awsiot.greengrasscoreipc.connect()
        publish_request = PublishToTopicRequest()
        publish_request.topic = shadow_response_topic
        publish_message = PublishMessage()
        publish_message.binary_message = BinaryMessage()
        publish_message.binary_message.message = bytes(payload, "utf-8")
        publish_request.publish_message = publish_message
        publish_operation = publish_ipc_client.new_publish_to_topic()
        publish_operation.activate(publish_request)
        publish_future_response = publish_operation.get_response()

        try:
            publish_future_response.result(TIMEOUT)
            print('Successfully published to topic:', publish_request.topic)
        except concurrent.futures.TimeoutError as e:
            print('Timeout occurred while publishing to topic:', publish_request.topic, "with exception", str(e), file=sys.stderr)
        except UnauthorizedError as e:
            print('Unauthorized error while publishing to topic:', publish_request.topic, file=sys.stderr)
            raise e
        except Exception as e:
            print('Exception while publishing to topic:', publish_request.topic, file=sys.stderr)
            raise e
        
    except Exception as e:
        print("Error publish change", type(e), e)
        # except ResourceNotFoundError | UnauthorizedError | ServiceError

def get_current_shadow():

    TIMEOUT = 10
    
    try:
        # set up IPC client to connect to the IPC server
        ipc_client = awsiot.greengrasscoreipc.connect()
                
        # create the GetThingShadow request
        get_thing_shadow_request = GetThingShadowRequest()
        get_thing_shadow_request.thing_name = core_thing_name
        get_thing_shadow_request.shadow_name = ""
        print("Fetching shadow status for thing ", core_thing_name, " over the classic shadow")
        
        # retrieve the GetThingShadow response after sending the request to the IPC server
        op = ipc_client.new_get_thing_shadow()
        op.activate(get_thing_shadow_request)
        fut = op.get_response()
        
        result = fut.result(TIMEOUT)
        return result.payload

    except Exception as e:
        print("Error publish change", type(e), e)
        # except ResourceNotFoundError | UnauthorizedError | ServiceError

#Class responsible to subscribe to responses from the TCP Modbus adapter and confirm shadow changes (after the actual modbus change)
class ModbusResponseHandler(client.SubscribeToTopicStreamHandler):
    def __init__(self):
        super().__init__()
    def on_stream_event(self, event: SubscriptionResponseMessage) -> None:
        try:
            #get the message from the gg pubsub
            message_string = str(event.binary_message.message, "utf-8")
            #log the message
            print("Message from MODBUS:", message_string)
            #parse the message and extract the type to understand if it's an error or not
            document= json.loads(message_string)
            message_type=document['type']
            #If the request type is write then we check if it's a simulated manual or automatic change
            if message_type == modbus_write_request_type:
                #Validation of the response
                current_setpoint= document['value']
                request_type= document['id']
                if request_type == "WriteTemperatureSetpoint":
                    print("Confirming the shadow change according to the document :", document)
                    #Note that writes are happening only if the mode is auto or going to be auto anyways 
                    confirm_shadow_change(current_setpoint, "auto")
                else:
                    #Please note that this case happens only when simulating a user setting the temperature directly on the asset
                    print("The MODBUS message is not propagated to the shadow since it's a manual change either coming from the cloud or the device")
            #If we are maanging a read instead
            elif message_type == modbus_read_request_type:
                current_setpoint = document['bytes'][1]
                print("The current temperature setpoint of the thermostat is :", current_setpoint)
                #We will now read the status of the shadow to understand if the value is the expected one
                current_shadow = json.loads(get_current_shadow())
                print("This is the current status of the device in the shadow : ", current_shadow)
                desired_shadow_temp = current_shadow['state']['desired'][thing_name][target_temp]
                reported_shadow_temp = current_shadow['state']['reported'][thing_name][target_temp]
                if desired_shadow_temp==current_setpoint and reported_shadow_temp==current_setpoint:
                    print("The current setpoint is aligned to the expected one, no action required")
                # If the shadows states are not in sync we are in beteween a change so better wait for the syc
                elif desired_shadow_temp != reported_shadow_temp:
                    print("Desired and reported shadow temps are out of sync, waiting for sync")
                else:
                    print("The current setpoint is ", current_setpoint, " while it should be ", desired_shadow_temp, " and last temperature reported is ", reported_shadow_temp)
                    print("The user is considered out of the event")
                    print("Setting the mode to manual and reporting the temperature setpoint back to the cloud")
                    
                    shadow_change(current_setpoint, 'manual')
            else:
                print("The thing status did not change due to an error. Document: ", document)
                deny_shadow_change()
        except:
            traceback.print_exc()

    def on_stream_error(self, error: Exception) -> bool:
        # Handle error.
        return True  # Return True to close stream, False to keep stream open.
    def on_stream_closed(self) -> None:
        # Handle close.
        pass

#Class to manage the delta notifications coming from the IoT Core upon shadow changes
class DeltaShadowHandler(client.SubscribeToTopicStreamHandler):
    def __init__(self):
        super().__init__()
    def on_stream_event(self, event: SubscriptionResponseMessage) -> None:
        try:
            #get the message from the gg pubsub
            message_string = str(event.binary_message.message, "utf-8")
            #log the message
            print("Message from Delta Shadow:", message_string)
            #retrìeve the current shadow document to understand the mode
            current_shadow = json.loads(get_current_shadow())
            desired_mode=current_shadow['state']['desired'][thing_name]['mode']
            temperature=current_shadow['state']['desired'][thing_name][target_temp]

            #We propagate the change to the thermostat only if the device is already set to auto or it's requested to become auto            
            if desired_mode=="auto" :
                change_setpoint(temperature, False)
            #If we are setting the status to manual or we are already working in manual we just confirm the change
            elif desired_mode=="manual":
                confirm_shadow_change(temperature, "manual")
            else:
                print("ERROR: The desired mode must be either manual or auto, ignoring the provided value: ", desired_mode)
            
        except:
            traceback.print_exc()

    def on_stream_error(self, error: Exception) -> bool:
        # Handle error.
        return True  # Return True to close stream, False to keep stream open.
    def on_stream_closed(self) -> None:
        # Handle close.
        pass

# Setup a listener to the shadow delta topic to capture status changes and send the command towards Modbus
def setupDeltaShadowHandler():
    print("Creating shadow delta handler")
    ipc_client = awsiot.greengrasscoreipc.connect()
    request = SubscribeToTopicRequest()
    request.topic = shadow_delta_topic
    handler = DeltaShadowHandler()
    operation = ipc_client.new_subscribe_to_topic(handler)
    operation.activate(request)
    future_response = operation.get_response()
    
    try:
        future_response.result(TIMEOUT)
        print('Successfully subscribed to topic:',request.topic)
    except concurrent.futures.TimeoutError as e:
        print('Timeout occurred while subscribing to topic:',request.topic, file=sys.stderr)
        raise e
    except UnauthorizedError as e:
        print('Unauthorized error while subscribing to topic:',request.topic, file=sys.stderr)
        raise e
    except Exception as e:
        print('Exception while subscribing to topic:',request.topic, file=sys.stderr)
        raise e

# Setup a listener to the shadow delta topic to capture status changes and send the command towards Modbus
def setupModbusResponseHandler():
    print("Creating modbus response handler")
    ipc_client = awsiot.greengrasscoreipc.connect()
    request = SubscribeToTopicRequest()
    request.topic = modbus_response_topic
    handler = ModbusResponseHandler()
    operation = ipc_client.new_subscribe_to_topic(handler)
    operation.activate(request)
    future_response = operation.get_response()
    
    try:
        future_response.result(TIMEOUT)
        print('Successfully subscribed to topic: ' + modbus_response_topic)
    except concurrent.futures.TimeoutError as e:
        print('Timeout occurred while subscribing to topic:', modbus_response_topic, file=sys.stderr)
        raise e
    except UnauthorizedError as e:
        print('Unauthorized error while subscribing to topic:', modbus_response_topic, file=sys.stderr)
        raise e
    except Exception as e:
        print('Exception while subscribing to topic:', modbus_response_topic, file=sys.stderr)
        raise e

# Initialize the shadow inside the AWS IoT to track the status of the thing
def setupShadow():
    try:
        payload = {
            "state": {
                "desired": {
                    thing_name: {
                        "device_id": thing_name,
                        target_temp: 23,
                        "status": "online",
                        "mode": "auto"
                    }
                },
                "reported": {
                    thing_name: {
                        "device_id": thing_name,
                        target_temp: 23,
                        "status": "online",
                        "mode": "auto"
                    }
                }
            }
        }
        ipc_client = awsiot.greengrasscoreipc.connect()
        request = PublishToTopicRequest()
        request.topic = shadow_response_topic
        message = PublishMessage()
        message.binary_message = BinaryMessage()
        message.binary_message.message = bytes(json.dumps(payload), "utf-8")
        request.publish_message = message
        operation = ipc_client.new_publish_to_topic()
        operation.activate(request)
        future_response = operation.get_response()

        try:
            future_response.result(TIMEOUT)
            print('Successfully published to topic:', request.topic, 'payload', payload)
        except concurrent.futures.TimeoutError as e:
            print('Timeout occurred while publishing to topic:', request.topic, "with exception", str(e), file=sys.stderr)
        except UnauthorizedError as e:
            print('Unauthorized error while publishing to topic:', request.topic, file=sys.stderr)
            raise e
        except Exception as e:
            print('Exception while publishing to topic:', request.topic, file=sys.stderr)
            raise e
        
    except Exception as e:
        print("Error publish change", type(e), e)
        # except ResourceNotFoundError | UnauthorizedError | ServiceError

#
# Main program
#
try:
    print("Starting modbus controller component...")
    #Initialize thing shadow
    setupShadow()
    #Listen to shadow changes for thermostat ON/OFF property
    setupDeltaShadowHandler()
    #Listen to acknoledge messages from the thermostat via Modbus
    setupModbusResponseHandler()
    #Set the first temperature in the simulator
    change_setpoint(23, True)

except Exception:
    print('Exception occurred when using IPC.', file=sys.stderr)
    traceback.print_exc()
    exit(1)

#We schedule the customer to change the value from his house
userManualChanges=0

# Keep the main thread alive, or the process will exit.
while True:
    
    userManualChanges=userManualChanges+1;
    print('Sending a read request...')
    read_register_thing()
    time.sleep(10)
    
    if (userManualChanges % 6) == 0:
        change_setpoint(random.randint(20, 25), True)
    
    
    
    print('Sending telemetry to AWS IoT Core')
    publish_telemetry()