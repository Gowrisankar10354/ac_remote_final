// js6_mqtt.js (Fixed version)
console.log('js6.js: Top - typeof Paho:', typeof Paho);
if (typeof Paho !== 'undefined') {
    console.log('js6.js: Top - Paho object:', Paho);
    // console.log('js6.js: Top - typeof Paho.MQTT:', typeof Paho.MQTT); // MQTT property likely won't exist
    // if (typeof Paho.MQTT !== 'undefined') {
    //     console.log('js6.js: Top - Paho.MQTT object:', Paho.MQTT);
    //     console.log('js6.js: Top - typeof Paho.MQTT.Client:', typeof Paho.MQTT.Client);
    // }
    console.log('js6.js: Top - typeof Paho.Client:', typeof Paho.Client); // Check for Paho.Client
}
// Ensure Paho MQTT library is loaded globally before this script
if (typeof Paho === 'undefined' || typeof Paho.Client === 'undefined') {
    console.error("FATAL: Paho MQTT Client not found. Ensure paho-mqtt.min.js (or similar) is included in HTML BEFORE this script.");
    // Potentially, if Paho is defined but Paho.Client isn't, it could be a different Paho library (e.g., Paho MQ Telemetry)
    if (typeof Paho !== 'undefined' && typeof Paho.Client === 'undefined') {
        console.warn("Paho object IS defined, but Paho.Client is NOT. You might be loading an incorrect Paho library or an incomplete version.");
    }
} else {
    console.log("MQTT_Ctrl Pre-Check: Paho MQTT library (Paho.Client) appears to be loaded.");
}

