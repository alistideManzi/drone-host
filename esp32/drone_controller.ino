#include <Arduino.h>
#include <ArduinoJson.h>

// Learning/bench-test firmware.
// It reports telemetry and receives bounded control commands.
// It intentionally does NOT drive motors or implement flight stabilization.

bool armed = false;
int throttle = 0;
int roll = 0;
int pitch = 0;
int yaw = 0;

unsigned long lastTelemetry = 0;

void sendTelemetry() {
  StaticJsonDocument<256> doc;
  doc["battery"] = 100;
  doc["altitude"] = 0.0;
  doc["speed"] = 0.0;
  doc["satellites"] = 0;
  doc["rssi"] = -50;
  doc["armed"] = armed;

  serializeJson(doc, Serial);
  Serial.println();
}

void handleCommand(const String &line) {
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, line);
  if (err) return;

  const char* type = doc["type"] | "";

  if (strcmp(type, "arm") == 0) {
    armed = true;
    throttle = 0;
  } else if (strcmp(type, "disarm") == 0 || strcmp(type, "emergency_stop") == 0) {
    armed = false;
    throttle = 0;
    roll = pitch = yaw = 0;
  } else if (strcmp(type, "stick") == 0) {
    throttle = constrain((int)(doc["throttle"] | 0), 0, 100);
    roll = constrain((int)(doc["roll"] | 0), -100, 100);
    pitch = constrain((int)(doc["pitch"] | 0), -100, 100);
    yaw = constrain((int)(doc["yaw"] | 0), -100, 100);

    // In this prototype we only store the values.
    // A real flight controller should apply strict arming,
    // failsafe, sensor validation and stabilization logic.
    if (!armed) throttle = 0;
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  sendTelemetry();
}

void loop() {
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length()) handleCommand(line);
  }

  if (millis() - lastTelemetry >= 500) {
    lastTelemetry = millis();
    sendTelemetry();
  }
}
