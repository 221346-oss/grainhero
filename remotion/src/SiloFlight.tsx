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

const { fontFamily: display } = loadArchivo("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: mono } = loadMono("normal", { weights: ["500", "700"], subsets: ["latin"] });

const BARK = "#252d26";
const LEAF = "#2FAC0C";
const LIME = "#8FE04B";
const BONE = "#EDE9D4";

const ease = Easing.bezier(0.33, 0, 0.2, 1);

type Cam = {
  scale: [number, number];
  x?: [number, number];
  y?: [number, number];
  rot?: [number, number];
};

const Shot: React.FC<{
  src: string;
  from: number;
  duration: number;
  cam: Cam;
  fadeIn?: number;
  fadeOut?: number;
  z?: number;
  blurIn?: boolean;
  children?: React.ReactNode;
}> = ({ src, from, duration, cam, fadeIn = 14, fadeOut = 14, z = 0, children }) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  if (local < -fadeIn || local > duration + fadeOut) return null;

  const p = interpolate(local, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(
    local,
    [-fadeIn, 0, duration - fadeOut, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease },
  );

  const scale = interpolate(p, [0, 1], cam.scale, { easing: ease });
  const x = cam.x ? interpolate(p, [0, 1], cam.x, { easing: ease }) : 0;
  const y = cam.y ? interpolate(p, [0, 1], cam.y, { easing: ease }) : 0;
  const rot = cam.rot ? interpolate(p, [0, 1], cam.rot, { easing: ease }) : 0;

  return (
    <AbsoluteFill style={{ opacity, zIndex: z, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${rot}deg)`,
        }}
      >
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      {children}
    </AbsoluteFill>
  );
};

/* ---------- sensor callout ---------- */

const Pin: React.FC<{
  from: number;
  duration: number;
  top: string;
  left: string;
  name: string;
  value: string;
  note: string;
  side?: "left" | "right";
}> = ({ from, duration, top, left, name, value, note, side = "right" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - from;
  if (local < 0 || local > duration) return null;

  const s = spring({ frame: local, fps, config: { damping: 18, stiffness: 190 } });
  const out = interpolate(local, [duration - 12, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineW = interpolate(s, [0, 1], [0, 86]);
  const opacity = s * out;
  const ringPulse = 1 + Math.sin(local / 6) * 0.14;

  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        opacity,
        display: "flex",
        flexDirection: side === "right" ? "row" : "row-reverse",
        alignItems: "center",
      }}
    >
      <div style={{ position: "relative", width: 22, height: 22 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            border: `2px solid ${LIME}`,
            transform: `scale(${ringPulse})`,
            opacity: 0.55,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 6,
            borderRadius: 999,
            background: LEAF,
            boxShadow: `0 0 18px ${LIME}`,
          }}
        />
      </div>
      <div style={{ width: lineW, height: 2, background: LIME, opacity: 0.85 }} />
      <div
        style={{
          background: "rgba(37,45,38,0.82)",
          borderLeft: side === "right" ? `3px solid ${LEAF}` : undefined,
          borderRight: side === "left" ? `3px solid ${LEAF}` : undefined,
          padding: "12px 18px",
          transform: `translateX(${side === "right" ? (1 - s) * -18 : (1 - s) * 18}px)`,
        }}
      >
        <div
          style={{
            fontFamily: mono,
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: 2,
            color: LIME,
            textTransform: "uppercase",
          }}
        >
          {name}
        </div>
        <div style={{ fontFamily: display, fontWeight: 900, fontSize: 40, color: BONE, lineHeight: 1.05 }}>
          {value}
        </div>
        <div style={{ fontFamily: mono, fontWeight: 500, fontSize: 18, color: "rgba(237,233,212,0.62)", marginTop: 2 }}>
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
  bottom?: number;
}> = ({ from, duration, lines, accentIndex = -1, align = "left", bottom = 140 }) => {
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
        padding: `0 110px ${bottom}px`,
        opacity: out,
      }}
    >
      <div style={{ textAlign: align }}>
        {lines.map((l, i) => {
          const s = spring({ frame: local - i * 5, fps, config: { damping: 20, stiffness: 170 } });
          return (
            <div key={i} style={{ overflow: "hidden" }}>
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 900,
                  fontSize: 96,
                  lineHeight: 0.98,
                  letterSpacing: -2,
                  textTransform: "uppercase",
                  color: i === accentIndex ? LIME : BONE,
                  transform: `translateY(${(1 - s) * 104}px)`,
                  textShadow: "0 6px 40px rgba(0,0,0,0.55)",
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

const Dust: React.FC<{ count?: number; opacity?: number }> = ({ count = 90, opacity = 0.5 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity }}>
      {new Array(count).fill(0).map((_, i) => {
        const seed = i + 1;
        const x = random(`x${seed}`) * 1920;
        const speed = 0.4 + random(`s${seed}`) * 1.9;
        const size = 1.5 + random(`z${seed}`) * 4;
        const y = (random(`y${seed}`) * 1080 + frame * speed * 6) % 1200 - 60;
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
              background: "rgba(255,236,190,0.85)",
              filter: "blur(0.4px)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at center, rgba(0,0,0,0) 38%, rgba(10,14,10,0.55) 78%, rgba(8,11,8,0.9) 100%)",
    }}
  />
);

const Grade: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, rgba(37,45,38,0.28) 0%, rgba(37,45,38,0.02) 45%, rgba(37,45,38,0.5) 100%)`,
      mixBlendMode: "multiply",
    }}
  />
);

/* HUD frame: subtle drone-camera framing */
const Hud: React.FC<{ label: string }> = ({ label }) => {
  const frame = useCurrentFrame();
  const blink = Math.sin(frame / 7) > 0 ? 1 : 0.25;
  const corner = (style: React.CSSProperties) => (
    <div style={{ position: "absolute", width: 46, height: 46, ...style }} />
  );
  return (
    <AbsoluteFill style={{ opacity: 0.55 }}>
      {corner({ top: 54, left: 54, borderTop: `2px solid ${LIME}`, borderLeft: `2px solid ${LIME}` })}
      {corner({ top: 54, right: 54, borderTop: `2px solid ${LIME}`, borderRight: `2px solid ${LIME}` })}
      {corner({ bottom: 54, left: 54, borderBottom: `2px solid ${LIME}`, borderLeft: `2px solid ${LIME}` })}
      {corner({ bottom: 54, right: 54, borderBottom: `2px solid ${LIME}`, borderRight: `2px solid ${LIME}` })}
      <div
        style={{
          position: "absolute",
          top: 58,
          left: 120,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: mono,
          fontSize: 18,
          letterSpacing: 3,
          color: LIME,
          textTransform: "uppercase",
        }}
      >
        <div style={{ width: 9, height: 9, borderRadius: 999, background: LEAF, opacity: blink }} />
        {label}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- main ---------- */

export const SiloFlight: React.FC = () => {
  const frame = useCurrentFrame();

  // interior darkness weight for dust/atmosphere
  const interior = interpolate(frame, [138, 176, 596, 640], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // hatch punch-through flash to black
  const punch = interpolate(frame, [152, 164, 178], [0, 0.95, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0d09" }}>
      {/* 1. APPROACH */}
      <Shot src="plates/01-approach.jpg" from={0} duration={120} fadeIn={0} cam={{ scale: [1.02, 1.46], y: [0, -60] }} />

      {/* 2. ROOF + HATCH */}
      <Shot src="plates/02-hatch.jpg" from={112} duration={58} cam={{ scale: [1.05, 2.6], rot: [0, 7] }} />

      {/* 3. HEADSPACE */}
      <Shot src="plates/03-headspace.jpg" from={164} duration={110} cam={{ scale: [1.6, 1.04], y: [-90, 40] }}>
        <Pin from={190} duration={70} top="22%" left="52%" name="SHT45" value="21.4°C · 68% RH" note="headspace air" />
        <Pin from={216} duration={50} top="58%" left="14%" name="BME680" value="VOC RISING" note="gas + pressure trend" />
      </Shot>

      {/* 4. GRAIN SURFACE */}
      <Shot src="plates/05-grain-surface.jpg" from={268} duration={84} cam={{ scale: [1.26, 1.02], y: [-46, 26] }}>
        <Pin from={286} duration={58} top="14%" left="58%" name="AJ-SR04M" value="3.24 m" note="ultrasonic grain level" />
      </Shot>

      {/* 5. WALL PROBES */}
      <Shot src="plates/04-wall-probes.jpg" from={346} duration={94} cam={{ scale: [1.3, 1.04], x: [90, -60] }}>
        <Pin from={364} duration={66} top="28%" left="44%" name="DS18B20" value="24.3°C" note="probe · top of mass" />
        <Pin from={392} duration={40} top="64%" left="6%" name="SCD41" value="1,240 ppm" note="CO₂ hot spot" />
      </Shot>

      {/* 6. AERATION FLOOR */}
      <Shot src="plates/06-aeration-floor.jpg" from={434} duration={78} cam={{ scale: [1.06, 1.34], y: [36, -28] }}>
        <Pin from={452} duration={52} top="18%" left="42%" name="AERATION FLOOR" value="AIR MOVES" note="grain stays put" />
      </Shot>

      {/* 7. FAN */}
      <Shot src="plates/07-fan.jpg" from={506} duration={66} cam={{ scale: [1.24, 1.02], x: [-70, 40] }}>
        <Pin from={522} duration={44} top="20%" left="54%" name="AERATION FAN" value="AUTO · ON" note="SG90 vent open" />
      </Shot>

      {/* 8. CONTROLLER */}
      <Shot src="plates/09-controller.jpg" from={566} duration={66} cam={{ scale: [1.02, 1.28], x: [30, -40] }}>
        <Pin from={582} duration={44} top="24%" left="10%" name="ESP32-S3" value="LIVE" note="edge node · OLED + alerts" />
      </Shot>

      {/* 9. EXIT */}
      <Shot src="plates/08-exit.jpg" from={626} duration={66} cam={{ scale: [1.05, 1.95], rot: [4, -2] }} />

      {/* 10. LOOP CLOSE — matches frame 0 */}
      <Shot src="plates/01-approach.jpg" from={686} duration={34} fadeOut={0} cam={{ scale: [1.02, 1.02] }} />

      {/* atmosphere */}
      <AbsoluteFill style={{ opacity: interior }}>
        <Dust count={110} opacity={0.55} />
      </AbsoluteFill>
      <Grade />
      <Vignette />
      <Hud label="GRAINHERO · SILO 04 · LIVE" />

      {/* punch to black at hatch entry */}
      <AbsoluteFill style={{ background: "#05070500", backgroundColor: `rgba(5,7,5,${punch})` }} />

      {/* statements */}
      <Statement from={18} duration={86} lines={["SPOILAGE", "STARTS INSIDE"]} accentIndex={1} />
      <Statement from={438} duration={78} lines={["EVERY LAYER", "UNDER WATCH"]} accentIndex={1} />
      <Statement from={632} duration={82} lines={["GRAINHERO", "SEES IT FIRST"]} accentIndex={1} />
    </AbsoluteFill>
  );
};
