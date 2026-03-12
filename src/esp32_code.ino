#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_MLX90614.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"

// Replace these with your real credentials and device identifiers.
const char* WIFI_SSID = "realme 8s 5G";
const char* WIFI_PASSWORD = "12345678";
const char* FIREBASE_DB_URL = "https://smart-health-monitoring-cd2dd-default-rtdb.asia-southeast1.firebasedatabase.app";
const char* PATIENT_UID = "zyYxqNqYixQ7ZbBcNY2xCD574x03";
const char* DATABASE_AUTH = ""; // Optional. Fill this only if your RTDB rules require it.

// Sampling cadence for device-to-cloud updates.
const unsigned long UPLOAD_INTERVAL_MS = 5000;
const size_t FILTER_WINDOW = 5;
const uint8_t I2C_SDA_PIN = 21;
const uint8_t I2C_SCL_PIN = 22;
const uint8_t BUZZER_PIN = 25;
const float NO_FINGER_THRESHOLD = 15000.0f;
const uint8_t OLED_ADDRESS = 0x3C;
const int SCREEN_WIDTH = 128;
const int SCREEN_HEIGHT = 64;
const int MAX_BUFFER_SAMPLES = 100;
const int MAX_SAMPLES_PER_UPDATE = 25;
const uint8_t ALERT_CONFIRM_COUNT = 3;
const unsigned long BUZZER_TOGGLE_MS = 180;
const float HR_MIN_VALID = 50.0f;
const float HR_MAX_VALID = 120.0f;
const float HR_MAX_STEP = 15.0f;
const float HR_ALERT_THRESHOLD = 135.0f;
const float SPO2_ALERT_THRESHOLD = 88.0f;
const float TEMP_ALERT_THRESHOLD = 38.5f;
const int EDGE_RISK_ALERT_THRESHOLD = 85;

struct VitalSample {
  float heartRate;
  float spo2;
  float temperature;
};

Adafruit_MLX90614 mlx = Adafruit_MLX90614();
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
MAX30105 particleSensor;

VitalSample hrWindow[FILTER_WINDOW];
VitalSample spo2Window[FILTER_WINDOW];
VitalSample tempWindow[FILTER_WINDOW];
size_t sampleIndex = 0;
bool windowFilled = false;
unsigned long lastUploadAt = 0;
unsigned long lastFingerSeenAt = 0;
float latestHeartRate = 0;
float latestSpo2 = 0;
long recentIr = 0;
long recentRed = 0;
bool mlxAvailable = false;
bool maxAvailable = false;
int32_t spo2Value = 0;
int8_t spo2Valid = 0;
int32_t heartRateValue = 0;
int8_t heartRateValid = 0;
bool maxBufferPrimed = false;
uint8_t abnormalStreak = 0;
unsigned long lastBuzzerToggleAt = 0;
bool buzzerState = false;
float stableHeartRate = 0;

float hrBuffer[FILTER_WINDOW] = {0};
float spo2Buffer[FILTER_WINDOW] = {0};
float tempBuffer[FILTER_WINDOW] = {0};
uint32_t irSamples[MAX_BUFFER_SAMPLES] = {0};
uint32_t redSamples[MAX_BUFFER_SAMPLES] = {0};

void setBuzzer(bool enabled) {
  digitalWrite(BUZZER_PIN, enabled ? HIGH : LOW);
}

void updateBuzzer(bool alertActive) {
  if (!alertActive) {
    buzzerState = false;
    setBuzzer(false);
    return;
  }

  if (millis() - lastBuzzerToggleAt >= BUZZER_TOGGLE_MS) {
    buzzerState = !buzzerState;
    setBuzzer(buzzerState);
    lastBuzzerToggleAt = millis();
  }
}

void renderDisplay(const String& line1, const String& line2 = "", const String& line3 = "", const String& line4 = "") {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(line1);
  if (line2.length()) display.println(line2);
  if (line3.length()) display.println(line3);
  if (line4.length()) display.println(line4);
  display.display();
}

