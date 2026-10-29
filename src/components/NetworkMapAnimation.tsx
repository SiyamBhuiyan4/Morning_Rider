import { memo, useEffect, useRef } from "react";
import { t } from "../lib/prefs";

interface Hub {
  id: string;
  name: string;
  x: number;
  y: number;
}

// 8 Divisional Hubs across Bangladesh
const HUBS: Hub[] = [
  { id: "dhaka", name: "Dhaka", x: 245.7, y: 288.3 },
  { id: "ctg", name: "Chattogram", x: 369.3, y: 428.0 },
  { id: "khu", name: "Khulna", x: 170.4, y: 383.1 },
  { id: "raj", name: "Rajshahi", x: 87.1, y: 234.7 },
  { id: "syl", name: "Sylhet", x: 373.7, y: 184.0 },
  { id: "bar", name: "Barishal", x: 242.2, y: 394.5 },
  { id: "ran", name: "Rangpur", x: 143.2, y: 102.7 },
  { id: "mym", name: "Mymensingh", x: 244.9, y: 198.4 },
];

interface Projectile {
  id: number;
  p0: { x: number; y: number };
  cp: { x: number; y: number };
  p2: { x: number; y: number };
  destHub: Hub;
  startTime: number;
  duration: number;
  color: string;
  coreColor: string;
}

interface PulseRing {
  id: number;
  x: number;
  y: number;
  startTime: number;
  duration: number;
  maxRadius: number;
  color: string;
}

/**
 * Compute quadratic Bézier curve control point between two hubs
 */
function getControlPoint(p0: { x: number; y: number }, p2: { x: number; y: number }, bend: number) {
  const mx = (p0.x + p2.x) / 2;
  const my = (p0.y + p2.y) / 2;
  const dx = p2.x - p0.x;
  const dy = p2.y - p0.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;
  return {
    x: mx + nx * dist * bend,
    y: my + ny * dist * bend,
  };
}

/**
 * Get point along quadratic Bézier curve at progress t (0 -> 1)
 */
function getBezierPoint(
  p0: { x: number; y: number },
  cp: { x: number; y: number },
  p2: { x: number; y: number },
  t: number
) {
  const oneMinusT = 1 - t;
  return {
    x: oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * cp.x + t * t * p2.x,
    y: oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * cp.y + t * t * p2.y,
  };
}

