import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  random,
  Easing,
} from "remotion";
import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: display } = loadArchivo("normal", {
  weights: ["700", "900"],
  subsets: ["latin"],
});
const { fontFamily: mono } = loadMono("normal", { weights: ["500", "700"], subsets: ["latin"] });

const INK = "#111512";
const GREEN = "#2FA84F";
const MIST = "#C7D9C1";
const BONE = "#FAFAF7";

const easeOut = Easing.bezier(0.16, 1, 0.3, 1); // decelerate (settle)
const easeIn = Easing.bezier(0.7, 0, 0.84, 0); // accelerate (ramp up)
const easeBoth = Easing.bezier(0.65, 0, 0.35, 1); // whip

type Ramp = "in" | "out" | "both";

const curve = (r: Ramp) => (r === "in" ? easeIn : r === "out" ? easeOut : easeBoth);

const Shot: React.FC<{
  src: string;
  from: number;
  duration: number;
  scale: [number, number];
  x?: [number, number];
  y?: [number, number];
  rot?: [number, number];
  ramp?: Ramp;
  fadeIn?: number;
  fadeOut?: number;
  children?: React.ReactNode;
}> = ({
  src,
  from,
  duration,
  scale,
  x,
  y,
  rot,
  ramp = "both",
  fadeIn = 12,
  fadeOut = 12,
  children,
}) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  if (local < -fadeIn || local > duration + fadeOut) return null;

  const e = curve(ramp);
  const p = interpolate(local, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: e,
  });

  const opacity = interpolate(
    local,
    [-Math.max(fadeIn, 0.01), 0, duration - Math.max(fadeOut, 0.01), duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const s = interpolate(p, [0, 1], scale);
  const tx = x ? interpolate(p, [0, 1], x) : 0;
  const ty = y ? interpolate(p, [0, 1], y) : 0;
  const rt = rot ? interpolate(p, [0, 1], rot) : 0;

  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden" }}>
      <AbsoluteFill
        style={{ transform: `translate3d(${tx}px, ${ty}px, 0) scale(${s}) rotate(${rt}deg)` }}
      >
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      {children}
    </AbsoluteFill>
  );
};

/* ---------- telemetry callout ---------- */

const Pin: React.FC<{
  from: number;
  duration: number;
  top: string;
  left: string;
  name: string;
  value: string;
  note: string;
}> = ({ from, duration, top, left, name, value, note }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - from;
  if (local < 0 || local > duration) return null;

  const s = spring({ frame: local, fps, config: { damping: 20, stiffness: 200 } });
  const out = interpolate(local, [duration - 12, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineW = interpolate(s, [0, 1], [0, 78]);
  const pulse = 1 + Math.sin(local / 6) * 0.16;

  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        opacity: s * out,
        display: "flex",
        alignItems: "center",
      }}
    >
      <div style={{ position: "relative", width: 20, height: 20 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            border: `2px solid ${GREEN}`,
            transform: `scale(${pulse})`,
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 6,
            borderRadius: 999,
            background: GREEN,
            boxShadow: `0 0 20px ${GREEN}`,
          }}
        />
      </div>
      <div style={{ width: lineW, height: 2, background: GREEN, opacity: 0.9 }} />
      <div
        style={{
          background: "rgba(17,21,18,0.78)",
          backdropFilter: undefined,
          borderLeft: `3px solid ${GREEN}`,
          padding: "10px 18px",
          transform: `translateX(${(1 - s) * -16}px)`,
        }}
      >
        <div
          style={{
            fontFamily: mono,
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: 2.5,
            color: GREEN,
            textTransform: "uppercase",
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 900,
            fontSize: 40,
            color: BONE,
            lineHeight: 1.05,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontFamily: mono,
            fontWeight: 500,
            fontSize: 17,
            color: "rgba(250,250,247,0.6)",
          }}
        >
          {note}
        </div>
      </div>
    </div>
  );
};

