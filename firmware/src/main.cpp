#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <HX711.h>
#include <Preferences.h>
#include <ArduinoJson.h>

// Pin Configuration
const int LOADCELL_DOUT_PIN = 2; // GPIO2
const int LOADCELL_SCK_PIN = 4;  // GPIO4

// Config
const char* ssid = "IOT-Project";
const char* password = "[PASSWORD]";
const char* API_URL = "https://YOUR-BACKEND-DOMAIN/api/iot/cylinder/readings";
const char* DEVICE_API_KEY = "sec_iot_7890abcdef123456";
const char* device_id = "GAS001";

// Sleep config
const uint64_t SLEEP_SECONDS = 900; // 15 minutes

HX711 scale;
Preferences preferences;

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " Connected!" : " Failed.");
}

void sendReading(float weight) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", DEVICE_API_KEY);
    
    StaticJsonDocument<200> doc;
    doc["device_id"] = device_id;
    doc["weight"] = weight;
    // Real implementation would attach RTC timestamp if available
    
    String requestBody;
    serializeJson(doc, requestBody);
    
    int httpResponseCode = http.POST(requestBody);
    String response = http.getString();
    
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    
    Serial.print("Server response: ");
    Serial.println(response);
    http.end();
  } else {
    Serial.println("WiFi not connected.");
  }
}

void setup() {
  Serial.begin(115200);
  
  // Initialize scale
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  
  // Load calibration from NVS
  preferences.begin("gas_app", false);
  float cal_factor = preferences.getFloat("cal_factor", 2280.0f);
  long tare_offset = preferences.getLong("tare_offset", 0);
  preferences.end();
  
  Serial.print("Calibration loaded: ");
  Serial.println(cal_factor != 2280.0f ? "YES" : "NO (using default)");
  
  scale.set_scale(cal_factor);
  if (tare_offset != 0) {
    scale.set_offset(tare_offset);
  }
  
  // Read weight (average of 10 readings)
  float weight = 0.0;
  bool is_ready = scale.wait_ready_timeout(2000);
  
  Serial.print("HX711 ready: ");
  Serial.println(is_ready ? "YES" : "NO");
  
  if (is_ready) {
    weight = scale.get_units(10);
    
    // Check if the sensor is returning an exact raw 0 (which usually implies a disconnected DOUT/SCK pin)
    if (weight == 0.00 && tare_offset == 0) {
        Serial.println("Warning: Weight is exactly 0.00 and no tare offset is set. Check DOUT/SCK wiring (Pins 2 and 4).");
    }
    
    Serial.print("Weight reading: ");
    Serial.print(weight);
    Serial.println(" kg");
    
    // Send data
    connectWiFi();
    sendReading(weight);
  } else {
    Serial.println("HX711 not found or not ready. Check wiring. Skipping API request.");
  }
  
  // Deep sleep
  Serial.println("Going to deep sleep...");
  esp_sleep_enable_timer_wakeup(SLEEP_SECONDS * 1000000ULL);
  esp_deep_sleep_start();
}

void loop() {
  // Never reached because of deep sleep
}

