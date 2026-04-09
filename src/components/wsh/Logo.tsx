'use client';

import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

/**
 * WeaveNote Logo — Mathematically precise SVG reconstruction.
 *
 * Components:
 *   1. Hexagon Frame   — 6-point regular polygon
 *   2. Spider Web      — 8 radial lines + 3 concentric rings drawn with
 *                        quadratic Bézier curves (Q command) so each ring
 *                        segment droops realistically under "gravity"
 *   3. Fountain-pen Nib — Bezier-curved outline with a translucent fill
 *   4. Gradient         — 3-stop linear gradient  (#0ea5e9 → #0284c7 → #0f172a)
 */
export default function Logo({ size = 44, showText = true, className = '' }: LogoProps) {
  // ── Derived geometry ──────────────────────────────────────────────
  // All coordinates are computed from a 100×100 viewbox so the SVG
  // scales perfectly to any `size` prop.
  const center = 50;
  const hexR = 46; // hexagon circumradius

  // Regular hexagon vertices (flat-top orientation)
  const hexPoints = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2; // start at top
    return [
      center + hexR * Math.cos(angle),
      center + hexR * Math.sin(angle),
    ];
  });

  // ── Spider-web radial lines (8) ───────────────────────────────────
  const numRadials = 8;
  const radials = Array.from({ length: numRadials }, (_, i) => {
    const angle = (Math.PI * 2 * i) / numRadials - Math.PI / 2;
    return [
      center + hexR * 0.88 * Math.cos(angle),
      center + hexR * 0.88 * Math.sin(angle),
    ];
  });

  // ── Spider-web concentric rings (3) with gravity droop ─────────────
  // Each ring is split into `numRadials` arc segments.
  // For each segment the control point of the quadratic Bézier is pulled
  // downward (positive y) to simulate gravity sag.
  const ringRadii = [0.22, 0.46, 0.70];

  const buildRingPath = (ringR: number, droopAmount: number) => {
    let d = '';
    for (let i = 0; i < numRadials; i++) {
      const a1 = (Math.PI * 2 * i) / numRadials - Math.PI / 2;
      const a2 = (Math.PI * 2 * ((i + 1) % numRadials)) / numRadials - Math.PI / 2;

      const x1 = center + hexR * ringR * Math.cos(a1);
      const y1 = center + hexR * ringR * Math.sin(a1);
      const x2 = center + hexR * ringR * Math.cos(a2);
      const y2 = center + hexR * ringR * Math.sin(a2);

      // Control point at midpoint, pulled downward by droopAmount
      const midAngle = (a1 + a2) / 2;
      const cx = center + hexR * ringR * Math.cos(midAngle);
      const cy = center + hexR * ringR * Math.sin(midAngle) + droopAmount;

      d += (i === 0 ? 'M' : 'L') + `${x1.toFixed(2)},${y1.toFixed(2)} `;
      d += `Q${cx.toFixed(2)},${cy.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)} `;
    }
    d += 'Z';
    return d;
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* ── SVG Logo Mark ────────────────────────────────────────── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-label="WeaveNote logo"
      >
        <defs>
          {/* 3-stop gradient: teal → mid-blue → navy */}
          <linearGradient id="wsh-logo-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="50%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Subtle inner glow */}
          <radialGradient id="wsh-inner-glow" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Hexagon Frame */}
        <polygon
          points={hexPoints.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ')}
          fill="none"
          stroke="url(#wsh-logo-grad)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Inner glow fill */}
        <polygon
          points={hexPoints.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ')}
          fill="url(#wsh-inner-glow)"
        />

        {/* 2. Spider-web radial lines */}
        {radials.map((p, i) => (
          <line
            key={`radial-${i}`}
            x1={center}
            y1={center}
            x2={p[0]}
            y2={p[1]}
            stroke="url(#wsh-logo-grad)"
            strokeWidth="0.7"
            opacity="0.55"
          />
        ))}

        {/* 3. Spider-web concentric rings (with gravity droop) */}
        {ringRadii.map((r, i) => (
          <path
            key={`ring-${i}`}
            d={buildRingPath(r, 1.8 + i * 0.6)}
            fill="none"
            stroke="url(#wsh-logo-grad)"
            strokeWidth="0.7"
            opacity="0.5"
          />
        ))}

        {/* Center dot */}
        <circle
          cx={center}
          cy={center}
          r="1.8"
          fill="#0ea5e9"
          opacity="0.7"
        />

        {/* 4. Fountain-pen Nib */}
        <g opacity="0.9">
          {/* Main nib outline — flare at top, band in middle, point at bottom */}
          <path
            d={`
              M 42,14
              C 42,14 40,18 40,24
              L 38,30
              L 38,42
              C 38,46 42,50 50,54
              C 58,50 62,46 62,42
              L 62,30
              L 60,24
              C 60,18 58,14 58,14
              Z
            `}
            fill="url(#wsh-logo-grad)"
            fillOpacity="0.06"
            stroke="url(#wsh-logo-grad)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />

          {/* Horizontal band across nib middle */}
          <line
            x1="39"
            y1="36"
            x2="61"
            y2="36"
            stroke="url(#wsh-logo-grad)"
            strokeWidth="0.8"
            opacity="0.6"
          />

          {/* Center slit from band to point */}
          <line
            x1="50"
            y1="36"
            x2="50"
            y2="52"
            stroke="url(#wsh-logo-grad)"
            strokeWidth="0.6"
            opacity="0.5"
          />

          {/* Breather hole */}
          <circle
            cx="50"
            cy="24"
            r="2.5"
            fill="none"
            stroke="url(#wsh-logo-grad)"
            strokeWidth="0.8"
            opacity="0.6"
          />
        </g>
      </svg>

      {/* ── Typography Lockup ─────────────────────────────────────── */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-xl font-extrabold tracking-tight text-foreground select-none">
            WeaveNote
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-0.5 select-none">
            Your Ideas, Connected.
          </span>
        </div>
      )}
    </div>
  );
}