String buildAlertSummary(float heartRate, float spo2, float temperature, int edgeRisk) {
  String summary = "";
  if (heartRate > HR_ALERT_THRESHOLD) summary += "HR HIGH ";
  if (spo2 < SPO2_ALERT_THRESHOLD) summary += "SpO2 LOW ";
  if (temperature > TEMP_ALERT_THRESHOLD) summary += "TEMP HIGH ";
  if (edgeRisk >= EDGE_RISK_ALERT_THRESHOLD) summary += "RISK HIGH";
  summary.trim();
  return summary.length() ? summary : "ALERT";
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected. IP: ");
  Serial.println(WiFi.localIP());
}

float average(const float* values, size_t count) {
  float total = 0;
  for (size_t i = 0; i < count; i++) {
    total += values[i];
  }
  return count ? total / count : 0;
}

float readHeartRateSensor() {
  return stableHeartRate > 0 ? stableHeartRate : 0;
}

float readSpo2Sensor() {
  return latestSpo2 > 0 ? latestSpo2 : 0;
}

float readTemperatureSensor() {
  if (!mlxAvailable) {
    return 0;
  }
  return mlx.readObjectTempC();
}

void updatePulseSensor() {
  if (!maxAvailable) {
    latestHeartRate = 0;
    latestSpo2 = 0;
    return;
  }
}

String classifyEdgeReason(float heartRate, float spo2, float temperature) {
  if (spo2 < SPO2_ALERT_THRESHOLD && heartRate > HR_ALERT_THRESHOLD) return "hypoxia_tachycardia";
  if (spo2 < SPO2_ALERT_THRESHOLD && temperature > TEMP_ALERT_THRESHOLD) return "hypoxia_fever";
  if (heartRate > HR_ALERT_THRESHOLD && temperature > TEMP_ALERT_THRESHOLD) return "tachycardia_fever";
  if (spo2 < SPO2_ALERT_THRESHOLD) return "hypoxia";
  if (heartRate > HR_ALERT_THRESHOLD) return "tachycardia";
  if (temperature > TEMP_ALERT_THRESHOLD) return "fever";
  return "stable";
}

int computeEdgeRisk(float heartRate, float spo2, float temperature) {
  float risk = 0;
  if (heartRate > 100) risk += min(30.0f, (heartRate - 100.0f) * 0.8f);
  if (spo2 < 95) risk += min(40.0f, (95.0f - spo2) * 6.5f);
  if (temperature > 37.5f) risk += min(30.0f, (temperature - 37.5f) * 20.0f);
  return (int) min(100.0f, max(0.0f, risk));
}

bool detectEdgeAlert(float heartRate, float spo2, float temperature, int edgeRisk) {
  int abnormalSignals = 0;
  if (heartRate > HR_ALERT_THRESHOLD) abnormalSignals++;
  if (spo2 < SPO2_ALERT_THRESHOLD) abnormalSignals++;
  if (temperature > TEMP_ALERT_THRESHOLD) abnormalSignals++;

  if (abnormalSignals >= 2) return true;
  if (edgeRisk >= EDGE_RISK_ALERT_THRESHOLD && abnormalSignals >= 1) return true;
  return false;
}

bool confirmPersistentAlert(bool abnormalNow) {
  if (abnormalNow) {
    if (abnormalStreak < ALERT_CONFIRM_COUNT) {
      abnormalStreak++;
    }
  } else {
    abnormalStreak = 0;
  }

  return abnormalStreak >= ALERT_CONFIRM_COUNT;
}

void updateFilters(float heartRate, float spo2, float temperature) {
  hrBuffer[sampleIndex] = heartRate;
  spo2Buffer[sampleIndex] = spo2;
  tempBuffer[sampleIndex] = temperature;

  sampleIndex = (sampleIndex + 1) % FILTER_WINDOW;
  if (sampleIndex == 0) {
    windowFilled = true;
  }
}

String buildFirebaseUrl() {
  String url = String(FIREBASE_DB_URL) + "/patients/" + PATIENT_UID + "/latest.json";
  if (String(DATABASE_AUTH).length() > 0) {
    url += "?auth=" + String(DATABASE_AUTH);
  }
  return url;
}

