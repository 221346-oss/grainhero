export function neonPatternId(color: string) {
  return `neon-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
}

export function NeonPatternDefs({ colors }: { colors: string[] }) {
  const unique = [...new Set(colors)];
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        {unique.map((color) => (
          <pattern
            key={color}
            id={neonPatternId(color)}
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(-45)"
          >
            <rect width="6" height="6" fill={color} fillOpacity="0.12" />
            <line x1="0" y1="0" x2="0" y2="6" stroke={color} strokeWidth="1.5" strokeOpacity="0.75" />
          </pattern>
        ))}
      </defs>
    </svg>
  );
}
