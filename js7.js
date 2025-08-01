// js7_main.js (Based on your input_file_0.js structure)

document.addEventListener('DOMContentLoaded', () => {
    // --- BLE State Variables ---
    let bluetoothDevice = null;
    let bleServer = null;
    let bleService = null;
    let commandCharacteristic = null;
    let statusCharacteristic = null;
    const BLE_SERVICE_UUID = "00948910-1cef-4307-86f6-b97aff6b26c5";
    const COMMAND_CHAR_UUID = "1afd03b2-83f0-4189-9793-f1b44a350de0";
    const STATUS_CHAR_UUID = "42e2cbf0-9c82-4519-b502-eb683d14a3d6";

    // --- Application State ---
    const relayMapping = { relay1: "light", relay2: "fan", relay3: "aux" };
    let currentTemp = 24, currentModeIndex = 0, isPowerOn = false;
    const acModes = [ { name: "COOL", icon: "fa-snowflake", color: "text-sky-400" }, { name: "DRY",  icon: "fa-water", color: "text-teal-400" }, { name: "HEAT", icon: "fa-sun", color: "text-yellow-400" }, { name: "FAN",  icon: "fa-fan", color: "text-gray-500" } ];
    const fanSpeedCycleOrder = ["LOW", "MEDIUM", "HIGH", "AUTO"];
    // Visuals for desktop and mobile can be same or different if UI desires
    const fanSpeedVisualDesktop = ["LOW", "MEDIUM", "HIGH", "AUTO"];
    const fanSpeedVisualMobile = ["LOW", "MEDIUM", "HIGH", "AUTO"];
    let currentFanSpeed = fanSpeedCycleOrder[0];
    let relayStates = { relay1: false, relay2: false, relay3: false };
    let roomTemperature = 0, roomHumidity = 0;
    let currentAutomationType = 'fixed';
    let automationConfigs = { fixed: { temp: 24, modeIndex: 0, fan: fanSpeedCycleOrder[0], time: "00:00" }, oscillation: { temp: 24, modeIndex: 0, fan: fanSpeedCycleOrder[0], on_time: "00:00", off_time: "00:00" } };
    let currentCommunicationMode = 'none'; // 'ble', 'mqtt', 'none', or 'mqtt_connecting'

    // --- DOM Elements ---
    const dom = {
        statusDot: document.getElementById('connectionStatusDot'),
        bleConnectButton: document.getElementById('bleConnectButton'),
        mobilePageTitle: document.getElementById('mobilePageTitle'),
        mobileShutdownButton: document.getElementById('mobileShutdownButton'),
        desktopShutdownButton: document.getElementById('desktopShutdownButton'),
        ac: {}, fanDesktop: { levels: {} }, relaysDesktop: {}, envDesktop: {},
        acMobile: {}, fanMobile: { levels: {} }, relaysMobile: {}, envMobile: {},
        mobileMenuButton: document.getElementById('mobileMenuButton'),
        closeMenuButton: document.getElementById('closeMenuButton'),
        mobileMenuDrawer: document.getElementById('mobileMenuDrawer'),
        menuOverlay: document.getElementById('menuOverlay'),
        mobileNavLinks: document.querySelectorAll('#mobileMenuDrawer .mobile-nav-link'),
        mobilePages: {},
        automation: {},
        statusPopup: document.getElementById('statusPopup'),
        statusPopupMessage: document.getElementById('statusPopupMessage'),
        closeStatusPopup: document.getElementById('closeStatusPopup')
    };
    // Populate DOM elements (As per your structure)
    dom.ac.power = document.getElementById('powerButtonDesktop'); dom.ac.tempDown = document.getElementById('tempDownButtonDesktop'); dom.ac.tempUp = document.getElementById('tempUpButtonDesktop'); dom.ac.mode = document.getElementById('modeButtonDesktop'); dom.ac.tempDisplay = document.getElementById('tempDisplayDesktop'); dom.ac.modeIcon = document.getElementById('currentModeIconDesktop');
    dom.fanDesktop.barContainer = document.querySelector('#fanSpeedDesktopContainer .fan-speed-bar-container-desktop');
    fanSpeedVisualDesktop.forEach(s => dom.fanDesktop.levels[s] = dom.fanDesktop.barContainer?.querySelector(`.fan-speed-level-desktop[data-speed="${s}"]`));
    dom.fanDesktop.up = document.getElementById('fanSpeedUpButtonDesktop'); dom.fanDesktop.down = document.getElementById('fanSpeedDownButtonDesktop');
    ['relay1', 'relay2', 'relay3'].forEach(r => dom.relaysDesktop[r] = document.getElementById(`${r}ToggleDesktop`));
    dom.envDesktop.temp = document.getElementById('roomTempValueDesktop'); dom.envDesktop.humidity = document.getElementById('roomHumidityValueDesktop');
    dom.acMobile.power = document.getElementById('powerButtonMobile'); dom.acMobile.tempDown = document.getElementById('tempDownButtonMobile'); dom.acMobile.tempUp = document.getElementById('tempUpButtonMobile'); dom.acMobile.mode = document.getElementById('modeButtonMobile'); dom.acMobile.tempDisplay = document.getElementById('tempDisplayMobile'); dom.acMobile.modeIcon = document.getElementById('currentModeIconMobile');
    dom.fanMobile.barContainer = document.querySelector('#acFanControlsMobilePage .fan-speed-bar-container-mobile');
    fanSpeedVisualMobile.forEach(s => dom.fanMobile.levels[s] = dom.fanMobile.barContainer?.querySelector(`.fan-speed-level-mobile[data-speed-mobile="${s}"]`));
    dom.fanMobile.up = document.getElementById('fanSpeedUpButtonMobile'); dom.fanMobile.down = document.getElementById('fanSpeedDownButtonMobile');
    ['relay1', 'relay2', 'relay3'].forEach(r => dom.relaysMobile[r] = document.getElementById(`${r}ToggleMobile`));
    dom.envMobile.temp = document.getElementById('roomTempValueMobile'); dom.envMobile.humidity = document.getElementById('roomHumidityValueMobile');
    dom.mobilePages.acFanControlsMobilePage = document.getElementById('acFanControlsMobilePage'); dom.mobilePages.relaysMobilePage = document.getElementById('relaysMobilePage'); dom.mobilePages.environmentMobilePage = document.getElementById('environmentMobilePage'); dom.mobilePages.automationPage = document.getElementById('automationPage');
    dom.automation.fixedBtnMobile = document.getElementById('fixedAutomationBtnMobile'); dom.automation.oscillationBtnMobile = document.getElementById('oscillationAutomationBtnMobile'); dom.automation.fixedSettingsMobile = document.getElementById('fixedAutomationSettingsMobile'); dom.automation.oscillationSettingsMobile = document.getElementById('oscillationAutomationSettingsMobile'); dom.automation.fixedTempDisplayMobile = document.getElementById('fixedTempDisplayMobile'); dom.automation.fixedModeIconMobile = document.getElementById('fixedModeIconMobile'); dom.automation.fixedTimeMobile = document.getElementById('fixedTimeMobile'); dom.automation.applyFixedSettingsMobile = document.getElementById('applyFixedSettingsMobile'); dom.automation.oscillationOnTimeMobile = document.getElementById('oscillationOnTimeMobile'); dom.automation.oscillationOffTimeMobile = document.getElementById('oscillationOffTimeMobile'); dom.automation.oscillationTempDisplayMobile = document.getElementById('oscillationTempDisplayMobile'); dom.automation.oscillationModeIconMobile = document.getElementById('oscillationModeIconMobile'); dom.automation.applyOscillationSettingsMobile = document.getElementById('applyOscillationSettingsMobile');
    dom.automation.fanSpeedLevelsFixedMobile = Array.from(document.querySelectorAll('#fixedAutomationSettingsMobile .fan-speed-level-mobile-auto'));
    dom.automation.fanSpeedLevelsOscillationMobile = Array.from(document.querySelectorAll('#oscillationAutomationSettingsMobile .fan-speed-level-mobile-auto'));
    dom.automation.fixedBtnDesktop = document.getElementById('fixedAutomationBtnDesktop'); dom.automation.oscillationBtnDesktop = document.getElementById('oscillationAutomationBtnDesktop'); dom.automation.fixedSettingsDesktop = document.getElementById('fixedAutomationSettingsDesktop'); dom.automation.oscillationSettingsDesktop = document.getElementById('oscillationAutomationSettingsDesktop'); dom.automation.fixedTempDisplayDesktop = document.getElementById('fixedTempDisplayDesktop'); dom.automation.fixedModeIconDesktop = document.getElementById('fixedModeIconDesktop'); dom.automation.fixedTimeDesktop = document.getElementById('fixedTimeDesktop'); dom.automation.applyFixedSettingsDesktop = document.getElementById('applyFixedSettingsDesktop'); dom.automation.oscillationOnTimeDesktop = document.getElementById('oscillationOnTimeDesktop'); dom.automation.oscillationOffTimeDesktop = document.getElementById('oscillationOffTimeDesktop'); dom.automation.oscillationTempDisplayDesktop = document.getElementById('oscillationTempDisplayDesktop'); dom.automation.oscillationModeIconDesktop = document.getElementById('oscillationModeIconDesktop'); dom.automation.applyOscillationSettingsDesktop = document.getElementById('applyOscillationSettingsDesktop');
    dom.automation.fanSpeedLevelsFixedDesktop = Array.from(document.querySelectorAll('#fixedAutomationSettingsDesktop .fan-speed-level-desktop-auto'));
    dom.automation.fanSpeedLevelsOscillationDesktop = Array.from(document.querySelectorAll('#oscillationAutomationSettingsDesktop .fan-speed-level-desktop-auto'));
    const infoButtons = document.querySelectorAll('.info-button');


    // --- Helper: Check if connected and ready for user actions (NO UI POPUPS HERE) ---
    function isConnectedAndReadyForUserAction() {
        if (currentCommunicationMode === 'ble' && bluetoothDevice?.gatt?.connected && commandCharacteristic) {
            return true;
        }
        // MQTT_Ctrl.isFullyConnected() checks broker connection AND if ESP32 is confirmed online
        if (currentCommunicationMode === 'mqtt' && typeof MQTT_Ctrl !== 'undefined' && MQTT_Ctrl.isFullyConnected()) {
            return true;
        }
        return false;
    }

    // --- UI Update Functions ---
    function updateConnectionStatusUI(statusMsg = "Connect to Device") {
        let isConsideredConnected = false; // For visual cues like dot color and button style
        let displayedMessage = statusMsg;
        let deviceName = "Device";

        if (currentCommunicationMode === 'ble' && bluetoothDevice?.gatt?.connected) {
            isConsideredConnected = true;
            deviceName = bluetoothDevice.name || 'BLE Device';
            displayedMessage = statusMsg.includes("Disconnect") ? statusMsg : `Disconnect from ${deviceName}`;
        } else if (currentCommunicationMode === 'mqtt' && typeof MQTT_Ctrl !== 'undefined') {
            if (MQTT_Ctrl.isFullyConnected()) {
                isConsideredConnected = true;
                deviceName = 'SANKAR_AC_BLE_MQTT (MQTT)';
                displayedMessage = "MQTT Device Online"; // Preferred success message
            } else if (MQTT_Ctrl.isBrokerConnected()) {
                isConsideredConnected = true; // Green dot, but specific message
                deviceName = 'MQTT Broker';
                displayedMessage = statusMsg; // Uses messages like "Verifying..." or "Device Not Responding"
            } else { // Not connected to broker
                displayedMessage = statusMsg;
            }
        } else if (currentCommunicationMode === 'mqtt_connecting') {
             displayedMessage = "Attempting MQTT..."; // Or statusMsg if provided
        }


        dom.statusDot.classList.toggle('connected', isConsideredConnected);
        dom.statusDot.classList.toggle('disconnected', !isConsideredConnected);
        dom.bleConnectButton.classList.toggle('connected', isConsideredConnected);
        dom.bleConnectButton.classList.toggle('disconnected', !isConsideredConnected);

        if (isConsideredConnected) {
            dom.bleConnectButton.textContent = displayedMessage; // Dynamic message
            dom.bleConnectButton.removeEventListener('click', initiateConnectionProcess);
            dom.bleConnectButton.addEventListener('click', disconnectFromCurrentDevice);
        } else {
            dom.bleConnectButton.textContent = displayedMessage;
            dom.bleConnectButton.removeEventListener('click', disconnectFromCurrentDevice);
            dom.bleConnectButton.addEventListener('click', initiateConnectionProcess);
        }
        dom.bleConnectButton.disabled = false;
    }

    // ... (Other UI update functions: updateAcPowerButtonUI, updateAcControlsUI, etc. remain as in your input_file_0.js)
    function updateAcPowerButtonUI(powerButtonEl, isPowered) { if(powerButtonEl) { powerButtonEl.classList.toggle('bg-red-600', !isPowered); powerButtonEl.classList.toggle('hover:bg-red-500', !isPowered); powerButtonEl.classList.toggle('power-button-on', isPowered); } }
    function updateAcControlsUI(tempDisplayEl, modeIconEl, temp, modeIndex, isPowered = true) { if (tempDisplayEl) tempDisplayEl.textContent = temp; if (modeIconEl) { const mode = acModes[modeIndex]; modeIconEl.innerHTML = `<i class="fas ${mode.icon} ${mode.color}"></i>`; modeIconEl.querySelector('i')?.classList.toggle('mode-active', isPowered); } }
    function updateFanSpeedUIDesktop() { const currentSpeedIdx = fanSpeedCycleOrder.indexOf(currentFanSpeed); fanSpeedVisualDesktop.forEach((speed, visualIdx) => { const el = dom.fanDesktop.levels[speed]; if (!el) return; el.classList.remove('active', 'filled'); if (isPowerOn) { if (visualIdx <= currentSpeedIdx) el.classList.add('filled'); if (speed === currentFanSpeed) el.classList.add('active'); } }); }
    function updateFanSpeedUIMobile() { const currentSpeedIdx = fanSpeedCycleOrder.indexOf(currentFanSpeed); fanSpeedVisualMobile.forEach((speed, visualIdx) => { const el = dom.fanMobile.levels[speed]; if (!el) return; el.classList.remove('active', 'filled'); if (isPowerOn) { if (visualIdx <= currentSpeedIdx) el.classList.add('filled'); if (speed === currentFanSpeed) el.classList.add('active'); } }); }
    function updateRelaysSection(relayElementsDesktop, relayElementsMobile) { for (const relayId in relayStates) { if(relayElementsDesktop[relayId]) relayElementsDesktop[relayId].checked = relayStates[relayId]; if(relayElementsMobile[relayId]) relayElementsMobile[relayId].checked = relayStates[relayId]; } }
    function updateEnvironmentSection(envElementsDesktop, envElementsMobile) { if(envElementsDesktop.temp) envElementsDesktop.temp.innerHTML = `${roomTemperature}<span class="text-base font-normal"> °C</span>`; if(envElementsDesktop.humidity) envElementsDesktop.humidity.innerHTML = `${roomHumidity}<span class="text-base font-normal"> %</span>`; if(envElementsMobile.temp) envElementsMobile.temp.innerHTML = `${roomTemperature}<span class="text-base font-normal"> °C</span>`; if(envElementsMobile.humidity) envElementsMobile.humidity.innerHTML = `${roomHumidity}<span class="text-base font-normal"> %</span>`; }
    function updateAutomationUI() { if (dom.automation.fixedBtnMobile) { dom.automation.fixedBtnMobile.classList.toggle('active-automation', currentAutomationType === 'fixed'); dom.automation.oscillationBtnMobile.classList.toggle('active-automation', currentAutomationType === 'oscillation'); } if (dom.automation.fixedBtnDesktop) { dom.automation.fixedBtnDesktop.classList.toggle('active-automation', currentAutomationType === 'fixed'); dom.automation.oscillationBtnDesktop.classList.toggle('active-automation', currentAutomationType === 'oscillation'); } if (dom.automation.fixedSettingsMobile) { dom.automation.fixedSettingsMobile.classList.toggle('visible', currentAutomationType === 'fixed'); dom.automation.fixedSettingsMobile.style.display = currentAutomationType === 'fixed' ? '' : 'none'; dom.automation.oscillationSettingsMobile.classList.toggle('visible', currentAutomationType === 'oscillation'); dom.automation.oscillationSettingsMobile.style.display = currentAutomationType === 'oscillation' ? '' : 'none'; } if (dom.automation.fixedSettingsDesktop) { dom.automation.fixedSettingsDesktop.classList.toggle('visible', currentAutomationType === 'fixed'); dom.automation.fixedSettingsDesktop.style.display = currentAutomationType === 'fixed' ? '' : 'none'; dom.automation.oscillationSettingsDesktop.classList.toggle('visible', currentAutomationType === 'oscillation'); dom.automation.oscillationSettingsDesktop.style.display = currentAutomationType === 'oscillation' ? '' : 'none'; } const fixedConf = automationConfigs.fixed; updateAcControlsUI(dom.automation.fixedTempDisplayMobile, dom.automation.fixedModeIconMobile, fixedConf.temp, fixedConf.modeIndex, true); if (dom.automation.fixedTimeMobile) dom.automation.fixedTimeMobile.value = fixedConf.time; updateAutomationFanSpeedUI(fixedConf.fan, dom.automation.fanSpeedLevelsFixedMobile); updateAcControlsUI(dom.automation.fixedTempDisplayDesktop, dom.automation.fixedModeIconDesktop, fixedConf.temp, fixedConf.modeIndex, true); if (dom.automation.fixedTimeDesktop) dom.automation.fixedTimeDesktop.value = fixedConf.time; updateAutomationFanSpeedUI(fixedConf.fan, dom.automation.fanSpeedLevelsFixedDesktop); const oscConf = automationConfigs.oscillation; updateAcControlsUI(dom.automation.oscillationTempDisplayMobile, dom.automation.oscillationModeIconMobile, oscConf.temp, oscConf.modeIndex, true); if (dom.automation.oscillationOnTimeMobile) dom.automation.oscillationOnTimeMobile.value = oscConf.on_time; if (dom.automation.oscillationOffTimeMobile) dom.automation.oscillationOffTimeMobile.value = oscConf.off_time; updateAutomationFanSpeedUI(oscConf.fan, dom.automation.fanSpeedLevelsOscillationMobile); updateAcControlsUI(dom.automation.oscillationTempDisplayDesktop, dom.automation.oscillationModeIconDesktop, oscConf.temp, oscConf.modeIndex, true); if (dom.automation.oscillationOnTimeDesktop) dom.automation.oscillationOnTimeDesktop.value = oscConf.on_time; if (dom.automation.oscillationOffTimeDesktop) dom.automation.oscillationOffTimeDesktop.value = oscConf.off_time; updateAutomationFanSpeedUI(oscConf.fan, dom.automation.fanSpeedLevelsOscillationDesktop); }
    function updateAutomationFanSpeedUI(selectedFanSpeed, fanLevelsElements) { fanLevelsElements.forEach(el => { const speed = el.dataset.speedAutomation; el.classList.remove('active', 'filled'); const selectedIdx = fanSpeedCycleOrder.indexOf(selectedFanSpeed); const currentIdx = fanSpeedCycleOrder.indexOf(speed); if (currentIdx <= selectedIdx) el.classList.add('filled'); if (speed === selectedFanSpeed) el.classList.add('active'); }); }
    function updateAllUIs() { updateAcPowerButtonUI(dom.ac.power, isPowerOn); updateAcPowerButtonUI(dom.acMobile.power, isPowerOn); updateAcControlsUI(dom.ac.tempDisplay, dom.ac.modeIcon, currentTemp, currentModeIndex, isPowerOn); updateAcControlsUI(dom.acMobile.tempDisplay, dom.acMobile.modeIcon, currentTemp, currentModeIndex, isPowerOn); updateFanSpeedUIDesktop(); updateFanSpeedUIMobile(); updateRelaysSection(dom.relaysDesktop, dom.relaysMobile); updateEnvironmentSection(dom.envDesktop, dom.envMobile); updateAutomationUI(); }
    function showStatusPopup(message) { dom.statusPopupMessage.textContent = message; dom.statusPopup.classList.add('visible'); }
    function hideStatusPopup() { dom.statusPopup.classList.remove('visible'); }
    dom.closeStatusPopup.addEventListener('click', hideStatusPopup);
    dom.statusPopup.addEventListener('click', (e) => { if (e.target === dom.statusPopup) hideStatusPopup(); });
    let activeTooltip = null; function toggleTooltip(button) { const tooltip = button.querySelector('.info-tooltip'); if (!tooltip) return; if (activeTooltip && activeTooltip !== tooltip) activeTooltip.classList.remove('visible'); tooltip.classList.toggle('visible'); activeTooltip = tooltip.classList.contains('visible') ? tooltip : null; }
    document.addEventListener('click', (e) => { if (activeTooltip) { const clickedOnButton = e.target.closest('.info-button'); const clickedOnTooltip = e.target.closest('.info-tooltip'); if (!clickedOnTooltip && !clickedOnButton) { activeTooltip.classList.remove('visible'); activeTooltip = null; } else if (clickedOnButton && clickedOnButton.querySelector('.info-tooltip') === activeTooltip) e.stopPropagation(); }});
    infoButtons.forEach(button => { button.addEventListener('click', (e) => { e.stopPropagation(); toggleTooltip(button); }); });


    // --- Connection Orchestration ---
    async function initiateConnectionProcess() {
        // Always attempt BLE first when the user clicks "Connect".
        console.log("Main: Initiating connection process...");
        await connectBluetoothDevice();
    }

    async function disconnectFromCurrentDevice() {
        console.log("Main: Disconnecting from current device mode:", currentCommunicationMode);
        if (currentCommunicationMode === 'ble') {
            await disconnectBluetoothDevice(); // This will handle its own UI and state updates
        } else if (currentCommunicationMode === 'mqtt' && typeof MQTT_Ctrl !== 'undefined') {
            MQTT_Ctrl.disconnect(); // This will trigger handleMqttConnectionStatusChange for UI
        } else { // If mode is 'none' or unknown, ensure UI reflects a disconnected state.
            currentCommunicationMode = 'none';
            updateConnectionStatusUI('Connect to Device');
        }
    }
    
    // Callback from MQTT_Ctrl for connection status updates
    function handleMqttConnectionStatusChange(_commMode, isBrokerConnectedFlag, message) {
        console.log("Main: MQTT_Ctrl reported - BrokerConnected:", isBrokerConnectedFlag, "Message:", message);

        if (MQTT_Ctrl.isFullyConnected()) { // Broker AND Device Confirmed
            currentCommunicationMode = 'mqtt';
            updateConnectionStatusUI("MQTT Device Online");
            showStatusPopup("MQTT Connection to SANKAR_AC_BLE_MQTT is Active!");
            sendInitialAcStateIfConnected(); // Send initial AC state as device is responsive
        } else if (MQTT_Ctrl.isBrokerConnected()) { // Only Broker, Device pending/unresponsive
            currentCommunicationMode = 'mqtt'; // Still 'mqtt' but device not fully confirmed
            updateConnectionStatusUI(message); // e.g., "Verifying Device..." or "Device Not Responding"
            if (message.toLowerCase().includes("device not responding")) {
                showStatusPopup("Connected to MQTT Broker, but SANKAR_AC_BLE_MQTT device not responding.");
            }
        } else { // Not connected to Broker (or explicit disconnect)
            // Only reset mode to 'none' if we were actually in 'mqtt' or 'mqtt_connecting'
            if (currentCommunicationMode === 'mqtt' || currentCommunicationMode === 'mqtt_connecting') {
                currentCommunicationMode = 'none';
                resetDeviceStateAndUI(); // Clear device state
            }
            updateConnectionStatusUI(message); // Show "MQTT Disconnected", "Connection Failed", or "Connect to Device"
            // Only show error popups for failures, not deliberate disconnects.
            if (message.toLowerCase().includes("failed") || message.toLowerCase().includes("lost")) {
                showStatusPopup(message);
            }
        }
    }


    // --- Web Bluetooth Logic ---
    async function connectBluetoothDevice() {
        if (!navigator.bluetooth) {
            console.warn("Main: Web Bluetooth API not available.");
            updateConnectionStatusUI('Web Bluetooth Unavailable'); // More specific message
            promptForMqttConnection("Web Bluetooth is not available on this browser.");
            return;
        }
        if (bluetoothDevice?.gatt?.connected && currentCommunicationMode === 'ble') {
            console.log('Main: Already connected via BLE.');
            updateConnectionStatusUI(`Disconnect from ${bluetoothDevice.name || 'BLE Device'}`); // Ensure button text is correct
            return;
        }

        currentCommunicationMode = 'ble_connecting'; // Intermediate state
        updateConnectionStatusUI('Requesting BLE Device...');
        dom.bleConnectButton.disabled = true;

        try {
            bluetoothDevice = await navigator.bluetooth.requestDevice({
                filters: [{ services: [BLE_SERVICE_UUID] }]
            });

            // If MQTT was active, disconnect it. BLE takes precedence.
            if ((currentCommunicationMode === 'mqtt' || currentCommunicationMode === 'mqtt_connecting') && typeof MQTT_Ctrl !== 'undefined' && MQTT_Ctrl.isBrokerConnected()) {
                console.log("Main: BLE connection succeeding, disconnecting active/pending MQTT connection.");
                currentCommunicationMode = 'ble_mqtt_switch'; // Special state to manage UI during switch
                MQTT_Ctrl.disconnect(); // Triggers its callbacks which update UI eventually
                // Add a small delay to allow MQTT disconnect to process somewhat
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            currentCommunicationMode = 'ble_connecting'; // Re-assert after potential MQTT disconnect

            console.log('Main: BLE Device Selected:', bluetoothDevice.name || bluetoothDevice.id);
            updateConnectionStatusUI(`Connecting to ${bluetoothDevice.name || 'BLE Device'}...`);
            
            // It's crucial to remove old listener before adding a new one if retrying connection
            if (bluetoothDevice.removeEventListener) { // Check if method exists (might be null on first try)
                bluetoothDevice.removeEventListener('gattserverdisconnected', onBleDisconnected);
            }
            bluetoothDevice.addEventListener('gattserverdisconnected', onBleDisconnected);

            bleServer = await bluetoothDevice.gatt.connect();
            console.log('Main: Connected to GATT Server.');
            bleService = await bleServer.getPrimaryService(BLE_SERVICE_UUID);
            commandCharacteristic = await bleService.getCharacteristic(COMMAND_CHAR_UUID);
            statusCharacteristic = await bleService.getCharacteristic(STATUS_CHAR_UUID);

            await statusCharacteristic.startNotifications();
            statusCharacteristic.addEventListener('characteristicvaluechanged', handleBleCharacteristicValueChanged);

            currentCommunicationMode = 'ble'; // FINAL BLE connected state
            console.log('Main: Successfully connected via BLE.');
            updateConnectionStatusUI(`Disconnect from ${bluetoothDevice.name || 'BLE Device'}`);
            sendInitialAcStateIfConnected(); // Send current AC state

        } catch (error) {
            console.error('Main: Bluetooth Connection Error -', error.name, error.message);
            cleanupBleResources(); // Always cleanup BLE resources on any error
            let previousMode = currentCommunicationMode; // Capture mode before resetting
            currentCommunicationMode = 'none'; // Reset mode after cleanup

            let userFacingErrorMsg = 'BLE Connection Failed';
            if (error.name === 'NotFoundError') {
                userFacingErrorMsg = 'BLE Device Not Found. Ensure it is on and in range.';
            } else if (error.name === 'AbortError' || (error.message && error.message.toLowerCase().includes("cancelled"))) {
                userFacingErrorMsg = 'BLE pairing/selection cancelled by user.';
            } else {
                // For other errors, provide a generic message but log details
                userFacingErrorMsg = 'BLE Connection Error. Check console.';
            }
            
            updateConnectionStatusUI(userFacingErrorMsg); // Show this on the button
            dom.bleConnectButton.disabled = false; // Re-enable button
            
            // Prompt for MQTT if:
            // 1. The error was 'NotFoundError' or 'AbortError' (user cancelled chooser)
            // 2. We weren't in the middle of deliberately switching from MQTT to BLE.
            if (previousMode !== 'ble_mqtt_switch') {
                 if (error.name === 'NotFoundError' || error.name === 'AbortError') {
                    promptForMqttConnection(userFacingErrorMsg);
                 } else {
                     showStatusPopup(userFacingErrorMsg); // Show a popup for other types of BLE errors
                 }
            } else {
                 // If it was 'ble_mqtt_switch', and BLE failed, revert to trying MQTT.
                 console.log("Main: BLE connection failed during MQTT->BLE switch. Re-attempting MQTT if user agrees.");
                 promptForMqttConnection("BLE attempt failed after choosing BLE over MQTT.");
            }
        }
    }

    function onBleDisconnected(event) {
        console.log('Main: BLE Device Disconnected.', event ? `(Name: ${event.target.name || event.target.id})` : '(Unknown device)');
        const wasBleMode = currentCommunicationMode === 'ble'; // Check if BLE was the active mode
        
        cleanupBleResources(); // Always perform cleanup

        if (wasBleMode) { // Only change state and show popup if we were truly in BLE mode
            currentCommunicationMode = 'none';
            resetDeviceStateAndUI();
            updateConnectionStatusUI('Connect to Device'); // Reset button to generic "Connect"
            showStatusPopup("BLE Device Disconnected.");
        }
        // If it was 'ble_connecting' or 'ble_mqtt_switch' and disconnected, the catch block in connectBluetoothDevice handles it.
    }

    async function disconnectBluetoothDevice() {
        if (!bluetoothDevice) {
            console.log("Main: disconnectBluetoothDevice called, but no bluetoothDevice object.");
            onBleDisconnected(null); // Ensure UI is reset
            return;
        }
        if (bluetoothDevice.gatt && bluetoothDevice.gatt.connected) {
            console.log('Main: Attempting to disconnect from Bluetooth Device...');
            currentCommunicationMode = 'ble_disconnecting'; // Intermediate state
            updateConnectionStatusUI('Disconnecting BLE...');
            dom.bleConnectButton.disabled = true;
            try {
                // Important: Remove listener *before* calling disconnect to avoid race conditions
                // or handling an event for a device we're intentionally disconnecting.
                bluetoothDevice.removeEventListener('gattserverdisconnected', onBleDisconnected);
                await bluetoothDevice.gatt.disconnect(); // Await this call
                console.log("Main: Native bluetoothDevice.gatt.disconnect() call completed.");
            } catch (error) {
                console.error("Main: Error during bluetoothDevice.gatt.disconnect():", error);
            } finally {
                // onBleDisconnected will do the primary cleanup and UI update for disconnect
                onBleDisconnected({ target: bluetoothDevice }); // Manually trigger full cleanup and UI reset.
            }
        } else {
            console.log('Main: BLE Not connected or already disconnected.');
            onBleDisconnected(null); // Call to ensure state is consistent and UI updated
        }
    }
    

    function cleanupBleResources() {
        if (statusCharacteristic) {
            try { statusCharacteristic.removeEventListener('characteristicvaluechanged', handleBleCharacteristicValueChanged); }
            catch (e) { console.warn("Main: Error removing BLE status listener:", e.message); }
        }
        if (bluetoothDevice) {
             try { bluetoothDevice.removeEventListener('gattserverdisconnected', onBleDisconnected); }
             catch(e) { console.warn("Main: Error removing gattserverdisconnected listener:", e.message); }
        }
        bluetoothDevice = null;
        bleServer = null;
        bleService = null;
        commandCharacteristic = null;
        statusCharacteristic = null;
        console.log("Main: BLE resources cleaned up.");
    }

    function handleBleCharacteristicValueChanged(event) {
        const value = event.target.value; // This is a DataView
        const decoder = new TextDecoder('utf-8');
        const incomingDataString = decoder.decode(value);
        // console.log("Main: BLE RX Raw:", incomingDataString);
        processIncomingDeviceData(incomingDataString);
    }

    // --- MQTT Interaction & Activation ---
    async function promptForMqttConnection(reasonForPrompt) {
        // Short delay to allow browser to process any previous dialogs/errors
        await new Promise(resolve => setTimeout(resolve, 100));

        if (confirm(`${reasonForPrompt} Would you like to try connecting via the Internet (MQTT)?`)) {
            console.log("Main: User opted for MQTT connection.");
            
            if (typeof MQTT_Ctrl === 'undefined') {
                console.error("Main: MQTT_Ctrl is not defined! Ensure js6_mqtt.js is loaded.");
                showStatusPopup("MQTT System Error (MQTT_Ctrl missing).");
                updateConnectionStatusUI("MQTT Error");
                return;
            }

            currentCommunicationMode = 'mqtt_connecting'; // Set mode
            updateConnectionStatusUI("Attempting MQTT Connection..."); // Initial UI update

            // If BLE is somehow still connected, tell ESP32 to activate its MQTT feature (if needed)
            // This assumes ESP32 might have MQTT feature off by default and needs a BLE command to enable.
            if (bluetoothDevice?.gatt?.connected) {
                console.log("Main: BLE is connected. Sending 'mqtt_activate' command to ESP32 via BLE first.");
                const activationSent = await requestEspMqttActivationViaBle();
                if (activationSent) {
                    // showStatusPopup("MQTT activation command sent to ESP32 via BLE.");
                    console.log("Main: MQTT activation command sent via BLE. Now disconnecting BLE to proceed with MQTT.");
                    await disconnectBluetoothDevice(); // Gracefully disconnect BLE
                     // Give a moment for BLE disconnect to settle before MQTT connect
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                    // showStatusPopup("Failed to send MQTT activation via BLE. Proceeding with MQTT connect attempt anyway.");
                    console.warn("Main: Failed to send MQTT activation command via BLE. Will still try MQTT.");
                }
            }
            // Now, attempt MQTT connection via MQTT_Ctrl
            MQTT_Ctrl.connect(); // MQTT_Ctrl will use its callback to update status via handleMqttConnectionStatusChange
        } else {
            console.log("Main: User declined MQTT connection.");
            // If no other connection mode is active, reset button to default
            if (currentCommunicationMode !== 'ble') { 
                updateConnectionStatusUI('Connect to Device');
            }
        }
    }
    
    async function requestEspMqttActivationViaBle() {
        if (currentCommunicationMode !== 'ble' && !(bluetoothDevice?.gatt?.connected)) {
            console.warn("requestEspMqttActivationViaBle: Cannot send, BLE not actively connected.");
            return false; // BLE isn't the active mode or not connected
        }
        console.log("Main: Sending 'mqtt_activate' command to ESP32 via BLE...");
        // Assuming sendCommand will correctly use the active BLE connection
        return await sendCommand({ type: "system_control", command: "mqtt_activate" });
    }


    // --- Common Data Processing ---
    function processIncomingDeviceData(jsonDataString) {
        // console.log("Main: Processing Data:", jsonDataString); // Can be very verbose
        try {
            const data = JSON.parse(jsonDataString);

            if (data.roomTemp !== undefined) { roomTemperature = parseFloat(data.roomTemp).toFixed(1); }
            if (data.humidity !== undefined) { roomHumidity = parseFloat(data.humidity).toFixed(1); }
            if (data.type === "ac_fan" && data.power !== undefined) { isPowerOn = (data.power === "ON"); if (data.temp !== undefined) currentTemp = data.temp; if (data.mode !== undefined) { const modeIdx = acModes.findIndex(m => m.name === data.mode); if (modeIdx !== -1) currentModeIndex = modeIdx; } if (data.fan_speed !== undefined) currentFanSpeed = data.fan_speed; }
            if (data.relay_states) { Object.keys(data.relay_states).forEach(key => { const dRN = key.toLowerCase(); const mIRID = Object.keys(relayMapping).find(id => relayMapping[id] === dRN); if (mIRID && relayStates.hasOwnProperty(mIRID)) { relayStates[mIRID] = (data.relay_states[key] === "ON"); } });
            } else if (data.type === "relay" && data.relay !== undefined && data.value !== undefined) { const dRN = data.relay.toLowerCase(); const mIRID = Object.keys(relayMapping).find(id => relayMapping[id] === dRN); if (mIRID && relayStates.hasOwnProperty(mIRID)) { relayStates[mIRID] = (data.value === "ON"); } }
            if (data.type && (data.type.endsWith("_ack") || data.type.endsWith("_nack"))) { if (data.type === "schedule_ack") showStatusPopup(`Schedule "${data.schedule}" confirmed by ESP32!`); else if (data.type === "schedule_nack") showStatusPopup(`Schedule "${data.schedule}" rejected by ESP32: ${data.reason || "Unknown"}`); }
            
            // ESP32 specific message for BLE client connected notification (confirming ESP32's own state)
            if (data.type === "connection_status" && data.status === "connected_to_esp32" && currentCommunicationMode === 'ble') {
                console.log("Main: Received BLE connection confirmation from ESP32.");
                // This is an ACK from ESP32; UI already reflects BLE connection if successful.
            }
            // This is for the ESP32's unique handshake where it confirms MQTT readiness VIA a BLE NOTIFICATION
            // if the web app sent "mqtt_initiate_ble_response" to it via MQTT. Our current js6_mqtt doesn't do that.
            // But if ESP32 *did* send this for any reason, and we are in MQTT mode, react.
             if (data.type === "mqtt_handshake" && data.status === "mqtt_mode_confirmed") {
                console.log("Main: Received 'mqtt_mode_confirmed' from ESP32 (likely via BLE notification).");
                if (currentCommunicationMode === 'mqtt_connecting' || (currentCommunicationMode === 'mqtt' && MQTT_Ctrl && !MQTT_Ctrl.isFullyConnected() && MQTT_Ctrl.isBrokerConnected())){
                     console.log("Main: Using this BLE-relayed MQTT confirmation to mark MQTT as fully connected.");
                     // This might pre-empt MQTT_Ctrl's own 'esp32_ready' topic handler if this arrives first.
                     if (MQTT_Ctrl) MQTT_Ctrl.forceDeviceOnlineConfirmation(); // Add this method to MQTT_Ctrl
                     // handleMqttConnectionStatusChange will then be called by MQTT_Ctrl.forceDeviceOnlineConfirmation()
                }
            }
             // This is feedback from ESP32 if we sent 'mqtt_activate' via BLE.
            if (data.type === "mqtt_feedback") { // e.g., {"type":"mqtt_feedback", "status":"mqtt_activation_received"}
                console.log("Main: ESP32 Feedback (via BLE) for MQTT command:", data.status);
                // showStatusPopup("ESP32 MQTT activation signal: " + data.status); // Can be too noisy
            }

        } catch (error) {
            console.warn("Main: JSON Parse Error in processIncomingDeviceData. Raw:", jsonDataString, "Error:", error.message);
        } finally {
            updateAllUIs(); // Always refresh UI after processing data
        }
    }
    
    function resetDeviceStateAndUI() {
        console.log("Main: Resetting device state and UI.");
        roomTemperature = 0; roomHumidity = 0;
        isPowerOn = false; currentTemp = 24; currentModeIndex = 0; currentFanSpeed = fanSpeedCycleOrder[0];
        Object.keys(relayStates).forEach(k => relayStates[k] = false);
        updateAllUIs();
    }

    async function sendInitialAcStateIfConnected() {
        await new Promise(resolve => setTimeout(resolve, 700)); // Allow connection to fully settle
        if (isConnectedAndReadyForUserAction()) {
            console.log(`Main: Sending initial AC state via ${currentCommunicationMode}.`);
            const success = await sendAcState();
            if (success) {
                 console.log(`Main: Initial AC state sent successfully via ${currentCommunicationMode}.`);
            } // else, sendCommand would have shown error
        } else {
            console.log("Main: sendInitialAcStateIfConnected - Not connected/ready, skipping initial state send.");
        }
    }

    // --- Unified Command Sender ---
    async function sendCommand(commandObject) {
        if (!isConnectedAndReadyForUserAction()) {
            // Only show popup IF the call was likely due to direct user action on a control
            // For scheduled/automatic things, console log is enough. This function is generic, so needs care.
            // For now, the user action handlers check first, so this popup acts as a safeguard.
            showStatusPopup("Command not sent: Not connected. Please connect first.");
            return false;
        }

        let success = false;
        console.log(`Main: Attempting to send command via ${currentCommunicationMode}:`, commandObject);

        if (currentCommunicationMode === 'ble') {
            if (!commandCharacteristic) {
                console.error("Main: BLE commandCharacteristic is null. Cannot send.");
                showStatusPopup("BLE Error: Characteristic missing.");
                return false;
            }
            const jsonString = JSON.stringify(commandObject);
            const encoder = new TextEncoder();
            const dataToSend = encoder.encode(jsonString);
            try {
                await commandCharacteristic.writeValueWithoutResponse(dataToSend);
                success = true;
            } catch (error) {
                console.error("Main: BLE TX Error:", error.name, error.message);
                showStatusPopup(`BLE Send Failed: ${error.message.split('.')[0]}.`); // Short error
                // More critical errors might warrant a disconnect attempt or specific handling.
                if (error.name === 'NetworkError' || error.name === 'NotFoundError') { // e.g. device went out of range during operation
                    disconnectBluetoothDevice(); // Attempt to reset connection state
                }
            }
        } else if (currentCommunicationMode === 'mqtt' && typeof MQTT_Ctrl !== 'undefined') {
            success = MQTT_Ctrl.publish(commandObject);
            if (!success) {
                showStatusPopup(`MQTT Send Failed for type "${commandObject.type}".`);
            }
        } else {
            console.warn("Main: No active/valid communication mode for sendCommand.");
            showStatusPopup("Command not sent: Connection mode issue.");
        }
        if(success) console.log("Main: Command sent successfully via " + currentCommunicationMode);
        return success;
    }

    // --- Specific Command Senders ---
    async function sendAcState() { return await sendCommand({ type: "ac_fan", power:isPowerOn?"ON":"OFF", temp:currentTemp, mode:acModes[currentModeIndex].name, fan_speed:currentFanSpeed }); }
    async function sendRelayState(cleanRelayId, isOn) { return await sendCommand({ type: "relay", relay: cleanRelayId, value: isOn ? "ON" : "OFF" }); }
    async function sendShutdownCommand() { return await sendCommand({ type: "system_control", command: "shutdown" }); }
    
    async function applyAutomationSchedule(type) {
        if (!isConnectedAndReadyForUserAction()) { showStatusPopup("Connect first to apply schedule."); return false; }
        const config = automationConfigs[type];
        let scheduleCommand;
        // Construct the schedule object to match ESP32's expectation for BLE 'schedule' command
        // ESP32 `processBleCommand` type 'schedule' also takes power, mode, temp, fan for that schedule.
        if (type === 'fixed') {
            scheduleCommand = { type: "schedule", schedule_type: "fixed", time: config.time, power: "ON", temp: config.temp, mode: acModes[config.modeIndex].name, fan_speed: config.fan };
        } else if (type === 'oscillation') {
            scheduleCommand = { type: "schedule", schedule_type: "oscillation", on_time: config.on_time, off_time: config.off_time, power: "ON", temp: config.temp, mode: acModes[config.modeIndex].name, fan_speed: config.fan  };
        } else { console.error("Main: Unknown automation type for schedule:", type); return false; }
        
        showStatusPopup(`Applying ${type} schedule via ${currentCommunicationMode}...`);
        const success = await sendCommand(scheduleCommand);
        if(success) {
             showStatusPopup(`${type.charAt(0).toUpperCase() + type.slice(1)} schedule command sent.`);
        } // else sendCommand shows its own error.
        return success;
    }


    // --- Event Handlers for UI controls (they check isConnectedAndReadyForUserAction first) ---
    async function handlePowerToggle(uiContext) { if (!isConnectedAndReadyForUserAction()) { showStatusPopup("Please connect to a device first."); return; } const oS = isPowerOn; isPowerOn = !oS; updateAllUIs(); if (!await sendAcState()) { isPowerOn = oS; updateAllUIs(); /* sendAcState shows error */ } }
    async function handleTempChange(uiContext, increase) { if (!isConnectedAndReadyForUserAction()) { showStatusPopup("Please connect to a device first."); return; } if (!isPowerOn) { showStatusPopup("AC is off. Turn it on to change temperature."); return; } const oT = currentTemp; if (increase && oT < 30) currentTemp++; else if (!increase && oT > 16) currentTemp--; const tDEl = uiContext==='desktop'?dom.ac.tempDisplay:dom.acMobile.tempDisplay; if (oT!==currentTemp && tDEl){tDEl.classList.add('temp-changing');setTimeout(()=>tDEl.classList.remove('temp-changing'),350);} updateAllUIs(); if (!await sendAcState()) { currentTemp = oT; updateAllUIs(); } }
    async function handleModeChange(uiContext) { if (!isConnectedAndReadyForUserAction()) { showStatusPopup("Please connect to a device first."); return; } if (!isPowerOn) { showStatusPopup("AC is off. Turn it on to change mode."); return; } const oMI = currentModeIndex; currentModeIndex = (oMI + 1) % acModes.length; updateAllUIs(); if (!await sendAcState()) { currentModeIndex = oMI; updateAllUIs(); } }
    async function handleFanCycle(increase) { if (!isConnectedAndReadyForUserAction()) { showStatusPopup("Please connect to a device first."); return; } if (!isPowerOn) { showStatusPopup("AC is off. Turn it on to change fan speed."); return; } const oFS = currentFanSpeed; let idx = fanSpeedCycleOrder.indexOf(oFS); idx = increase ? (idx + 1) % fanSpeedCycleOrder.length : (idx - 1 + fanSpeedCycleOrder.length) % fanSpeedCycleOrder.length; currentFanSpeed = fanSpeedCycleOrder[idx]; updateAllUIs(); if (!await sendAcState()) { currentFanSpeed = oFS; updateAllUIs(); } }
    async function handleFanLevelSelect(speed, uiContext) { if (!isConnectedAndReadyForUserAction()) { showStatusPopup("Please connect to a device first."); return; } if (!isPowerOn) { showStatusPopup("AC is off. Turn it on to select fan speed."); return; } if(!fanSpeedCycleOrder.includes(speed)) return; const oFS = currentFanSpeed; currentFanSpeed = speed; updateAllUIs(); if (!await sendAcState()) { currentFanSpeed = oFS; updateAllUIs(); } }
    async function handleRelayToggle(relayId, eventTarget) { if (!isConnectedAndReadyForUserAction()) { showStatusPopup("Please connect to a device first."); eventTarget.checked = !eventTarget.checked; return; } const prevRelayState = relayStates[relayId]; relayStates[relayId] = eventTarget.checked; updateAllUIs(); const baseRelayId = relayId.replace('ToggleDesktop', '').replace('ToggleMobile', ''); if (!await sendRelayState(baseRelayId, eventTarget.checked)) { relayStates[relayId] = prevRelayState; updateAllUIs(); } }
    
    // Mobile Page Navigation (should be fine from input_file_0.js)
    function showMobilePage(pageIdToShow, pageTitle) { Object.values(dom.mobilePages).forEach(c => { if(c) c.classList.remove('active'); }); if (dom.mobilePages[pageIdToShow]) { dom.mobilePages[pageIdToShow].classList.add('active'); dom.mobilePageTitle.textContent = pageTitle; } dom.mobileNavLinks.forEach(l => l.classList.toggle('active-nav', l.dataset.page === pageIdToShow)); closeMobileMenu(); updateAllUIs(); }
    function openMobileMenu() { dom.mobileMenuDrawer.classList.add('open'); dom.menuOverlay.classList.remove('hidden'); }
    function closeMobileMenu() { dom.mobileMenuDrawer.classList.remove('open'); dom.menuOverlay.classList.add('hidden');}
    dom.mobileMenuButton?.addEventListener('click', openMobileMenu);
    dom.closeMenuButton?.addEventListener('click', closeMobileMenu);
    dom.menuOverlay?.addEventListener('click', closeMobileMenu);
    dom.mobileNavLinks.forEach(link => { link.addEventListener('click', (e) => { e.preventDefault(); showMobilePage(link.dataset.page, link.dataset.title); }); });
    
    // Event Listeners for Main Controls (Desktop & Mobile)
    dom.ac.power?.addEventListener('click', () => handlePowerToggle('desktop')); dom.ac.tempUp?.addEventListener('click', () => handleTempChange('desktop', true)); dom.ac.tempDown?.addEventListener('click', () => handleTempChange('desktop', false)); dom.ac.mode?.addEventListener('click', () => handleModeChange('desktop')); dom.fanDesktop.up?.addEventListener('click', () => handleFanCycle(true)); dom.fanDesktop.down?.addEventListener('click', () => handleFanCycle(false)); fanSpeedVisualDesktop.forEach(s => dom.fanDesktop.levels[s]?.addEventListener('click', () => handleFanLevelSelect(s, 'desktop'))); for (const id in dom.relaysDesktop) dom.relaysDesktop[id]?.addEventListener('change', (e) => handleRelayToggle(id, e.target));
    dom.acMobile.power?.addEventListener('click', () => handlePowerToggle('mobile')); dom.acMobile.tempUp?.addEventListener('click', () => handleTempChange('mobile', true)); dom.acMobile.tempDown?.addEventListener('click', () => handleTempChange('mobile', false)); dom.acMobile.mode?.addEventListener('click', () => handleModeChange('mobile')); dom.fanMobile.up?.addEventListener('click', () => handleFanCycle(true)); dom.fanMobile.down?.addEventListener('click', () => handleFanCycle(false)); fanSpeedVisualMobile.forEach(s => dom.fanMobile.levels[s]?.addEventListener('click', () => handleFanLevelSelect(s, 'mobile'))); for (const id in dom.relaysMobile) dom.relaysMobile[id]?.addEventListener('change', (e) => handleRelayToggle(id, e.target));

    // Automation UI Controls (value changes, no network here)
    function handleAutomationTypeSelect(type) { currentAutomationType = type; updateAutomationUI(); }
    function handleAutomationTempChange(configType, increase) { let cfg=automationConfigs[configType]; if(increase && cfg.temp<30)cfg.temp++; else if(!increase && cfg.temp>16)cfg.temp--; updateAutomationUI();}
    function handleAutomationModeChange(configType) { let cfg=automationConfigs[configType]; cfg.modeIndex=(cfg.modeIndex+1)%acModes.length; updateAutomationUI(); }
    function handleAutomationFanCycle(configType, increase) { let cfg=automationConfigs[configType]; let idx=fanSpeedCycleOrder.indexOf(cfg.fan); idx = increase?(idx+1)%fanSpeedCycleOrder.length : (idx-1+fanSpeedCycleOrder.length)%fanSpeedCycleOrder.length; cfg.fan=fanSpeedCycleOrder[idx]; updateAutomationUI(); }
    function handleAutomationFanLevelSelect(configType, speed) { if(!fanSpeedCycleOrder.includes(speed))return; automationConfigs[configType].fan=speed; updateAutomationUI(); }
    // Event Listeners for Automation UI Controls (as in your input_file_0.js)
    dom.automation.fixedTimeMobile?.addEventListener('change', (e) => { automationConfigs.fixed.time = e.target.value; }); dom.automation.oscillationOnTimeMobile?.addEventListener('change', (e) => { automationConfigs.oscillation.on_time = e.target.value; }); dom.automation.oscillationOffTimeMobile?.addEventListener('change', (e) => { automationConfigs.oscillation.off_time = e.target.value; }); dom.automation.fixedTimeDesktop?.addEventListener('change', (e) => { automationConfigs.fixed.time = e.target.value; }); dom.automation.oscillationOnTimeDesktop?.addEventListener('change', (e) => { automationConfigs.oscillation.on_time = e.target.value; }); dom.automation.oscillationOffTimeDesktop?.addEventListener('change', (e) => { automationConfigs.oscillation.off_time = e.target.value; });
    dom.automation.fixedBtnMobile?.addEventListener('click', () => handleAutomationTypeSelect('fixed')); dom.automation.oscillationBtnMobile?.addEventListener('click', () => handleAutomationTypeSelect('oscillation')); dom.automation.fixedBtnDesktop?.addEventListener('click', () => handleAutomationTypeSelect('fixed')); dom.automation.oscillationBtnDesktop?.addEventListener('click', () => handleAutomationTypeSelect('oscillation'));
    document.getElementById('fixedTempDownMobile')?.addEventListener('click', () => handleAutomationTempChange('fixed', false)); document.getElementById('fixedTempUpMobile')?.addEventListener('click', () => handleAutomationTempChange('fixed', true)); document.getElementById('fixedModeChangeMobile')?.addEventListener('click', () => handleAutomationModeChange('fixed')); document.getElementById('fixedFanSpeedDownMobile')?.addEventListener('click', () => handleAutomationFanCycle('fixed', false)); document.getElementById('fixedFanSpeedUpMobile')?.addEventListener('click', () => handleAutomationFanCycle('fixed', true)); dom.automation.fanSpeedLevelsFixedMobile.forEach(el => el.addEventListener('click', () => handleAutomationFanLevelSelect('fixed', el.dataset.speedAutomation)));
    document.getElementById('oscillationTempDownMobile')?.addEventListener('click', () => handleAutomationTempChange('oscillation', false)); document.getElementById('oscillationTempUpMobile')?.addEventListener('click', () => handleAutomationTempChange('oscillation', true)); document.getElementById('oscillationModeChangeMobile')?.addEventListener('click', () => handleAutomationModeChange('oscillation')); document.getElementById('oscillationFanSpeedDownMobile')?.addEventListener('click', () => handleAutomationFanCycle('oscillation', false)); document.getElementById('oscillationFanSpeedUpMobile')?.addEventListener('click', () => handleAutomationFanCycle('oscillation', true)); dom.automation.fanSpeedLevelsOscillationMobile.forEach(el => el.addEventListener('click', () => handleAutomationFanLevelSelect('oscillation', el.dataset.speedAutomation)));
    document.getElementById('fixedTempDownDesktop')?.addEventListener('click', () => handleAutomationTempChange('fixed', false)); document.getElementById('fixedTempUpDesktop')?.addEventListener('click', () => handleAutomationTempChange('fixed', true)); document.getElementById('fixedModeChangeDesktop')?.addEventListener('click', () => handleAutomationModeChange('fixed')); document.getElementById('fixedFanSpeedDownDesktop')?.addEventListener('click', () => handleAutomationFanCycle('fixed', false)); document.getElementById('fixedFanSpeedUpDesktop')?.addEventListener('click', () => handleAutomationFanCycle('fixed', true)); dom.automation.fanSpeedLevelsFixedDesktop.forEach(el => el.addEventListener('click', () => handleAutomationFanLevelSelect('fixed', el.dataset.speedAutomation)));
    document.getElementById('oscillationTempDownDesktop')?.addEventListener('click', () => handleAutomationTempChange('oscillation', false)); document.getElementById('oscillationTempUpDesktop')?.addEventListener('click', () => handleAutomationTempChange('oscillation', true)); document.getElementById('oscillationModeChangeDesktop')?.addEventListener('click', () => handleAutomationModeChange('oscillation')); document.getElementById('oscillationFanSpeedDownDesktop')?.addEventListener('click', () => handleAutomationFanCycle('oscillation', false)); document.getElementById('oscillationFanSpeedUpMobile')?.addEventListener('click', () => handleAutomationFanCycle('oscillation', true)); dom.automation.fanSpeedLevelsOscillationDesktop.forEach(el => el.addEventListener('click', () => handleAutomationFanLevelSelect('oscillation', el.dataset.speedAutomation)));

    // Automation "Apply" Button Listeners
    dom.automation.applyFixedSettingsMobile?.addEventListener('click', async () => { if (!isConnectedAndReadyForUserAction()){showStatusPopup("Connect device first.");return;} if (!confirm('Apply Fixed schedule (Mobile)?')) { showStatusPopup('Cancelled.'); return; } await applyAutomationSchedule('fixed'); });
    dom.automation.applyOscillationSettingsMobile?.addEventListener('click', async () => { if (!isConnectedAndReadyForUserAction()){showStatusPopup("Connect device first.");return;} if (!confirm('Apply Oscillation schedule (Mobile)?')) { showStatusPopup('Cancelled.'); return; } await applyAutomationSchedule('oscillation'); });
    dom.automation.applyFixedSettingsDesktop?.addEventListener('click', async () => { if (!isConnectedAndReadyForUserAction()){showStatusPopup("Connect device first.");return;} await applyAutomationSchedule('fixed'); });
    dom.automation.applyOscillationSettingsDesktop?.addEventListener('click', async () => {  if (!isConnectedAndReadyForUserAction()){showStatusPopup("Connect device first.");return;} await applyAutomationSchedule('oscillation'); });

    // Shutdown Handler
    const handleShutdownClick = async (e) => { e.preventDefault(); if (!isConnectedAndReadyForUserAction()) { showStatusPopup("Please connect to a device first."); return; } if (confirm('Are you sure you want to SHUTDOWN the ESP32 device?')) { if(!await sendShutdownCommand()) { /* Error msg handled by sendCommand */ } else { showStatusPopup("Shutdown command sent to ESP32.");}}};
    dom.mobileShutdownButton?.addEventListener('click', handleShutdownClick);
    dom.desktopShutdownButton?.addEventListener('click', handleShutdownClick);

    // --- Initial Setup & Resize ---
    function handleWindowResize() { const isMobile = window.innerWidth < 768; document.getElementById('desktopGridContainer').style.display = isMobile ? 'none' : 'grid'; document.getElementById('mobilePagesContainer').style.display = isMobile ? 'block' : 'none'; if (isMobile && !document.querySelector('.mobile-page-container.active')) showMobilePage('acFanControlsMobilePage', 'AC & Fan Controls'); updateAllUIs(); }
    function initialAutomationSetup() { const now = new Date(); const cT=now.toTimeString().slice(0,5); automationConfigs.fixed.time=cT; automationConfigs.oscillation.on_time=cT; const oT=new Date(now.getTime()+60*60*1000); automationConfigs.oscillation.off_time=oT.toTimeString().slice(0,5); if(dom.automation.fixedTimeMobile)dom.automation.fixedTimeMobile.value=automationConfigs.fixed.time; if(dom.automation.oscillationOnTimeMobile)dom.automation.oscillationOnTimeMobile.value=automationConfigs.oscillation.on_time; if(dom.automation.oscillationOffTimeMobile)dom.automation.oscillationOffTimeMobile.value=automationConfigs.oscillation.off_time; if(dom.automation.fixedTimeDesktop)dom.automation.fixedTimeDesktop.value=automationConfigs.fixed.time; if(dom.automation.oscillationOnTimeDesktop)dom.automation.oscillationOnTimeDesktop.value=automationConfigs.oscillation.on_time; if(dom.automation.oscillationOffTimeDesktop)dom.automation.oscillationOffTimeDesktop.value=automationConfigs.oscillation.off_time; handleAutomationTypeSelect(currentAutomationType); }


    /*if (typeof MQTT_Ctrl !== 'undefined' && MQTT_Ctrl.init) {
        const mqttInitializationSuccessful = MQTT_Ctrl.init({
            onDataReceived: processIncomingDeviceData,
            onConnectionStatusChange: handleMqttConnectionStatusChange
        });

        if (!mqttInitializationSuccessful) {
            showStatusPopup("CRITICAL: MQTT Module failed to initialize. Check console (Paho errors?).");
            console.error("Main: MQTT_Ctrl.init() returned false. MQTT will not be available.");
            // Optionally, disable MQTT functionality or parts of UI relying on it if this fails.
        } else {
            console.log("Main: MQTT_Ctrl initialized successfully.");
        }
    } else {
        console.error("FATAL: MQTT_Ctrl is not defined or MQTT_Ctrl.init is not a function! Ensure js6_mqtt.js is loaded BEFORE js7_main.js and defines MQTT_Ctrl correctly.");
        showStatusPopup("SYSTEM ERROR: MQTT Sub-System Missing. Please refresh. Check console.");
        // Disable MQTT UI or block MQTT connection attempts here
        // For instance, by not allowing `promptForMqttConnection` to call `MQTT_Ctrl.connect()`
    }*/

    // --- Initialize ---
    if (typeof MQTT_Ctrl !== 'undefined') {
        const mqttInitSuccess = MQTT_Ctrl.init({ // MQTT_Ctrl.init now returns boolean
            onDataReceived: processIncomingDeviceData,
            onConnectionStatusChange: handleMqttConnectionStatusChange
        });
        if (!mqttInitSuccess) {
            showStatusPopup("CRITICAL: MQTT Library failed to initialize. Refresh page. Check console for Paho errors.");
            // Disable MQTT functionality or parts of UI relying on it if this fails.
        }
    } else {
        console.error("FATAL: MQTT_Ctrl is not defined. Ensure js6_mqtt.js is loaded BEFORE js7_main.js.");
        showStatusPopup("SYSTEM ERROR: MQTT module missing. Refresh page. Check console.");
    }

    dom.bleConnectButton.addEventListener('click', initiateConnectionProcess);
    handleWindowResize(); // Initial layout check
    updateConnectionStatusUI('Connect to Device'); // Set initial button state
    initialAutomationSetup();
    updateAllUIs(); // Initial UI data sync
    window.addEventListener('resize', handleWindowResize);

    console.log("Main application setup complete.");
});