export const NetworkMapAnimation = memo(function NetworkMapAnimation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rawCtx = canvas.getContext("2d", { alpha: true });
    if (!rawCtx) return;
    const ctx = rawCtx;

    let animationFrameId: number;
    let nextId = 0;
    let lastSpawnTime = 0;
    const SPAWN_INTERVAL = 950; // ms between each dual-parcel shot
    const DURATION = 1150; // ms transit time per parcel

    const projectiles: Projectile[] = [];
    const rings: PulseRing[] = [];

    // Scale canvas for crisp Retina resolution
    const width = 480;
    const height = 600;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const colors = [
      { glow: "#58E8A6", core: "#FFFFFF" }, // Neon Emerald
      { glow: "#F59E0B", core: "#FFF3CD" }, // Courier Amber
    ];
    let colorIndex = 0;

    /**
     * DYNAMIC RANDOM FUNCTION LOGIC:
     * 1. Use Math.random() to pick 1 random origin point.
     * 2. Excluding the origin, use Math.random() to pick 2 distinct destination points.
     * 3. Shoot 2 parcels from the origin to the 2 destinations simultaneously.
     */
    function spawnRandomPair(now: number) {
      // 1. Randomly select 1 origin hub using Math.random()
      const originIndex = Math.floor(Math.random() * HUBS.length);
      const origin = HUBS[originIndex];

      // 2. Filter out origin, then randomly select 2 distinct destination hubs using Math.random()
      const poolAfterOrigin = HUBS.filter((_, i) => i !== originIndex);

      const dest1Index = Math.floor(Math.random() * poolAfterOrigin.length);
      const dest1 = poolAfterOrigin[dest1Index];

      const poolAfterDest1 = poolAfterOrigin.filter((_, i) => i !== dest1Index);
      const dest2Index = Math.floor(Math.random() * poolAfterDest1.length);
      const dest2 = poolAfterDest1[dest2Index];

      const palette = colors[colorIndex % colors.length];
      colorIndex++;

      // Trigger origin dispatch beacon ring
      rings.push({
        id: nextId++,
        x: origin.x,
        y: origin.y,
        startTime: now,
        duration: 450,
        maxRadius: 26,
        color: palette.glow,
      });

      // Parcel 1: Origin -> Destination 1
      const cp1 = getControlPoint(origin, dest1, 0.12);
      projectiles.push({
        id: nextId++,
        p0: { x: origin.x, y: origin.y },
        cp: cp1,
        p2: { x: dest1.x, y: dest1.y },
        destHub: dest1,
        startTime: now,
        duration: DURATION,
        color: palette.glow,
        coreColor: palette.core,
      });

      // Parcel 2: Origin -> Destination 2
      const cp2 = getControlPoint(origin, dest2, -0.12);
      projectiles.push({
        id: nextId++,
        p0: { x: origin.x, y: origin.y },
        cp: cp2,
        p2: { x: dest2.x, y: dest2.y },
        destHub: dest2,
        startTime: now,
        duration: DURATION,
        color: palette.glow,
        coreColor: palette.core,
      });
    }

    function render(now: number) {
      if (now - lastSpawnTime >= SPAWN_INTERVAL) {
        spawnRandomPair(now);
        lastSpawnTime = now;
      }

      ctx.clearRect(0, 0, width, height);

      // ----------------------------------------------------
      // 1. Draw Shockwave Rings (Origin Beacon & Arrival Rings)
      // ----------------------------------------------------
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        const elapsed = now - ring.startTime;
        const progress = Math.min(elapsed / ring.duration, 1);

        if (progress >= 1) {
          rings.splice(i, 1);
          continue;
        }

        // Cubic ease out
        const ease = 1 - Math.pow(1 - progress, 3);
        const radius = 4 + ring.maxRadius * ease;
        const alpha = Math.max(0, 1 - progress);

        ctx.save();
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = Math.max(0.6, 2.2 * (1 - progress));
        ctx.globalAlpha = alpha * 0.9;
        ctx.shadowColor = ring.color;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();
      }

      // ----------------------------------------------------
      // 2. Draw In-Flight Moving Parcels & Luminous Trails
      // ----------------------------------------------------
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        const elapsed = now - p.startTime;
        const t = Math.min(elapsed / p.duration, 1);

        // Cubic bezier easing for courier delivery acceleration
        const progress = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        if (t >= 1) {
          // Parcel arrived at destination hub -> Spawn arrival delivery pulse ring
          rings.push({
            id: nextId++,
            x: p.destHub.x,
            y: p.destHub.y,
            startTime: now,
            duration: 520,
            maxRadius: 28,
            color: p.color,
          });

          projectiles.splice(i, 1);
          continue;
        }

        const head = getBezierPoint(p.p0, p.cp, p.p2, progress);

        // Draw luminous trailing comet beam (from progress - 0.22 to progress)
        const trailLength = 0.22;
        const trailStartProgress = Math.max(0, progress - trailLength);
        const sampleCount = 14;

        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Trailing glow segment
        for (let s = 1; s <= sampleCount; s++) {
          const segT1 = trailStartProgress + ((s - 1) / sampleCount) * (progress - trailStartProgress);
          const segT2 = trailStartProgress + (s / sampleCount) * (progress - trailStartProgress);
          const pt1 = getBezierPoint(p.p0, p.cp, p.p2, segT1);
          const pt2 = getBezierPoint(p.p0, p.cp, p.p2, segT2);
          const segAlpha = (s / sampleCount);

          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.4 + segAlpha * 2.4;
          ctx.globalAlpha = segAlpha * 0.85;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.stroke();
        }

        // Draw Parcel Core Capsule (Glowing Capsule Head)
        ctx.beginPath();
        ctx.arc(head.x, head.y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = p.coreColor;
        ctx.globalAlpha = 1;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 14;
        ctx.fill();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    }

    // Spawn first shot immediately upon mount
    spawnRandomPair(performance.now());
    lastSpawnTime = performance.now();
    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0e1612] p-4 sm:p-6 text-white shadow-2xl">
      <div className="relative mx-auto w-full max-w-lg">
        {/* Top-left "Network live" badge */}
        <div className="absolute top-4 left-4 z-20">
          <span className="inline-flex items-center gap-2 rounded-xl bg-[#17251d]/90 px-3.5 py-1.5 text-xs font-bold text-[#58E8A6] border border-[#58E8A6]/30 shadow-lg backdrop-blur-md">
            <span className="size-2 rounded-full bg-[#00BF6F] animate-ping" />
            <span>{t("Network live")}</span>
          </span>
        </div>

        {/* Map Graphic with Real-time Math.random() Decentralized Dispatch */}
        <div className="relative overflow-hidden rounded-2xl bg-[#131c17]/60 p-2 sm:p-4 border border-white/5 shadow-inner flex items-center justify-center">
          <div className="relative w-full max-w-[460px] aspect-[480/600]">
            {/* Base SVG Map */}
            <img
              src="/brand/network-map.svg"
              alt="Bangladesh Live Courier Network Map"
              width={480}
              height={600}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
              loading="eager"
              decoding="async"
            />

            {/* High-Performance 60FPS Dynamic Courier Parcel Canvas Overlay */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
});
