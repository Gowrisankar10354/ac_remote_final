// js6.js (MQTT Controller) - FINAL CORRECTED VERSION

// Ensure Paho MQTT library is loaded globally before this script runs.
if (typeof Paho === 'undefined' || typeof Paho.Client === 'undefined') {
    console.error("FATAL: Paho MQTT Client not found. Ensure paho-mqtt.min.js is included in index.html BEFORE this script.");
    // We can't proceed, so we'll define a dummy object to prevent further errors.
    var MQTT_Ctrl = {
        init: () => { console.error("MQTT_Ctrl disabled: Paho library missing."); return false; },
        connect: () => { console.error("MQTT_Ctrl disabled: Paho library missing."); },
        disconnect: () => {},
        publish: () => { return false; },
        isBrokerConnected: () => false,
        isFullyConnected: () => false,
        forceDeviceOnlineConfirmation: () => {}
    };
} else {

const MQTT_Ctrl = (() => {
    // --- Configuration ---
    const MQTT_BROKER_HOST = "broker.hivemq.com";
    const MQTT_BROKER_PORT = 8884; // Secure WebSocket Port
    const MQTT_USE_SSL = true;
    const MQTT_COMMAND_TOPIC = "ac_remote/SANKAR_AC_BLE_MQTT/command_to_esp32";
    const MQTT_STATUS_TOPIC = "ac_remote/SANKAR_AC_BLE_MQTT/status_from_esp32";
    const MQTT_DEVICE_READY_TOPIC = "ac_remote/SANKAR_AC_BLE_MQTT/esp32_ready";
    const DEVICE_READY_TIMEOUT_MS = 10000; // 10 seconds to wait for "online" message

    // --- State Variables ---
    let client = null;
    let connectedToBroker = false;
    let esp32ConfirmedOnline = false;
    let onDataReceivedCallback = null;
    let onConnectionStatusChangeCallback = null;
    let deviceReadyTimeoutId = null;

    // --- Private Helper Functions ---
    const _log = (message) => console.log(`MQTT_Ctrl: ${message}`);
    const _error = (message, err = '') => console.error(`MQTT_Ctrl ERROR: ${message}`, err);
    
    const _updateAndNotifyStatus = (broker, device, message) => {
        connectedToBroker = broker;
        esp32ConfirmedOnline = device;
        if (onConnectionStatusChangeCallback) {
            onConnectionStatusChangeCallback(broker, device, message);
        }
    };

    // --- Paho Event Handlers ---
    const onConnectSuccess = () => {
        _log("Successfully connected to MQTT broker.");
        _updateAndNotifyStatus(true, false, "Awaiting Device...");
        
        try {
            client.subscribe(MQTT_STATUS_TOPIC);
            client.subscribe(MQTT_DEVICE_READY_TOPIC);
            _log(`Subscribed to: ${MQTT_STATUS_TOPIC}`);
            _log(`Subscribed to: ${MQTT_DEVICE_READY_TOPIC}`);
            
            // Set a timeout to check if the device reports "online"
            deviceReadyTimeoutId = setTimeout(() => {
                _error("Device did not report 'online' status in time.");
                _updateAndNotifyStatus(true, false, "Device Offline");
            }, DEVICE_READY_TIMEOUT_MS);

        } catch (error) {
            _error("Error during subscription:", error);
            disconnect();
        }
    };

    const onConnectFailure = (responseObject) => {
        _error(`Failed to connect to MQTT broker: ${responseObject.errorMessage}`);
        _updateAndNotifyStatus(false, false, "MQTT Failed");
    };

    const onConnectionLost = (responseObject) => {
        _error(`MQTT connection lost: ${responseObject.errorMessage}`);
        _updateAndNotifyStatus(false, false, "MQTT Disconnected");
    };

    const onMessageArrived = (message) => {
        const topic = message.destinationName;
        const payload = message.payloadString;
        _log(`Message arrived on topic: ${topic}`);

        if (topic === MQTT_DEVICE_READY_TOPIC) {
            if (payload === 'online') {
                _log("Device is ONLINE.");
                clearTimeout(deviceReadyTimeoutId);
                _updateAndNotifyStatus(true, true, "MQTT Device Online");
            } else {
                _log("Device is OFFLINE.");
                _updateAndNotifyStatus(true, false, "Device Offline");
            }
        } else if (topic === MQTT_STATUS_TOPIC) {
            if (onDataReceivedCallback) {
                onDataReceivedCallback(payload);
            }
        }
    };

    // --- Public Interface ---
    function init(callbacks) {
        if (client) {
            _log("MQTT Controller already initialized.");
            return true;
        }
        _log("Initializing MQTT Controller...");
        onDataReceivedCallback = callbacks.onDataReceived;
        onConnectionStatusChangeCallback = callbacks.onConnectionStatusChange;
        const clientId = "AC_WebApp_" + new Date().getTime();
        
        try {
            client = new Paho.Client(MQTT_BROKER_HOST, MQTT_BROKER_PORT, "/mqtt", clientId);
            return true;
        } catch (error) {
            _error("Failed to create Paho client.", error);
            return false;
        }
    }

    function connect() {
        if (connectedToBroker) {
            _log("Already connected or connecting.");
            return;
        }
        if (!client) {
            _error("Client not initialized. Call init() first.");
            return;
        }

        _log("Attempting to connect...");
        _updateAndNotifyStatus(false, false, "MQTT Connecting...");
        
        client.onMessageArrived = onMessageArrived;
        client.onConnectionLost = onConnectionLost;

        const connectOptions = {
            onSuccess: onConnectSuccess,
            onFailure: onConnectFailure,
            useSSL: MQTT_USE_SSL,
            cleanSession: true,
            reconnect: true,
            timeout: 10,
            willMessage: new Paho.Message("offline"),
            willDestinationName: MQTT_DEVICE_READY_TOPIC,
            willQos: 1,
            willRetain: true
        };

        try {
            client.connect(connectOptions);
        } catch (error) {
            _error("Error during client.connect call:", error);
            _updateAndNotifyStatus(false, false, "MQTT Connection Error");
        }
    }

    function disconnect() {
        if (!client || !connectedToBroker) return;
        _log("Disconnecting from MQTT broker.");
        try {
            client.disconnect();
        } catch (error) {
            _error("Error during disconnect:", error);
        }
        _updateAndNotifyStatus(false, false, "MQTT Disconnected");
    }

    function publish(jsonString) {
        if (!isFullyConnected()) {
            _error("Cannot publish: Not fully connected.");
            return false;
        }
        const message = new Paho.Message(jsonString);
        message.destinationName = MQTT_COMMAND_TOPIC;
        try {
            client.send(message);
            return true;
        } catch (error) {
            _error("Publish error:", error);
            return false;
        }
    }
    
    const isBrokerConnected = () => connectedToBroker;
    const isFullyConnected = () => connectedToBroker && esp32ConfirmedOnline;

    function forceDeviceOnlineConfirmation() {
        if (isBrokerConnected() && !esp32ConfirmedOnline) {
            _log("Device online status confirmed via alternative method (e.g., BLE).");
            clearTimeout(deviceReadyTimeoutId);
            _updateAndNotifyStatus(true, true, "MQTT Device Online");
        }
    }

    return {
        init,
        connect,
        disconnect,
        publish,
        isBrokerConnected,
        isFullyConnected,
        forceDeviceOnlineConfirmation
    };
})();
}
