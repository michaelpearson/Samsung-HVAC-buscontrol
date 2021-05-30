#include "main.h"

AsyncWebServer server(80);
AuthenticatedAsyncWebSocket ws(auth, "/ws");

State desired_state;
State current_state;
unsigned long desired_set_at = 0;
int set_count = 0;

bool operator==(const State& lhs, const State& rhs) {
    if (lhs.power == OFF && rhs.power == OFF) {
        return true;
    }

    return lhs.fanSpeed == rhs.fanSpeed
           && lhs.mode == rhs.mode
           && lhs.power == rhs.power
           && lhs.temp == rhs.temp;
}

bool operator!=(const State& lhs, const State& rhs) {
    return !(lhs == rhs);
}

bool auth(AsyncWebServerRequest * request) {
    return request->getParam("password")->value() == "PAexsYUL";
}

char calculate_checksum(char message[13]) {
    char checksum = 0;
    for (int a = 0; a < 11; a++) {
        checksum ^= message[a];
    }
    return checksum;
}

void set_ac(const State * state) {
    static char message[14];

    message[0] = 0x32; // Message start
    message[1] = 0x85; // Src
    message[2] = 0x20; // Dest
    message[3] = 0xa0; // Cmd

    // Data
    message[4] = 0x1a; // Swing up/down
    message[5] = 0x18; // Constant
    message[6] = state->fanSpeed | state->temp;
    message[7] = state->mode;
    message[8] = state->power;
    message[9] = 0x00;
    message[10] = 0x00;
    message[11] = 0x00;

    // Footer
    message[12] = calculate_checksum(message + 1); // checksum
    message[13] = 0x34; // Message end

    set_count++;

    delay(10);
    digitalWrite(TX_EN_PIN, HIGH);
    Serial.write(message, 14);
    Serial.flush();
    digitalWrite(TX_EN_PIN, LOW);
}

void send_state(AsyncWebSocketClient * client) {
    static StaticJsonDocument<1024> doc;
    doc.clear();

    doc["power"] = desired_state.power == ON ? "on" : "off";
    doc["temp"] = (JsonInteger)desired_state.temp;
    switch (desired_state.fanSpeed) {
        case FS_AUTO:
            doc["fanSpeed"] = "auto";
            break;
        case FS_LOW:
            doc["fanSpeed"] = "low";
            break;
        case FS_MEDIUM:
            doc["fanSpeed"] = "medium";
            break;
        case FS_HIGH:
            doc["fanSpeed"] = "high";
            break;
        default:
            doc["fanSpeed"] = "unknown";
            break;
    }
    switch(desired_state.mode) {
        case AUTO:
            doc["mode"] = "auto";
            break;
        case COOL:
            doc["mode"] = "cool";
            break;
        case DRY:
            doc["mode"] = "dry";
            break;
        case FAN:
            doc["mode"] = "fan";
            break;
        case HEAT:
            doc["mode"] = "heat";
            break;
        default:
            doc["mode"] = "unknown";
            break;
    }
    doc["applying"] = current_state != desired_state;
    doc["set_count"] = set_count;

    static char buff[1024];
    auto state_len = serializeJson(doc, buff, sizeof(buff));

    if (client == nullptr) {
        ws.textAll(buff, state_len);
    } else {
        client->text(buff, state_len);
    }
}

void send_metric() {
    static StaticJsonDocument<1024> doc;
    static uint8_t output[1024];
    static char scratch[64];
    doc.clear();
    doc["what"] = "AC change";
    auto tags = doc.createNestedArray("tags");
    tags.add("ac-change");
    sprintf(scratch, "temp: %d", current_state.temp);
    tags.add(scratch);

    char * mode;
    switch (current_state.mode) {
        case AUTO:
            mode = "auto";
            break;
        case COOL:
            mode = "cool";
            break;
        case DRY:
            mode = "dry";
            break;
        case FAN:
            mode = "fan";
            break;
        case HEAT:
            mode = "heat";
            break;
        default:
            mode = "unknown";
            break;
    }

    char * fan_speed;
    switch(current_state.fanSpeed) {
        case FS_AUTO:
            fan_speed = "auto";
            break;
        case FS_LOW:
            fan_speed = "low";
            break;
        case FS_MEDIUM:
            fan_speed = "medium";
            break;
        case FS_HIGH:
            fan_speed = "high";
            break;
        default:
            fan_speed = "unknown";
            break;
    }

    tags.add(mode);
    tags.add(fan_speed);
    tags.add(current_state.power == ON ? "on" : "off");

    size_t output_len = serializeJson(doc, output, 1024);

    HTTPClient httpClient;
    WiFiClientSecure client;
    client.setTimeout(5000);
    client.setInsecure();

    httpClient.begin(client, "https://pm.mpearson.io/api/annotations/graphite");
    //httpClient.begin(client, "https://webhook.site/01630749-4691-4306-b0a1-629e871c6b5a");
    httpClient.addHeader("Authorization", API_KEY);
    httpClient.addHeader("content-type", "application/json");
    httpClient.POST(output, output_len);
}