const MQTT_Ctrl = (() => {
    // --- Configuration ---
    const MQTT_BROKER_HOST = 'broker.hivemq.com'; 
    const MQTT_BROKER_PORT = 8000; 
    const MQTT_CLIENT_ID_WEB_PREFIX = 'acWebClient_'; // Fixed: Added missing const
    let mqttClientID = `${MQTT_CLIENT_ID_WEB_PREFIX}${Math.random().toString(16).substr(2, 8)}`; // This was fine

    const MQTT_BASE_TOPIC_PREFIX = `ac_remote/SANKAR_AC_BLE_MQTT`;
    const MQTT_COMMAND_TOPIC = `${MQTT_BASE_TOPIC_PREFIX}/command_to_esp32`; 
    const MQTT_STATUS_TOPIC = `${MQTT_BASE_TOPIC_PREFIX}/status_from_esp32`;   
    const MQTT_ESP32_READY_TOPIC = `${MQTT_BASE_TOPIC_PREFIX}/esp32_ready`;     

    let client = null;
    let connectedToBroker = false;      
    let esp32ConfirmedOnline = false;  
    
    let onDataReceivedCallback = null;
    let onConnectionStatusChangeCallback = null; 
    let deviceReadyTimeoutId = null;

    function _log(message) { console.log("MQTT_Ctrl:", message); }
    function _error(message, errObj) { console.error("MQTT_Ctrl ERROR:", message, errObj || ''); }

    // Centralized status update that calls back to main.js
    function _updateAndNotifyStatus(isBrokerConnectedState, isDeviceOnlineState, statusMessage) {
        const oldBroker = connectedToBroker;
        const oldDevice = esp32ConfirmedOnline;

        connectedToBroker = isBrokerConnectedState;
        esp32ConfirmedOnline = isDeviceOnlineState;
        
        // Notify main.js about the change.
        // main.js's handleMqttConnectionStatusChange will use MQTT_Ctrl.isFullyConnected() and MQTT_Ctrl.isBrokerConnected()
        // to determine the overall UI status. This callback primarily passes the 'message'.
        if (onConnectionStatusChangeCallback) {
            onConnectionStatusChangeCallback('mqtt', connectedToBroker, statusMessage); // Pass current broker connection state and specific message
        }
    }

    // Fixed: Added missing functions that are referenced but not defined
    function isBrokerConnected() {
        return connectedToBroker && client && client.isConnected();
    }

    function isFullyConnected() {
        return isBrokerConnected() && esp32ConfirmedOnline;
    }

    function init(config) {
        _log("init() called.");
        if (typeof Paho === 'undefined' || typeof Paho.Client === 'undefined') {
            _error("init(): Paho.Client component is missing.");
            return false;
        }

        // Fixed: Use the already defined mqttClientID instead of undefined variable
        mqttClientID = MQTT_CLIENT_ID_WEB_PREFIX + Math.random().toString(16).substr(2, 8);
        if (config && config.onDataReceived) onDataReceivedCallback = config.onDataReceived;
        if (config && config.onConnectionStatusChange) onConnectionStatusChangeCallback = config.onConnectionStatusChange;

        try {
            _log(`Creating Paho.Client for ${MQTT_BROKER_HOST}:${MQTT_BROKER_PORT}, ID: ${mqttClientID}`);
            // --- MODIFIED INSTANTIATION ---
            client = new Paho.Client(MQTT_BROKER_HOST, MQTT_BROKER_PORT, mqttClientID);
        } catch (e) {
            _error("Error creating Paho.Client instance:", e);
            return false;
        }

        client.onConnectionLost = (responseObject) => { // Keep this
            clearTimeout(deviceReadyTimeoutId);
            if (responseObject.errorCode !== 0) {
                _error("Connection Lost -", responseObject.errorMessage);
                _updateAndNotifyStatus(false, false, "MQTT Connection Lost");
            } else {
                _log("Deliberately disconnected from MQTT broker.");
                _updateAndNotifyStatus(false, false, "MQTT Disconnected");
            }
        };

        client.onMessageArrived = (message) => {
            //_log(`RX: '${message.payloadString}' on '${message.destinationName}'`); // Verbose
            if (message.destinationName === MQTT_STATUS_TOPIC) {
                if (onDataReceivedCallback) onDataReceivedCallback(message.payloadString);
            } else if (message.destinationName === MQTT_ESP32_READY_TOPIC) {
                if (message.payloadString && message.payloadString.toLowerCase().includes("online")) {
                    _log("ESP32 reported 'online' via MQTT (esp32_ready topic).");
                    clearTimeout(deviceReadyTimeoutId);
                    if (connectedToBroker) {
                         _updateAndNotifyStatus(true, true, "MQTT Device Online");
                    } else {
                        _log("Received ESP32 ready, but broker connection state is false. This is unusual.");
                         if(client && client.isConnected()) {
                             _updateAndNotifyStatus(true, true, "MQTT Device Online");
                         }
                    }
                }
            }
        };
        _log("Initialized successfully. Client ID: " + mqttClientID);
        return true;
    }

    function connect() {
        if (!client) {
            _error("Connect called, but MQTT client not initialized.");
            _updateAndNotifyStatus(false, false, "MQTT System Error (Client not init)");
            return;
        }
        
        // Use our combined state for "fully connected"
        if (isFullyConnected()) { 
            _log("Already fully connected (Broker + Device Confirmed Online).");
             _updateAndNotifyStatus(true, true, "MQTT Device Online"); // Re-notify main app
            return;
        }
        // If connected to broker but device not yet confirmed
        if (client.isConnected() && !esp32ConfirmedOnline) { 
            _log("Connected to broker, but ESP32 device not yet confirmed. Waiting for 'online' signal.");
            _updateAndNotifyStatus(true, false, "MQTT: Verifying Device...");
            _subscribeToTopicsAndRestartDeviceCheckTimer(); // Re-subscribe just in case & restart timer
            return;
        }
        
        _log("Attempting to connect to MQTT broker...");
        esp32ConfirmedOnline = false; // Reset device confirmation on new connect attempt
        _updateAndNotifyStatus(false, false, "Connecting to MQTT Broker...");

        client.connect({
            timeout: 10, 
            useSSL: (MQTT_BROKER_HOST.startsWith("wss://") || [443, 8081, 8883, 8884].includes(MQTT_BROKER_PORT)),
            onSuccess: () => {
                _log("Successfully connected to MQTT Broker!");
                // At this point, only broker is connected. Device confirmation is pending.
                _updateAndNotifyStatus(true, false, "MQTT: Verifying Device..."); 
                _subscribeToTopicsAndRestartDeviceCheckTimer();
            },
            onFailure: (responseObject) => {
                _error("Failed to connect to MQTT Broker:", responseObject.errorMessage);
                _updateAndNotifyStatus(false, false, "MQTT Broker Connection Failed");
            },
            keepAliveInterval: 30,
            cleanSession: true // Standard for web clients that don't need to resume sessions
        });
    }
    
    function _subscribeToTopicsAndRestartDeviceCheckTimer() {
        if (!client || !client.isConnected()) {
            _error("Cannot subscribe or start device check, not connected to broker.");
            return;
        }
        // Subscribe options allow individual success/failure handlers for more granular control if needed
        client.subscribe(MQTT_STATUS_TOPIC, { qos: 0, 
            onSuccess: () => _log("Subscribed to Status Topic: " + MQTT_STATUS_TOPIC),
            onFailure: (e) => _error("Subscription failed for Status topic", e) 
        });
        client.subscribe(MQTT_ESP32_READY_TOPIC, { qos: 0, 
            onSuccess: () => _log("Subscribed to ESP32 Ready Topic: " + MQTT_ESP32_READY_TOPIC),
            onFailure: (e) => _error("Subscription failed for ESP32 Ready topic", e) 
        });

        _startDeviceReadyCheckTimer();
    }

    function _startDeviceReadyCheckTimer() {
        clearTimeout(deviceReadyTimeoutId);
        _log("Starting timer for ESP32 'online' message (7 seconds).");
        deviceReadyTimeoutId = setTimeout(() => {
            if (connectedToBroker && !esp32ConfirmedOnline) { 
                _log("Timeout: ESP32 did not send 'online' message via MQTT within 7s.");
                // Still connected to broker, but device isn't responding on its ready topic
                _updateAndNotifyStatus(true, false, "MQTT: Device Not Responding");
            }
        }, 7000); 
    }

    function disconnect() {
        _log("disconnect() called by main application.");
        clearTimeout(deviceReadyTimeoutId); // Stop waiting for device ready
        if (client && client.isConnected()) {
            _log("Actively disconnecting Paho client from MQTT broker.");
            try {
                // Best effort: unsubscribe before disconnecting.
                if(client.isConnected()) client.unsubscribe(MQTT_STATUS_TOPIC);
                if(client.isConnected()) client.unsubscribe(MQTT_ESP32_READY_TOPIC);
                if(client.isConnected()) client.disconnect(); // This will trigger onConnectionLost with errorCode 0 if successful.
            } catch (e) {
                _error("Exception during Paho client.disconnect() sequence:", e);
                // Even if Paho's disconnect call fails, force our state.
                 _updateAndNotifyStatus(false, false, "MQTT Disconnect Error");
            }
        } else {
            _log("disconnect() called but Paho client already disconnected or not initialized.");
            // If called when not connected, still ensure our state reflects this for UI.
            _updateAndNotifyStatus(false, false, "MQTT Disconnected");
        }
        // The onConnectionLost (if called by client.disconnect) or the _updateAndNotifyStatus
        // will propagate the disconnected state to js7_main.
    }

    function publish(commandObject) {
        if (!isBrokerConnected()) {
            _error("Cannot publish: Not connected to MQTT broker.");
            return false;
        }
        if (!isFullyConnected()) {
            _log("Warning: Publishing command, but ESP32 device is not confirmed online. Message might be queued or lost.");
        }

        const jsonString = JSON.stringify(commandObject);
        // --- Paho.Message is correct ---
        const message = new Paho.Message(jsonString); // This should be Paho.Message (often aliased as Paho.MQTT.Message in examples, but directly it's Paho.Message)
        message.destinationName = MQTT_COMMAND_TOPIC;

        try {
            client.send(message);
            return true;
        } catch (error) {
            _error("Publish error:", error);
            return false;
        }
    }
    
    function forceDeviceOnlineConfirmation() { // Called by js7_main if BLE provides an alt confirmation
        if (isBrokerConnected() && !esp32ConfirmedOnline) {
            _log("Device online status externally confirmed (e.g., via BLE ack for ESP32's custom handshake).");
            clearTimeout(deviceReadyTimeoutId);
            _updateAndNotifyStatus(true, true, "MQTT Device Online (Confirmed Alt)");
        } else if (!isBrokerConnected()){
             _log("forceDeviceOnlineConfirmation called, but not even connected to broker.");
        }
    }

    // Fixed: Added getStatus function that might be expected by main.js
    function getStatus() {
        return {
            brokerConnected: connectedToBroker,
            deviceOnline: esp32ConfirmedOnline,
            fullyConnected: isFullyConnected()
        };
    }

    return {
        init,
        connect,
        disconnect,
        publish,
        isBrokerConnected,
        isFullyConnected,
        forceDeviceOnlineConfirmation,
        getStatus
    };
})();