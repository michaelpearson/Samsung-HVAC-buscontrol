#include <Arduino.h>
#include <ArduinoOTA.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>

#define TX_EN_PIN 14

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

char calculate_checksum(char message[13]);
void send_state(AsyncWebSocketClient * client = nullptr);
void handleSetApi(AsyncWebServerRequest * request);
void set_ac(bool on, u8 fan_speed, u8 temp, u8 mode);