void onEvent(AsyncWebSocket * server, AsyncWebSocketClient * client, AwsEventType type, void * arg, uint8_t *data, size_t len) {
    if (type == WS_EVT_CONNECT) {
        send_state(client);
    }
}

void setup() {
    pinMode(TX_EN_PIN, OUTPUT);
    digitalWrite(TX_EN_PIN, LOW);

    Serial.begin(2400, SerialConfig::SERIAL_8E1);

    WiFi.mode(WIFI_STA);
    WiFi.begin("IoT", "5eAAat4H");
    while (WiFi.status() != WL_CONNECTED) {
        delay(100);
    }

    ArduinoOTA.setPassword("wgZGDHB9hyg8w4hnhxKbm6jy");
    ArduinoOTA.begin(false);
    ws.onEvent(onEvent);
    server.addHandler(&ws);
    SPIFFS.begin();
    server.on("/", [](AsyncWebServerRequest * request) {
        request->send(SPIFFS, "/index.html");
    });
    server.serveStatic("/", SPIFFS, "/").setCacheControl("Immutable");
    server.on("/set", handleSetApi);
    server.begin();
}

void handleSetApi(AsyncWebServerRequest * request) {
    if (!auth(request)) {
        request->send(401);
        return;
    }
    desired_state.power = (request->arg("power") == "on") ? ON : OFF;
    desired_state.temp = atoi(request->arg("temp").c_str());
    auto mode = request->arg("mode");
    if (mode == "cool") {
        desired_state.mode = COOL;
    } else if (mode == "dry") {
        desired_state.mode = DRY;
    } else if (mode == "fan") {
        desired_state.mode = FAN;
    } else if (mode == "heat") {
        desired_state.mode = HEAT;
    } else {
        desired_state.mode = AUTO;
    }
    auto fan = request->arg("fan");
    if (fan == "low") {
        desired_state.fanSpeed = FS_LOW;
    } else if (fan == "medium") {
        desired_state.fanSpeed = FS_MEDIUM;
    } else if (fan == "high") {
        desired_state.fanSpeed = FS_HIGH;
    } else {
        desired_state.fanSpeed = FS_AUTO;
    }
    desired_set_at = millis();
    request->send(201, "application/json");
}

void loop() {
    ArduinoOTA.handle();
    if (WiFi.status() != WL_CONNECTED) {
        ESP.reset();
    }
    ws.cleanupClients(16);
    /**
     *   <start> <src> <dst> <cmd> <data: 8 bytes> <chksum> <end>
     *   Index  Byte   Identifier   Comments
     *   ----------------------------
     *          1      Start  : start of message (0x32)
     *   0      2      Src    : Source address
     *   1      3      Dst    : Destination address
     *   2      4      Cmd    : Command byte
     *   3-10   5-12   Data   : Data is always 8 bytes in length, unused bytes will be zero
     *   11     13     Chksum : Checksum of message which is the XOR of bytes 2-12
     *   12     14     End    : end of message (0x34)
     */

    if (Serial.available() >= 14 && Serial.read() == 0x32) {
        static char message[13];
        Serial.read(message, 13);
        char destination = message[1];
        char checksum = message[11];

        if (message[12] != 0x34 || calculate_checksum(message) != checksum) {
            return;
        }

        State old_state = current_state;
        if (message[2] == (char)0x52 && message[1] == (char)0x84) {
            current_state.temp = (message[3] & 0x1F) + 9;
            current_state.power = ((message[7] & 0x80) > 0) ? ON : OFF;
            switch(message[6] & 0x0F) {
                case 0x0A:
                    current_state.fanSpeed = FS_LOW;
                    break;
                case 0x0C:
                    current_state.fanSpeed = FS_MEDIUM;
                    break;
                case 0x0D:
                    current_state.fanSpeed = FS_HIGH;
                    break;
                default:
                    current_state.fanSpeed = FS_AUTO;
                    break;
            }
        }

        if (message[2] == (char)0x53 && message[1] == (char)0x84) {
            if (message[10] >= 0 && message[10] <= 4) {
                current_state.mode = (Mode)message[10];
            }
        }

        // If the desired state has been set recently, and the protocol is ready for a command.
        if (destination == (char) 0xAD
            && desired_state != current_state
            && (millis() - desired_set_at) < 10000) {
            set_ac(&desired_state);
        }

        // Update the desired state from the bus if we haven't been commanded to set the AC for a while.
        // If desired set at == 0 then always copy the desired state
        if (desired_state != current_state && (desired_set_at == 0 || ((millis() - desired_set_at) >= 10000))) {
            desired_state = current_state;
        }

        // Send metrics to Grafana. Also, prevent a state change notification on startup.
        if (millis() > 10000 && old_state != current_state) {
            send_metric();
        }

        static long last_sent = 0;
        if ((millis() - last_sent) > 1000) {
            last_sent = millis();
            send_state(nullptr);
        }
    }
}