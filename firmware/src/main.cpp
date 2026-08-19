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
const char* api_url = "http://[IP_ADDRESS]/api/iot/cylinder/readings";
const char* api_key = "sk_adminuser1234567890";
const char* device_id = "68ca0a1b21437e82894bd258";

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
    http.begin(api_url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", api_key);
    
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
    Serial.println("WiFi not connected. Buffering locally (mock).");
    // Implementation for local buffering to NVS/SD would go here
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
  
  scale.set_scale(cal_factor);
  if (tare_offset != 0) {
    scale.set_offset(tare_offset);
  }
  
  // Read weight (average of 10 readings)
  float weight = 0.0;
  if (scale.wait_ready_timeout(2000)) {
    weight = scale.get_units(10);
    Serial.print("Weight (kg): ");
    Serial.println(weight);
  } else {
    Serial.println("HX711 not found.");
  }
  
  // Send data
  connectWiFi();
  sendReading(weight);
  
  // Deep sleep
  Serial.println("Going to deep sleep...");
  esp_sleep_enable_timer_wakeup(SLEEP_SECONDS * 1000000ULL);
  esp_deep_sleep_start();
}

void loop() {
  // Never reached because of deep sleep
}

