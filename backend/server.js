import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { SerialPort } from "serialport";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 5000;
const SERIAL_PORT = process.env.SERIAL_PORT || ""; // e.g. COM5 or /dev/ttyUSB0
const BAUD_RATE = Number(process.env.BAUD_RATE || 115200);

let port = null;
let connectedToEsp32 = false;

function emitStatus() {
  io.emit("connection_status", {
    esp32: connectedToEsp32,
    serialPort: SERIAL_PORT || null
  });
}

function sendToEsp32(payload) {
  if (!port || !port.isOpen) return false;
  port.write(JSON.stringify(payload) + "\n");
  return true;
}

if (SERIAL_PORT) {
  port = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE });

  port.on("open", () => {
    connectedToEsp32 = true;
    console.log(`ESP32 connected on ${SERIAL_PORT}`);
    emitStatus();
  });

  port.on("data", (buffer) => {
    const lines = buffer.toString().split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const telemetry = JSON.parse(line);
        io.emit("telemetry", telemetry);
      } catch {
        console.log("ESP32:", line.trim());
      }
    }
  });

  port.on("error", (err) => {
    connectedToEsp32 = false;
    console.error("Serial error:", err.message);
    emitStatus();
  });

  port.on("close", () => {
    connectedToEsp32 = false;
    emitStatus();
  });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, esp32: connectedToEsp32 });
});

io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);
  socket.emit("connection_status", {
    esp32: connectedToEsp32,
    serialPort: SERIAL_PORT || null
  });

  socket.on("control", (payload) => {
    const safe = {
      type: payload?.type,
      throttle: Number(payload?.throttle || 0),
      roll: Number(payload?.roll || 0),
      pitch: Number(payload?.pitch || 0),
      yaw: Number(payload?.yaw || 0)
    };

    // Keep prototype commands bounded.
    safe.throttle = Math.max(0, Math.min(100, safe.throttle));
    safe.roll = Math.max(-100, Math.min(100, safe.roll));
    safe.pitch = Math.max(-100, Math.min(100, safe.pitch));
    safe.yaw = Math.max(-100, Math.min(100, safe.yaw));

    sendToEsp32(safe);
    socket.broadcast.emit("control_preview", safe);
  });

  socket.on("arm", (armed) => {
    sendToEsp32({ type: armed ? "arm" : "disarm" });
    io.emit("armed_state", Boolean(armed));
  });

  socket.on("emergency_stop", () => {
    sendToEsp32({ type: "emergency_stop" });
    io.emit("armed_state", false);
  });
});

server.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
  if (!SERIAL_PORT) {
    console.log("SERIAL_PORT is not set. Running dashboard in simulation/preview mode.");
  }
});
