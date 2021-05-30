#include <Arduino.h>
#include <ArduinoOTA.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include "AuthenticatedAsyncWebSocket.h"
#include <ESP8266HTTPClient.h>

#define TX_EN_PIN 14

#define API_KEY "Bearer <Grafana API key>"

typedef enum Power {
    ON = 0xf4,
    OFF = 0xc4
} Power;

typedef enum Mode {
    AUTO = 0,
    COOL = 1,
    DRY = 2,
    FAN = 3,
    HEAT = 4
} Mode;

typedef enum FanSpeed {
    FS_AUTO =   0b00100000,
    FS_LOW =    0b01000000,
    FS_MEDIUM = 0b10000000,
    FS_HIGH =   0b10100000
} FanSpeed;

typedef struct State {
    Power power;
    Mode mode;
    FanSpeed fanSpeed;
    u8 temp;
} State;

void setup();
void loop();

bool auth(AsyncWebServerRequest * request);
char calculate_checksum(char message[13]);
void send_state(AsyncWebSocketClient * client);
void send_metric();
void handleSetApi(AsyncWebServerRequest * request);
void set_ac(const State * state);
