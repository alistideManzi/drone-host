import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", { autoConnect: true });

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function Joystick({ label, x, y, onChange }) {
  const ref = useRef(null);

  const update = (e) => {
    const r = ref.current.getBoundingClientRect();
    const px = clamp(e.clientX - r.left - r.width / 2, -r.width / 2, r.width / 2);
    const py = clamp(e.clientY - r.top - r.height / 2, -r.height / 2, r.height / 2);
    onChange({
      x: Math.round((px / (r.width / 2)) * 100),
      y: Math.round((-py / (r.height / 2)) * 100)
    });
  };

  return (
    <div className="stick-wrap">
      <div
        className="joystick"
        ref={ref}
        onPointerMove={(e) => e.buttons && update(e)}
        onPointerDown={(e) => { ref.current.setPointerCapture(e.pointerId); update(e); }}
        onPointerUp={() => onChange({x:0,y:0})}
      >
        <div className="stick" style={{ transform: `translate(${x * 0.65}px, ${-y * 0.65}px)` }} />
      </div>
      <span>{label}</span>
    </div>
  );
}

export default function App() {
  const [connected, setConnected] = useState(false);
  const [armed, setArmed] = useState(false);
  const [telemetry, setTelemetry] = useState({
    battery: 100, altitude: 0, speed: 0, satellites: 0, rssi: -50
  });
  const [left, setLeft] = useState({x:0,y:0});
  const [right, setRight] = useState({x:0,y:0});
  const [throttle, setThrottle] = useState(0);

  useEffect(() => {
    socket.on("connection_status", s => setConnected(Boolean(s.esp32)));
    socket.on("telemetry", setTelemetry);
    socket.on("armed_state", setArmed);
    return () => {
      socket.off("connection_status");
      socket.off("telemetry");
      socket.off("armed_state");
    };
  }, []);

  const sendControl = (nextThrottle = throttle, l = left, r = right) => {
    socket.emit("control", {
      type: "stick",
      throttle: nextThrottle,
      yaw: l.x,
      pitch: r.y,
      roll: r.x
    });
  };

  const setT = (value) => {
    const v = clamp(Number(value), 0, 100);
    setThrottle(v);
    sendControl(v);
  };

  const arm = () => {
    const next = !armed;
    setArmed(next);
    socket.emit("arm", next);
  };

  const emergency = () => {
    setArmed(false);
    setThrottle(0);
    socket.emit("emergency_stop");
  };

  return (
    <main>
      <header>
        <div>
          <h1>🚁 Drone Controller</h1>
          <p>ESP32 + Node.js + React</p>
        </div>
        <div className={`status ${connected ? "online" : "offline"}`}>
          ● {connected ? "ESP32 Connected" : "Simulation / Disconnected"}
        </div>
      </header>

      <section className="stats">
        <div><b>{telemetry.battery}%</b><span>Battery</span></div>
        <div><b>{telemetry.altitude.toFixed?.(1) ?? telemetry.altitude} m</b><span>Altitude</span></div>
        <div><b>{telemetry.speed.toFixed?.(1) ?? telemetry.speed} m/s</b><span>Speed</span></div>
        <div><b>{telemetry.satellites}</b><span>GPS Satellites</span></div>
        <div><b>{telemetry.rssi} dBm</b><span>Signal</span></div>
      </section>

      <section className="controls">
        <div className="panel">
          <h2>Flight Controls</h2>
          <div className="sticks">
            <Joystick label="Yaw / Throttle" x={left.x} y={left.y} onChange={v => {setLeft(v); sendControl(throttle, v, right)}} />
            <Joystick label="Roll / Pitch" x={right.x} y={right.y} onChange={v => {setRight(v); sendControl(throttle, left, v)}} />
          </div>
          <label className="range-label">Throttle: {throttle}%</label>
          <input type="range" min="0" max="100" value={throttle} onChange={e => setT(e.target.value)} />
        </div>

        <div className="panel actions">
          <h2>Safety</h2>
          <button className={armed ? "disarm" : "arm"} onClick={arm}>
            {armed ? "DISARM" : "ARM"}
          </button>
          <button className="emergency" onClick={emergency}>EMERGENCY STOP</button>
          <p>Always test with propellers removed before attempting flight.</p>
        </div>
      </section>
    </main>
  );
}