void uploadToFirebase(float heartRate, float spo2, float temperature, int edgeRisk, bool edgeAlert, const String& edgeReason) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = buildFirebaseUrl();
  Serial.print("Uploading to: ");
  Serial.println(url);
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"heartRate\":" + String(heartRate, 1) + ",";
  payload += "\"spo2\":" + String(spo2, 1) + ",";
  payload += "\"temp\":" + String(temperature, 1) + ",";
  payload += "\"temperature\":" + String(temperature, 1) + ",";
  payload += "\"edgeRisk\":" + String(edgeRisk) + ",";
  payload += "\"edgeAlert\":" + String(edgeAlert ? "true" : "false") + ",";
  payload += "\"edgeReason\":\"" + edgeReason + "\",";
  payload += "\"network\":\"edge-device\",";
  payload += "\"timestamp\":\"" + String(millis()) + "\"";
  payload += "}";

  Serial.print("Payload: ");
  Serial.println(payload);

  int httpCode = http.PUT(payload);
  Serial.print("Firebase HTTP code: ");
  Serial.println(httpCode);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.print("Firebase response: ");
    Serial.println(response);
  } else {
    Serial.print("HTTP error: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  pinMode(BUZZER_PIN, OUTPUT);
  setBuzzer(false);

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println("OLED not found");
  } else {
    renderDisplay("Edge Monitor", "Booting...");
  }

  mlxAvailable = mlx.begin();
  if (!mlxAvailable) {
    Serial.println("MLX90614 not found");
    renderDisplay("Edge Monitor", "MLX90614 fail");
  } else {
    Serial.println("MLX90614 ready");
    renderDisplay("Edge Monitor", "MLX90614 ready");
  }

  maxAvailable = particleSensor.begin(Wire, I2C_SPEED_STANDARD);
  if (!maxAvailable) {
    Serial.println("MAX30102 not found");
    renderDisplay("Edge Monitor", mlxAvailable ? "MLX90614 ready" : "MLX90614 fail", "MAX30102 fail");
  } else {
    Serial.println("MAX30102 ready");
    byte ledBrightness = 60;
    byte sampleAverage = 4;
    byte ledMode = 2;
    int sampleRate = 100;
    int pulseWidth = 411;
    int adcRange = 4096;
    particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);
    renderDisplay("Edge Monitor", mlxAvailable ? "MLX90614 ready" : "MLX90614 fail", "MAX30102 ready");
  }

  connectWiFi();
  renderDisplay("WiFi connected", WiFi.localIP().toString());
}

