# ESP32 + React + Node.js Drone Controller

A learning-oriented drone-control project with:
- ESP32 telemetry/control bridge
- Node.js + Express + Socket.IO server
- React + Vite dashboard
- Virtual joystick controls
- Battery/telemetry display
- Arm/disarm and emergency-stop UI

## Safety
Start in simulation/bench-test mode with propellers removed. The sample ESP32 firmware below is intentionally a control/telemetry prototype and does not implement a flight-stabilization loop, PID controller, or autonomous navigation.

## Architecture

React Dashboard <-> Socket.IO <-> Node.js <-> Serial/ESP32
                                         |
                                         +-- telemetry
                                         +-- control commands

## Requirements
- Node.js 20+
- npm
- Arduino IDE or PlatformIO
- ESP32 board
- USB cable

## Start backend
cd backend
npm install
npm run dev

The server listens on http://localhost:5000.

## Start frontend
cd frontend
npm install
npm run dev

Open the Vite URL shown in the terminal.

## ESP32
Open `esp32/drone_controller.ino` in Arduino IDE.
Install:
- ESP32 board support
- ArduinoJson library

Select the correct ESP32 board and serial port, then upload.

The firmware sends telemetry JSON over USB serial and accepts simple JSON commands.