/* ---------- kinetic statement ---------- */

const Statement: React.FC<{
  from: number;
  duration: number;
  lines: string[];
  accentIndex?: number;
  align?: "left" | "center";
}> = ({ from, duration, lines, accentIndex = -1, align = "left" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - from;
  if (local < 0 || local > duration) return null;
  const out = interpolate(local, [duration - 14, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: align === "center" ? "center" : "flex-start",
        padding: `0 110px 130px`,
        opacity: out,
      }}
    >
      <div style={{ textAlign: align }}>
        {lines.map((l, i) => {
          const s = spring({ frame: local - i * 5, fps, config: { damping: 22, stiffness: 180 } });
          return (
            <div key={i} style={{ overflow: "hidden" }}>
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 900,
                  fontSize: 92,
                  lineHeight: 1.0,
                  letterSpacing: -2,
                  textTransform: "uppercase",
                  color: i === accentIndex ? GREEN : BONE,
                  transform: `translateY(${(1 - s) * 100}px)`,
                  textShadow: "0 6px 44px rgba(0,0,0,0.6)",
                }}
              >
                {l}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- atmosphere ---------- */

const Dust: React.FC<{ count?: number }> = ({ count = 110 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {new Array(count).fill(0).map((_, i) => {
        const seed = i + 1;
        const x = random(`x${seed}`) * 1920;
        const speed = 0.4 + random(`s${seed}`) * 2;
        const size = 1.4 + random(`z${seed}`) * 3.6;
        const y = ((random(`y${seed}`) * 1080 + frame * speed * 6) % 1240) - 80;
        const drift = Math.sin((frame + seed * 20) / 40) * 26;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + drift,
              top: y,
              width: size,
              height: size,
              borderRadius: 999,
              background: "rgba(255,240,205,0.8)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Hud: React.FC = () => {
  const frame = useCurrentFrame();
  const blink = Math.sin(frame / 7) > 0 ? 1 : 0.2;
  const corner = (style: React.CSSProperties) => (
    <div style={{ position: "absolute", width: 44, height: 44, ...style }} />
  );
  return (
    <AbsoluteFill style={{ opacity: 0.5 }}>
      {corner({
        top: 54,
        left: 54,
        borderTop: `2px solid ${MIST}`,
        borderLeft: `2px solid ${MIST}`,
      })}
      {corner({
        top: 54,
        right: 54,
        borderTop: `2px solid ${MIST}`,
        borderRight: `2px solid ${MIST}`,
      })}
      {corner({
        bottom: 54,
        left: 54,
        borderBottom: `2px solid ${MIST}`,
        borderLeft: `2px solid ${MIST}`,
      })}
      {corner({
        bottom: 54,
        right: 54,
        borderBottom: `2px solid ${MIST}`,
        borderRight: `2px solid ${MIST}`,
      })}
      <div
        style={{
          position: "absolute",
          top: 58,
          left: 118,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: mono,
          fontSize: 17,
          letterSpacing: 3,
          color: MIST,
          textTransform: "uppercase",
        }}
      >
        <div
          style={{ width: 9, height: 9, borderRadius: 999, background: GREEN, opacity: blink }}
        />
        GRAINHERO · SILO 04 · LIVE
      </div>
    </AbsoluteFill>
  );
};

/* ---------- main : 24s loop @30fps = 720 frames ---------- */

export const SiloFlightV2: React.FC = () => {
  const frame = useCurrentFrame();

  // interior weight for dust
  const interior = interpolate(frame, [176, 206, 520, 556], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // flash to black entering the hatch
  const blackFlash = interpolate(frame, [176, 184, 200], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // flash to white exiting through the roof
  const whiteFlash = interpolate(frame, [560, 572, 592], [0, 0.92, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      {/* 1 · APPROACH — slow drift ramping into a fast push */}
      <Shot
        src="v2/01-approach.jpg"
        from={0}
        duration={132}
        fadeIn={0}
        ramp="in"
        scale={[1.04, 1.5]}
        y={[0, -50]}
      />

      {/* 2 · HATCH — whip punch straight into the opening */}
      <Shot
        src="v2/02-hatch.jpg"
        from={124}
        duration={64}
        ramp="in"
        scale={[1.06, 2.9]}
        rot={[0, 8]}
      />

      {/* 3 · INTERIOR REVEAL — decelerate into the cathedral */}
      <Shot
        src="v2/03-interior.jpg"
        from={186}
        duration={116}
        ramp="out"
        scale={[1.7, 1.05]}
        y={[-110, 30]}
      >
        <Pin
          from={218}
          duration={72}
          top="24%"
          left="54%"
          name="SHT45"
          value="21.4°C · 68% RH"
          note="headspace air"
        />
      </Shot>

      {/* 4 · GRAIN MACRO — high-speed kernels */}
      <Shot
        src="v2/05-grain.jpg"
        from={296}
        duration={84}
        ramp="both"
        scale={[1.3, 1.02]}
        x={[70, -50]}
      >
        <Pin
          from={314}
          duration={56}
          top="16%"
          left="56%"
          name="AJ-SR04M"
          value="3.24 m"
          note="ultrasonic grain level"
        />
      </Shot>

      {/* 5 · SENSOR MACRO */}
      <Shot
        src="v2/04-sensor.jpg"
        from={374}
        duration={86}
        ramp="out"
        scale={[1.28, 1.03]}
        x={[-80, 40]}
      >
        <Pin
          from={392}
          duration={58}
          top="60%"
          left="46%"
          name="DS18B20"
          value="24.3°C"
          note="probe · top of mass"
        />
      </Shot>

      {/* 6 · CONTROLLER MACRO */}
      <Shot
        src="v2/06-controller.jpg"
        from={454}
        duration={82}
        ramp="both"
        scale={[1.04, 1.3]}
        y={[26, -30]}
      >
        <Pin
          from={470}
          duration={56}
          top="22%"
          left="52%"
          name="ESP32-S3"
          value="LIVE"
          note="edge node · alerts out"
        />
      </Shot>

      {/* 7 · EXIT — accelerate up through the hatch */}
      <Shot
        src="v2/07-exit.jpg"
        from={530}
        duration={66}
        ramp="in"
        scale={[1.06, 2.2]}
        rot={[3, -3]}
      />

      {/* 8 · CLIMB AWAY — settle */}
      <Shot
        src="v2/08-away.jpg"
        from={586}
        duration={104}
        ramp="out"
        scale={[1.32, 1.06]}
        y={[-40, 20]}
      />

      {/* 9 · LOOP CLOSE — match frame 0 */}
      <Shot
        src="v2/01-approach.jpg"
        from={676}
        duration={44}
        fadeOut={0}
        ramp="out"
        scale={[1.04, 1.04]}
      />

      {/* atmosphere */}
      <AbsoluteFill style={{ opacity: interior * 0.6 }}>
        <Dust count={120} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(10,14,10,0.5) 78%, rgba(8,11,8,0.9) 100%)",
        }}
      />
      <Hud />

      {/* statements */}
      <Statement from={22} duration={92} lines={["SPOILAGE", "STARTS INSIDE"]} accentIndex={1} />
      <Statement from={390} duration={84} lines={["EVERY LAYER", "UNDER WATCH"]} accentIndex={1} />
      <Statement from={600} duration={94} lines={["GRAINHERO", "SEES IT FIRST"]} accentIndex={1} />

      {/* transition flashes */}
      <AbsoluteFill style={{ backgroundColor: `rgba(5,7,5,${blackFlash})` }} />
      <AbsoluteFill style={{ backgroundColor: `rgba(250,250,247,${whiteFlash})` }} />
    </AbsoluteFill>
  );
};
