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
const char* ssid = "IOT-GUEST";
const char* password = "[PASSWORD]";
const char* API_URL = "https://gastrack-backend.onrender.com/api/iot/cylinder/readings";
const char* DEVICE_API_KEY = "sec_iot_7890abcdef123456";
const char* device_id = "GT-DEMODEVICEKEY";

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

void runCalibrationMode() {
  Serial.println("\n--- CALIBRATION MODE ---");
  Serial.println("Remove all weight from the load cell.");
  Serial.println("Send 't' in the Serial Monitor when empty to tare.");
  
  // Clear buffer
  while(Serial.available()) Serial.read();

  while(true) {
    if (Serial.available()) {
      char c = Serial.read();
      if (c == 't' || c == 'T') break;
    }
    delay(10);
  }
  
  Serial.println("Taring...");
  scale.tare(20); // Average of 20 readings for stability
  long new_tare = scale.get_offset();
  Serial.println("Tare complete.");
  Serial.print("Zero offset: ");
  Serial.println(new_tare);
  
  Serial.println("\nPlace a known weight on the load cell.");
  Serial.println("Enter the known weight in kg (e.g., '5.5') and press Enter:");
  
  while(Serial.available()) Serial.read();
  
  String input = "";
  while(true) {
    if (Serial.available()) {
      char c = Serial.read();
      if (c == '\n' || c == '\r') {
        if (input.length() > 0) break;
      } else {
        input += c;
      }
    }
    delay(10);
  }
  
  float known_weight = input.toFloat();
  Serial.print("Known weight entered: ");
  Serial.print(known_weight);
  Serial.println(" kg");
  
  // Calculate calibration factor
  scale.set_scale(1.0); // Reset scale to 1.0 to get raw difference
  float raw_val = scale.get_units(20); 
  float new_cal_factor = raw_val / known_weight;
  
  Serial.print("Calibration factor: ");
  Serial.println(new_cal_factor);
  
  // Save to NVS
  preferences.putBool("is_calibrated", true);
  preferences.putFloat("cal_factor", new_cal_factor);
  preferences.putLong("tare_offset", new_tare);
  
  // Apply and verify
  scale.set_scale(new_cal_factor);
  float final_weight = scale.get_units(10);
  
  Serial.print("Weight reading: ");
  Serial.print(final_weight);
  Serial.println(" kg");
  Serial.println("\nCalibration saved successfully!");
  Serial.println("Please reset the ESP32 to begin normal operation.");
  
  while(true) delay(1000); // Halt here until reset
}

void setup() {
  Serial.begin(115200);
  Serial.println("\nInitializing HX711...");
  
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  bool is_ready = scale.wait_ready_timeout(2000);
  
  Serial.print("HX711 ready: ");
  Serial.println(is_ready ? "YES" : "NO");
  
  preferences.begin("gas_app", false);
  bool is_calibrated = preferences.getBool("is_calibrated", false);
  float cal_factor = preferences.getFloat("cal_factor", 2280.0f); // Default fallback
  long tare_offset = preferences.getLong("tare_offset", 0);
  
  if (is_calibrated && tare_offset != 0) {
    Serial.println("Calibration loaded: YES");
    scale.set_scale(cal_factor);
    scale.set_offset(tare_offset);
  } else {
    Serial.println("Calibration loaded: NO");
    Serial.println("No saved calibration found. Performing initial safe tare...");
    
    if (is_ready) {
      scale.tare(20);
      tare_offset = scale.get_offset();
      preferences.putLong("tare_offset", tare_offset);
      scale.set_scale(cal_factor); // Will still use default scale until calibrated
      Serial.print("Initial Zero offset saved: ");
      Serial.println(tare_offset);
    }
  }

  Serial.println("\n>>> Press 'c' and send within 5 seconds to enter Calibration Mode <<<");
  long startTime = millis();
  bool calMode = false;
  while(millis() - startTime < 5000) {
    if (Serial.available()) {
      char c = Serial.read();
      if (c == 'c' || c == 'C') {
        calMode = true;
        break;
      }
    }
  }

  if (calMode) {
    runCalibrationMode();
  }

  // End of setup
}

void loop() {
  if (scale.wait_ready_timeout(1000)) {
    // Reverse connection fix: multiply by -1 to make negative weight positive
    float raw_weight = scale.get_units(10) * -1.0;
    
    // Configurable zero threshold to ignore noise (clamps tiny fluctuations to 0)
    if (raw_weight > -0.05 && raw_weight < 0.05) {
        raw_weight = 0.00;
    }
    
    Serial.print("Weight reading: ");
    Serial.print(raw_weight, 3);
    Serial.println(" kg");
    
    Serial.println("Sending data to server...");
    if (WiFi.status() != WL_CONNECTED) {
        connectWiFi();
    }
    sendReading(raw_weight);
  } else {
    Serial.println("HX711 not ready. Skipping API request.");
  }
  
  // Real-time monitoring for demonstration (5 second updates)
  delay(5000); 
}