void loop() {
  if (maxAvailable) {
    if (!maxBufferPrimed) {
      renderDisplay("MAX30102", "Hold finger still", "Collecting samples");
      for (int i = 0; i < MAX_BUFFER_SAMPLES; i++) {
        while (particleSensor.available() == false) {
          particleSensor.check();
        }

        redSamples[i] = particleSensor.getRed();
        irSamples[i] = particleSensor.getIR();
        particleSensor.nextSample();
      }
      maxBufferPrimed = true;
    } else {
      for (int i = MAX_SAMPLES_PER_UPDATE; i < MAX_BUFFER_SAMPLES; i++) {
        redSamples[i - MAX_SAMPLES_PER_UPDATE] = redSamples[i];
        irSamples[i - MAX_SAMPLES_PER_UPDATE] = irSamples[i];
      }

      for (int i = MAX_BUFFER_SAMPLES - MAX_SAMPLES_PER_UPDATE; i < MAX_BUFFER_SAMPLES; i++) {
        while (particleSensor.available() == false) {
          particleSensor.check();
        }

        recentRed = particleSensor.getRed();
        recentIr = particleSensor.getIR();
        redSamples[i] = recentRed;
        irSamples[i] = recentIr;
        particleSensor.nextSample();
      }

      maxim_heart_rate_and_oxygen_saturation(
        irSamples,
        MAX_BUFFER_SAMPLES,
        redSamples,
        &spo2Value,
        &spo2Valid,
        &heartRateValue,
        &heartRateValid
      );

      Serial.print("IR: ");
      Serial.print(recentIr);
      Serial.print(" RED: ");
      Serial.print(recentRed);
      Serial.print(" HRvalid: ");
      Serial.print(heartRateValid);
      Serial.print(" SPO2valid: ");
      Serial.println(spo2Valid);

      if (recentIr >= NO_FINGER_THRESHOLD) {
        lastFingerSeenAt = millis();
      }

      if (heartRateValid) {
        float candidateHr = heartRateValue;
        if (candidateHr >= HR_MIN_VALID && candidateHr <= HR_MAX_VALID) {
          if (stableHeartRate <= 0 || fabs(candidateHr - stableHeartRate) <= HR_MAX_STEP) {
            stableHeartRate = stableHeartRate <= 0 ? candidateHr : ((stableHeartRate * 0.7f) + (candidateHr * 0.3f));
          }
        }
        latestHeartRate = stableHeartRate;
      }
      if (spo2Valid) {
        latestSpo2 = spo2Value;
      }
      if (recentIr < NO_FINGER_THRESHOLD && millis() - lastFingerSeenAt > 3000) {
        latestHeartRate = 0;
        stableHeartRate = 0;
        latestSpo2 = 0;
      }
    }
  }

  float heartRate = readHeartRateSensor();
  float spo2 = readSpo2Sensor();
  float temperature = readTemperatureSensor();

  if (recentIr < NO_FINGER_THRESHOLD) {
    Serial.print("Waiting for finger. Temp: ");
    Serial.println(temperature, 1);
    updateBuzzer(false);
    renderDisplay("Waiting finger", "Temp: " + String(temperature, 1) + " C", "WiFi OK");
    delay(250);
    return;
  }

  if (heartRate <= 0 || spo2 <= 0) {
    Serial.print("Finger detected, waiting for stable pulse. Temp: ");
    Serial.println(temperature, 1);
    updateBuzzer(false);
    renderDisplay("Finger detected", "Stabilizing pulse", "Temp: " + String(temperature, 1) + " C");
    delay(250);
    return;
  }

  updateFilters(heartRate, spo2, temperature);

  size_t count = windowFilled ? FILTER_WINDOW : sampleIndex;
  if (count == 0) {
    delay(500);
    return;
  }

  float filteredHeartRate = average(hrBuffer, count);
  float filteredSpo2 = average(spo2Buffer, count);
  float filteredTemperature = average(tempBuffer, count);

  int edgeRisk = computeEdgeRisk(filteredHeartRate, filteredSpo2, filteredTemperature);
  bool abnormalNow = detectEdgeAlert(filteredHeartRate, filteredSpo2, filteredTemperature, edgeRisk);
  bool edgeAlert = confirmPersistentAlert(abnormalNow);
  String edgeReason = classifyEdgeReason(filteredHeartRate, filteredSpo2, filteredTemperature);

  Serial.print("HR: ");
  Serial.print(filteredHeartRate, 1);
  Serial.print(" SpO2: ");
  Serial.print(filteredSpo2, 1);
  Serial.print(" Temp: ");
  Serial.print(filteredTemperature, 1);
  Serial.print(" Risk: ");
  Serial.print(edgeRisk);
  Serial.print(" Streak: ");
  Serial.print(abnormalStreak);
  Serial.print(" Alert: ");
  Serial.print(edgeAlert ? "true" : "false");
  Serial.print(" Reason: ");
  Serial.println(edgeReason);

  updateBuzzer(edgeAlert);

  if (edgeAlert) {
    renderDisplay(
      "ALERT ACTIVE",
      "HR: " + String(filteredHeartRate, 1) + " SpO2: " + String(filteredSpo2, 1),
      "Temp: " + String(filteredTemperature, 1) + "C Risk:" + String(edgeRisk),
      buildAlertSummary(filteredHeartRate, filteredSpo2, filteredTemperature, edgeRisk)
    );
  } else {
    renderDisplay(
      "HR: " + String(filteredHeartRate, 1) + " bpm",
      "SpO2: " + String(filteredSpo2, 1) + " %",
      "Temp: " + String(filteredTemperature, 1) + " C",
      "Risk: " + String(edgeRisk)
    );
  }

  if (millis() - lastUploadAt >= UPLOAD_INTERVAL_MS) {
    uploadToFirebase(filteredHeartRate, filteredSpo2, filteredTemperature, edgeRisk, edgeAlert, edgeReason);
    lastUploadAt = millis();
  }

  delay(250);
}
