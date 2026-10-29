import { memo, useState, useCallback, useRef, useEffect } from "react";
import { t } from "../lib/prefs";

/**
 * Synthesizes a realistic dual-tone vehicle horn sound via Web Audio API.
 * Uses brassy harmonic sawtooth waves with vehicle chamber acoustic filtering.
 */
function playVehicleHorn() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const now = ctx.currentTime;

    // Dual-tone automotive trumpet horn: 440Hz + 554Hz major third chord with 880Hz overtone
    const tones = [
      { freq: 440, gain: 0.16 },
      { freq: 554, gain: 0.14 },
      { freq: 880, gain: 0.04 },
    ];

    const playBurst = (startTime: number, duration: number) => {
      tones.forEach(({ freq, gain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.linearRampToValueAtTime(freq * 0.985, startTime + duration);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(2400, startTime);

        gainNode.gain.setValueAtTime(0.001, startTime);
        gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.015);
        gainNode.gain.setValueAtTime(gain * 0.9, startTime + duration - 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    };

    // Realistic double-tap vehicle horn: Beep! Beep!
    playBurst(now, 0.15);
    playBurst(now + 0.19, 0.25);
  } catch {
    // Graceful fallback if audio is disallowed by policy
  }
}

export const RoadBandAnimation = memo(function RoadBandAnimation() {
  const [isPanicking, setIsPanicking] = useState(false);
  const [isHonking, setIsHonking] = useState(false);
  const panicTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const honkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleGlobalHornClick = useCallback(() => {
    // Play realistic audio horn
    playVehicleHorn();

    // Trigger visual horn effect from truck
    setIsHonking(true);
    if (honkTimeoutRef.current) {
      clearTimeout(honkTimeoutRef.current);
    }
    honkTimeoutRef.current = setTimeout(() => {
      setIsHonking(false);
    }, 650);

    // Runner gets terrified by the horn and sprints forward in panic!
    setIsPanicking(true);
    if (panicTimeoutRef.current) {
      clearTimeout(panicTimeoutRef.current);
    }
    panicTimeoutRef.current = setTimeout(() => {
      setIsPanicking(false);
    }, 2400);
  }, []);

  useEffect(() => {
    return () => {
      if (panicTimeoutRef.current) clearTimeout(panicTimeoutRef.current);
      if (honkTimeoutRef.current) clearTimeout(honkTimeoutRef.current);
    };
  }, []);

  return (
    <div
      onClick={handleGlobalHornClick}
      onTouchStart={handleGlobalHornClick}
      title={t("Tap anywhere to honk horn")}
      className="relative w-full overflow-hidden select-none bg-[#050b18] cursor-pointer group"
    >
      {/* Interactive Floating Hint Badge */}
      <div className="absolute top-3 inset-x-0 z-30 flex justify-center pointer-events-none">
        <div className="flex items-center gap-2 rounded-full bg-black/65 backdrop-blur-md px-4 py-1 border border-[#f8b030]/40 shadow-lg text-xs font-bold text-[#f8b030] transition group-hover:border-[#f8b030] group-hover:scale-105">
          <span className="size-2 rounded-full bg-[#f8b030] animate-ping" />
          <span>🔊 {t("Tap anywhere to honk horn")}</span>
        </div>
      </div>
      {/* ---------------- Day/Night Ambient Sky Container ---------------- */}
      <div className="relative w-full h-[270px] sm:h-[320px] overflow-hidden">
        {/* Layer 1: Morning Sunrise / Dawn */}
        <div className="sky-layer sky-sunrise absolute inset-0 pointer-events-none" />

        {/* Layer 2: Bright Daylight / Noon */}
        <div className="sky-layer sky-day absolute inset-0 pointer-events-none" />

        {/* Layer 3: Sunset / Dusk */}
        <div className="sky-layer sky-sunset absolute inset-0 pointer-events-none" />

        {/* Layer 4: Deep Night with Twinkling Stars */}
        <div className="sky-layer sky-night absolute inset-0 pointer-events-none">
          <div className="star star-1" />
          <div className="star star-2" />
          <div className="star star-3" />
          <div className="star star-4" />
          <div className="star star-5" />
          <div className="star star-6" />
          <div className="star star-7" />
          <div className="star star-8" />
          <div className="star star-9" />
          <div className="star star-10" />
        </div>

        {/* Celestial Bodies: Sun and Moon orbiting */}
        <div className="celestial-orbit absolute inset-x-0 bottom-20 h-40 pointer-events-none">
          {/* Glowing Sun */}
          <div className="sun-body absolute size-14 rounded-full bg-gradient-to-tr from-[#f57a10] to-[#f8b030] shadow-[0_0_45px_18px_rgba(248,176,48,0.65)]" />

          {/* Glowing Crescent Moon */}
          <div className="moon-body absolute size-11 rounded-full shadow-[0_0_28px_10px_rgba(224,231,255,0.55)]">
            <div className="size-full rounded-full bg-[#f8fafc] shadow-inner" />
            <div className="absolute -top-1 -right-1 size-9 rounded-full bg-[#050b18]" />
          </div>
        </div>

        {/* Distant Parallax City Skyline Silhouette */}
        <div className="absolute inset-x-0 bottom-16 h-28 pointer-events-none opacity-40">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-full fill-current text-[#09152b]">
            <path d="M0 120 V85 H30 V65 H45 V85 H80 V45 H110 V85 H135 V75 H170 V85 H210 V55 H225 V35 H235 V55 H260 V85 H320 V60 H345 V85 H400 V40 H420 V30 H430 V40 H450 V85 H510 V70 H540 V85 H600 V50 H625 V35 H635 V50 H660 V85 H720 V65 H750 V85 H810 V45 H835 V20 H845 V45 H870 V85 H930 V70 H960 V85 H1020 V50 H1040 V30 H1050 V50 H1070 V85 H1130 V65 H1160 V85 H1220 V45 H1250 V85 H1300 V70 H1330 V85 H1440 V120 Z" />
          </svg>
        </div>

        {/* ---------------- Main Road & Realistic Vehicles SVG ---------------- */}
        <svg
          viewBox="0 0 1440 300"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMax slice"
        >
          <defs>
            {/* Van Body Paint Gradient */}
            <linearGradient id="realVanPaint" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff851a" />
              <stop offset="60%" stopColor="#f57a10" />
              <stop offset="100%" stopColor="#d96504" />
            </linearGradient>

            {/* Van White Cab Gradient */}
            <linearGradient id="realCabPaint" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            {/* Windshield Reflection */}
            <linearGradient id="glassReflection" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
              <stop offset="45%" stopColor="#0284c7" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.85" />
            </linearGradient>

            {/* Chrome / Silver Alloy Wheel Gradient */}
            <linearGradient id="alloyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Headlight Beam Cone */}
            <linearGradient id="headlightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#fef08a" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
            </linearGradient>

            {/* Brake Disc Pattern */}
            <radialGradient id="brakeRotor">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="70%" stopColor="#cbd5e1" />
              <stop offset="85%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </radialGradient>
          </defs>

          {/* ---------------- ROAD STRUCTURE ---------------- */}
          {/* Asphalt Surface */}
          <rect x="0" y="215" width="1440" height="85" fill="#181d27" />

          {/* Road Shoulder / Barrier with Morning Rider Brand Colors */}
          <rect x="0" y="215" width="1440" height="6" fill="#f57a10" />
          <rect x="0" y="221" width="1440" height="3" fill="#f8b030" />

          {/* Road White Shoulder Line */}
          <line x1="0" y1="230" x2="1440" y2="230" stroke="#f1f5f9" strokeWidth="2.5" opacity="0.9" />

          {/* Rapid Moving Dashed Road Center Line */}
          <g className="road-dashes">
            {Array.from({ length: 30 }).map((_, i) => (
              <g key={i} transform={`translate(${-60 + i * 60}, 260)`}>
                <rect x="0" y="0" width="36" height="6" rx="3" fill="#fef08a" opacity="0.95" />
                <rect x="2" y="1" width="32" height="2" rx="1" fill="#ffffff" opacity="0.8" />
              </g>
            ))}
          </g>

          {/* Lower Road Edge */}
          <line x1="0" y1="290" x2="1440" y2="290" stroke="#0f172a" strokeWidth="2" />

          {/* High-speed wind streaks */}
          <g className="speed-streaks" stroke="#fef08a" strokeLinecap="round" opacity="0.5">
            <line x1="1400" y1="185" x2="1490" y2="185" strokeWidth="2" className="streak-1" />
            <line x1="1100" y1="155" x2="1200" y2="155" strokeWidth="2.5" className="streak-2" />
            <line x1="850" y1="175" x2="940" y2="175" strokeWidth="1.5" className="streak-3" />
            <line x1="550" y1="195" x2="640" y2="195" strokeWidth="2" className="streak-1" />
            <line x1="250" y1="165" x2="350" y2="165" strokeWidth="2.5" className="streak-2" />
          </g>

          {/* =========================================================================
              VEHICLE 1: REALISTIC MORNING RIDER COMMERCIAL TRANSIT VAN
              Position: x=140, y=95
              ========================================================================= */}
          <g transform="translate(140, 95)" className="van-container">
            {/* Tire Ground Contact Shadow */}
            <ellipse cx="145" cy="132" rx="150" ry="7" fill="#050a14" opacity="0.85" />

            {/* Headlight Beam Piercing Forward */}
            <polygon
              points="285,86 560,50 560,140 285,108"
              fill="url(#headlightBeam)"
              className="headlight-beam"
            />

            {/* Van Undercarriage Chassis & Mudflaps */}
            <rect x="20" y="112" width="250" height="12" rx="4" fill="#0f172a" />
            {/* Rear Mudflap */}
            <rect x="24" y="118" width="6" height="15" rx="2" fill="#1e293b" />
            <rect x="25" y="129" width="4" height="3" fill="#ffffff" />
            {/* Front Mudflap */}
            <rect x="206" y="118" width="5" height="12" rx="2" fill="#1e293b" />

            {/* ---------------- Van Main Box (Morning Rider Livery) ---------------- */}
            {/* Box Body */}
            <rect
              x="18"
              y="10"
              width="196"
              height="105"
              rx="6"
              fill="url(#realVanPaint)"
              stroke="#b45309"
              strokeWidth="2"
            />

            {/* Roof Aerodynamic Front Deflector */}
            <path
              d="M185 10 L235 48 H214 V10 Z"
              fill="#ea580c"
              stroke="#b45309"
              strokeWidth="1.5"
            />

            {/* Commercial Panel Rib Lines */}
            <line x1="68" y1="12" x2="68" y2="114" stroke="#d96504" strokeWidth="1.5" />
            <line x1="118" y1="12" x2="118" y2="114" stroke="#d96504" strokeWidth="1.5" />
            <line x1="168" y1="12" x2="168" y2="114" stroke="#d96504" strokeWidth="1.5" />

            {/* Navy Bottom Protection Band */}
            <rect x="18" y="96" width="196" height="18" rx="2" fill="#0b1b38" />
            {/* Reflective Yellow Safety Stripe */}
            <rect x="18" y="93" width="196" height="3" fill="#fef08a" />

            {/* Rear Door Outline & Hinges */}
            <rect x="18" y="14" width="4" height="98" fill="#c2410c" />
            <rect x="16" y="24" width="6" height="6" rx="1" fill="#1e293b" />
            <rect x="16" y="60" width="6" height="6" rx="1" fill="#1e293b" />
            <rect x="16" y="96" width="6" height="6" rx="1" fill="#1e293b" />
            {/* Rear Taillight Cluster */}
            <rect x="18" y="70" width="3" height="20" rx="1.5" fill="#ef4444" />
            <rect x="18" y="77" width="3" height="6" fill="#f8b030" />

            {/* ---------------- Van Branding (Crisp & High-End) ---------------- */}
            <g transform="translate(32, 28)">
              {/* Morning Rider Official Kite Emblem */}
              <g transform="scale(0.048) translate(-303, -831)">
                <path
                  d="M640.36,856.8v170.38c0,4.02-5.75,4.71-6.69.8-9.97-41.71-30.1-79.47-57.65-110.5-1.2-1.35-1.15-3.38.12-4.66l58.42-58.42c2.14-2.14,5.8-.62,5.8,2.4Z"
                  fill="#ffffff"
                />
                <path
                  d="M617.45,837.29l-58.43,58.42c-1.27,1.27-3.31,1.32-4.66.12-31.03-27.55-68.79-47.69-110.5-57.65-3.91-.93-3.23-6.69.8-6.69h170.39c3.03,0,4.54,3.66,2.4,5.8Z"
                  fill="#f8b030"
                />
                <path
                  d="M537.08,917.65l-147.3,147.3c-2.14,2.14-5.8.62-5.8-2.4v-203.78c0-1.89,1.55-3.44,3.44-3.41,57.22.83,109.43,22.32,149.52,57.34,1.48,1.29,1.54,3.58.15,4.96Z"
                  fill="#ffffff"
                />
                <path
                  d="M613.1,1087.86h-203.8c-3.03,0-4.54-3.66-2.4-5.8l147.3-147.3c1.39-1.39,3.67-1.33,4.96.15,35.02,40.09,56.52,92.29,57.35,149.52.03,1.89-1.52,3.44-3.41,3.44Z"
                  fill="#f8b030"
                />
                <path
                  d="M383.97,1091.26v73.85c0,3.03-3.66,4.54-5.8,2.4l-28.36-28.36-45.49-45.49c-2.14-2.14-.62-5.8,2.4-5.8h73.85c1.88,0,3.4,1.52,3.4,3.4Z"
                  fill="#ffffff"
                />
              </g>

              {/* Bold Typography */}
              <text
                x="34"
                y="22"
                fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
                fontSize="18"
                fontWeight="900"
                fontStyle="italic"
                fill="#ffffff"
                letterSpacing="-0.5"
              >
                MORNING <tspan fill="#f8b030">RIDER</tspan>
              </text>
              <text
                x="35"
                y="36"
                fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
                fontSize="8.5"
                fontWeight="800"
                fill="#fed7aa"
                letterSpacing="1"
              >
                EXPRESS COURIER SERVICE
              </text>
              {/* Delivery Helpline Badge */}
              <rect x="35" y="42" width="112" height="13" rx="3" fill="#0b1b38" />
              <text
                x="40"
                y="52"
                fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
                fontSize="7.5"
                fontWeight="700"
                fill="#f8b030"
              >
                ● 24/7 ON-TIME DELIVERY
              </text>
            </g>

            {/* ---------------- Van Cab Section (Realistic Aerodynamic Cab) ---------------- */}
            {/* Cab Main Body */}
            <path
              d="M214 48 H254 L288 78 V114 H214 Z"
              fill="url(#realCabPaint)"
              stroke="#94a3b8"
              strokeWidth="2"
            />
            {/* Front Bumper with Fog Lamps */}
            <path d="M268 106 H292 V118 H268 Z" fill="#1e293b" />
            <circle cx="282" cy="112" r="3" fill="#fef08a" />

            {/* Windshield & Side Window Glass */}
            <path
              d="M218 54 H250 L278 78 H218 Z"
              fill="url(#glassReflection)"
              stroke="#0f172a"
              strokeWidth="1.5"
            />

            {/* Realistic Driver Silhouette Inside Cab */}
            <g transform="translate(230, 58)">
              {/* Delivery Cap */}
              <path d="M4 10 C4 5 16 5 18 10 Z" fill="#f57a10" />
              <rect x="14" y="9" width="7" height="2" rx="1" fill="#f8b030" />
              {/* Head */}
              <circle cx="11" cy="12" r="6" fill="#1e293b" />
              {/* Shoulders & Jacket */}
              <path d="M0 24 C0 18 20 18 22 24 Z" fill="#0b1b38" />
              {/* Steering Wheel */}
              <ellipse cx="26" cy="22" rx="4" ry="7" fill="none" stroke="#0f172a" strokeWidth="2.5" />
            </g>

            {/* A-Pillar & Window Divider */}
            <line x1="250" y1="54" x2="250" y2="78" stroke="#0f172a" strokeWidth="2.5" />

            {/* Side Rear-View Mirror */}
            <path d="M256 68 H263 V76 H256 Z" fill="#0f172a" rx="1" />
            <rect x="257" y="69" width="5" height="6" fill="#38bdf8" opacity="0.8" />

            {/* Door Handle */}
            <rect x="226" y="84" width="10" height="3" rx="1.5" fill="#475569" />

            {/* Realistic Headlight Assembly */}
            <path d="M280 82 H290 V96 H280 Z" fill="#1e293b" rx="2" />
            {/* LED Projector Lens */}
            <circle cx="285" cy="87" r="4" fill="#ffffff" stroke="#fef08a" strokeWidth="1.5" />
            {/* Turn Signal Indicator */}
            <rect x="281" y="92" width="7" height="3" rx="1" fill="#f59e0b" />

            {/* Front Radiator Grille */}
            <rect x="288" y="94" width="3" height="12" fill="#0f172a" />

            {/* Wheel Arch Recesses (Clear cutouts for visible wheels) */}
            <path d="M40 114 A 32 32 0 0 1 104 114 Z" fill="#0b101d" />
            <path d="M208 114 A 32 32 0 0 1 272 114 Z" fill="#0b101d" />

            {/* Dynamic Horn Shockwave Rings Blast from Radiator Grille */}
            {isHonking && (
              <g transform="translate(294, 94)" className="van-horn-burst">
                <path d="M 6 -14 A 20 20 0 0 1 6 14" stroke="#fef08a" strokeWidth="3" fill="none" opacity="0.95" strokeLinecap="round" />
                <path d="M 16 -24 A 34 34 0 0 1 16 24" stroke="#f8b030" strokeWidth="3.5" fill="none" opacity="0.9" strokeLinecap="round" />
                <path d="M 28 -36 A 50 50 0 0 1 28 36" stroke="#f57a10" strokeWidth="4" fill="none" opacity="0.85" strokeLinecap="round" />
                <text x="36" y="-12" fontSize="12" fontWeight="900" fill="#fef08a" fontFamily="sans-serif">HONK!</text>
                <text x="44" y="18" fontSize="14" fontWeight="900" fill="#f8b030" fontFamily="sans-serif">HONK!</text>
              </g>
            )}

            {/* ---------------- PROMINENT, HIGH-VISIBILITY ROTATING WHEELS ---------------- */}
            {/* REAR WHEEL (Center at x=72, y=114, Radius=28px) */}
            <g transform="translate(72, 114)">
              {/* Black Rubber Tire with Tread Grip */}
              <circle cx="0" cy="0" r="28" fill="#0a0f1d" stroke="#1e293b" strokeWidth="2" />
              <circle cx="0" cy="0" r="24" fill="#182030" />
              {/* Outer Rim Wall in Silver */}
              <circle cx="0" cy="0" r="20" fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
              {/* Slotted Brake Rotor Disc */}
              <circle cx="0" cy="0" r="15" fill="url(#brakeRotor)" stroke="#94a3b8" strokeWidth="0.8" />
              {/* Red Brembo-style Brake Caliper */}
              <path d="M-8 -15 A 15 15 0 0 1 8 -15 L6 -10 A 10 10 0 0 0 -6 -10 Z" fill="#ef4444" />

              {/* 5-SPOKE HIGH-CONTRAST ALLOY WHEEL (Spins continuously around 0,0) */}
              <g className="van-wheel-rotate">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 0 0"
                  to="360 0 0"
                  dur="0.45s"
                  repeatCount="indefinite"
                />
                {/* 5 Distinct Silver Alloy Spokes */}
                <line x1="0" y1="0" x2="0" y2="-19" stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="0" y1="0" x2="18" y2="-6" stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="0" y1="0" x2="11" y2="15" stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="0" y1="0" x2="-11" y2="15" stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="0" y1="0" x2="-18" y2="-6" stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />

                {/* Inner Spoke Highlight Grooves */}
                <line x1="0" y1="-2" x2="0" y2="-17" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="2" y1="-1" x2="16" y2="-5" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="1" y1="2" x2="10" y2="14" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="-1" y1="2" x2="-10" y2="14" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="-2" y1="-1" x2="-16" y2="-5" stroke="#38bdf8" strokeWidth="1.5" />

                {/* High-visibility Rim Valve & Gold Trim Mark */}
                <circle cx="14" cy="-14" r="2.5" fill="#f8b030" />
                {/* Center Hub & Lug Nuts */}
                <circle cx="0" cy="0" r="7" fill="#0f172a" stroke="#f8fafc" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="3.5" fill="#f57a10" />
              </g>
            </g>

            {/* FRONT WHEEL (Center at x=240, y=114, Radius=28px) */}
            <g transform="translate(240, 114)">
              {/* Black Rubber Tire with Tread Grip */}
              <circle cx="0" cy="0" r="28" fill="#0a0f1d" stroke="#1e293b" strokeWidth="2" />
              <circle cx="0" cy="0" r="24" fill="#182030" />
              {/* Outer Rim Wall in Silver */}
              <circle cx="0" cy="0" r="20" fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
              {/* Slotted Brake Rotor Disc */}
              <circle cx="0" cy="0" r="15" fill="url(#brakeRotor)" stroke="#94a3b8" strokeWidth="0.8" />
              {/* Red Brembo-style Brake Caliper */}
              <path d="M-8 -15 A 15 15 0 0 1 8 -15 L6 -10 A 10 10 0 0 0 -6 -10 Z" fill="#ef4444" />

              {/* 5-SPOKE HIGH-CONTRAST ALLOY WHEEL (Spins continuously around 0,0) */}
              <g className="van-wheel-rotate">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 0 0"
                  to="360 0 0"
                  dur="0.45s"
                  repeatCount="indefinite"
                />
                {/* 5 Distinct Silver Alloy Spokes */}
                <line x1="0" y1="0" x2="0" y2="-19" stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="0" y1="0" x2="18" y2="-6" stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="0" y1="0" x2="11" y2="15" stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="0" y1="0" x2="-11" y2="15" stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="0" y1="0" x2="-18" y2="-6" stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />

                {/* Inner Spoke Highlight Grooves */}
                <line x1="0" y1="-2" x2="0" y2="-17" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="2" y1="-1" x2="16" y2="-5" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="1" y1="2" x2="10" y2="14" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="-1" y1="2" x2="-10" y2="14" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="-2" y1="-1" x2="-16" y2="-5" stroke="#38bdf8" strokeWidth="1.5" />

                {/* High-visibility Rim Valve & Gold Trim Mark */}
                <circle cx="14" cy="-14" r="2.5" fill="#f8b030" />
                {/* Center Hub & Lug Nuts */}
                <circle cx="0" cy="0" r="7" fill="#0f172a" stroke="#f8fafc" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="3.5" fill="#f57a10" />
              </g>
            </g>
          </g>

          {/* =========================================================================
              INTERACTIVE COURIER RUNNER (TOUCH / CLICK TO HONK & SCARE!)
              When touched: sprints forward in terror thinking the truck hit him,
              then gradually decelerates and returns to his position!
              ========================================================================= */}
          {/* =========================================================================
              INTERACTIVE COURIER RUNNER (LOOKS FORWARD, RUNS FORWARD, REALISTIC ANATOMY)
              Clicking anywhere on the road band sounds the vehicle horn and triggers
              a panic turbo-sprint forward, then smoothly eases back!
              ========================================================================= */}
          <g
            transform={`translate(${isPanicking ? 750 : 570}, 168)`}
            style={{
              transition: isPanicking
                ? "transform 0.65s cubic-bezier(0.12, 0.95, 0.2, 1)"
                : "transform 2.8s cubic-bezier(0.25, 1, 0.5, 1)",
            }}
            className="select-none"
          >
            {/* Ground Contact Shadow */}
            <ellipse cx="10" cy="52" rx="24" ry="4.5" fill="#050a14" opacity="0.75" className="runner-ground-shadow" />

            {/* Foot Skid Dust Behind Back Shoe */}
            <g className="runner-skid-dust">
              <ellipse cx="-18" cy="48" rx="6" ry="3.5" fill="#94a3b8" opacity="0.6" />
              <ellipse cx="-28" cy="50" rx="4" ry="2.5" fill="#cbd5e1" opacity="0.4" />
            </g>

            {/* Shock & Horn Burst When Startled by Vehicle Horn */}
            {isPanicking && (
              <g transform="translate(10, -96)" className="animate-bounce">
                <polygon points="0,0 74,0 74,22 24,22 16,30 18,22 0,22" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                <text x="37" y="15" fontSize="10" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="sans-serif">
                  HONK!! 😱💨
                </text>
              </g>
            )}

            {/* ---------------- SPRINTING RUNNER GROUP (BOUNCES WITH STRIDE) ---------------- */}
            <g className={isPanicking ? "real-runner-turbo" : "real-runner-group"}>
              {/* ---------------- CONNECTED BIOMECHANICAL LEGS ---------------- */}
              {/* BACK (LEFT) LEG - Anchored at Hip (0, 0), Alternating Gait */}
              <g className={`runner-leg-left ${isPanicking ? "turbo-left-leg" : ""}`}>
                {/* Left Thigh Muscle */}
                <path d="M-4 0 C-8 8 -6 18 -1 24 C2 26 7 24 5 18 C4 10 2 2 -4 0 Z" fill="#0b1b38" />
                {/* Left Shin & Calf Muscle */}
                <path d="M-1 24 C-4 32 -3 40 0 46 L3 46 C5 40 4 32 3 24 Z" fill="#0f172a" />
                {/* Left Running Sneaker (Facing Forward Right!) */}
                <polygon points="-4,46 16,46 17,49 -5,49" fill="#ffffff" />
                <rect x="-5" y="49" width="22" height="1.5" fill="#0f172a" rx="0.5" />
                <path d="M-3 46 L-1 42 L10 42 L15 46 Z" fill="#f57a10" />
                <line x1="3" y1="43" x2="8" y2="45" stroke="#ffffff" strokeWidth="1" />
              </g>

              {/* FRONT (RIGHT) LEG - Anchored at Hip (0, 0), Delayed Phase */}
              <g className={`runner-leg-right ${isPanicking ? "turbo-right-leg" : ""}`}>
                {/* Right Thigh Muscle */}
                <path d="M-2 0 C-6 8 -4 18 2 24 C5 26 9 24 8 18 C6 10 4 2 -2 0 Z" fill="#0b1b38" />
                {/* Reflective Athletic Piping on Thigh */}
                <path d="M-4 6 C-5 14 -3 20 1 24" stroke="#f1f5f9" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.85" />
                {/* Right Shin & Calf Muscle */}
                <path d="M2 24 C-1 32 0 40 3 46 L6 46 C8 40 7 32 6 24 Z" fill="#0f172a" />
                {/* Right Running Sneaker (Facing Forward Right!) */}
                <polygon points="-1,46 19,46 20,49 -2,49" fill="#ffffff" />
                <rect x="-2" y="49" width="22" height="1.5" fill="#0f172a" rx="0.5" />
                <path d="M0 46 L2 42 L13 42 L18 46 Z" fill="#f57a10" />
                <line x1="6" y1="43" x2="11" y2="45" stroke="#ffffff" strokeWidth="1" />
              </g>

              {/* ---------------- UPPER BODY & TORSO (FORWARD LEAN) ---------------- */}
              {/* Pelvis & Running Shorts */}
              <path d="M-8 0 C-9 -4 8 -4 11 0 L7 10 H-6 Z" fill="#0b1b38" stroke="#060e1d" strokeWidth="1" />
              <line x1="8" y1="0" x2="6" y2="10" stroke="#f1f5f9" strokeWidth="1.2" />

              {/* Muscular Athletic Torso (Leaning Forward ~15° Towards Right) */}
              <path
                d="M-6 0 C-7 -10 -2 -22 10 -28 L19 -24 C14 -8 6 4 -6 0 Z"
                fill="#f57a10"
                stroke="#ea580c"
                strokeWidth="1.2"
              />
              {/* Breathable Dark Navy Side Mesh Panel */}
              <path d="M-3 -2 C-4 -8 0 -16 8 -22 L6 -18 C1 -10 -2 -4 -3 -2 Z" fill="#0b1b38" opacity="0.85" />
              {/* Reflective White Chest Piping */}
              <line x1="2" y1="-14" x2="16" y2="-12" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
              {/* Morning Rider Emblem on Chest */}
              <circle cx="12" cy="-18" r="3.5" fill="#ffffff" />
              <polygon points="12,-20 14,-17 12,-16 10,-17" fill="#f57a10" />

              {/* Muscular Left Arm Supporting Delivery Box */}
              <path d="M3 -22 C-1 -30 2 -40 8 -48" stroke="#ea580c" strokeWidth="5" strokeLinecap="round" fill="none" />
              <path d="M8 -48 L10 -52" stroke="#fed7aa" strokeWidth="4.5" strokeLinecap="round" fill="none" />
              <circle cx="10" cy="-52" r="2.5" fill="#fed7aa" />

              {/* Muscular Right Arm Supporting Delivery Box */}
              <path d="M14 -22 C12 -30 16 -40 20 -48" stroke="#ea580c" strokeWidth="5" strokeLinecap="round" fill="none" />
              <path d="M20 -48 L22 -52" stroke="#fed7aa" strokeWidth="4.5" strokeLinecap="round" fill="none" />
              <circle cx="22" cy="-52" r="2.5" fill="#fed7aa" />

              {/* ---------------- 3D COURIER CARDBOARD CARTON ON HEAD / HANDS ---------------- */}
              <g transform="translate(15, -66)">
                {/* Front Face */}
                <rect x="-18" y="-12" width="36" height="26" rx="2" fill="#d97706" stroke="#92400e" strokeWidth="1.5" />
                {/* 3D Top Depth Face */}
                <polygon points="-18,-12 -12,-18 28,-18 22,-12" fill="#f59e0b" stroke="#92400e" strokeWidth="1" />
                {/* 3D Right Depth Face */}
                <polygon points="18,-12 24,-18 24,8 18,14" fill="#b45309" stroke="#92400e" strokeWidth="1" />

                {/* Morning Rider Branded Orange Packing Tape */}
                <rect x="-18" y="-2" width="36" height="6" fill="#f57a10" />
                <rect x="-2" y="-12" width="6" height="26" fill="#ea580c" />

                {/* Shipping Label with Barcode */}
                <rect x="-14" y="4" width="15" height="7" rx="1" fill="#ffffff" />
                <line x1="-12" y1="6" x2="-2" y2="6" stroke="#0f172a" strokeWidth="1.2" strokeDasharray="1.5 1" />
                <line x1="-12" y1="8.5" x2="-4" y2="8.5" stroke="#0f172a" strokeWidth="0.8" />
                {/* Red Express Sticker */}
                <rect x="8" y="5" width="8" height="5.5" rx="1" fill="#ef4444" />
                <text x="9" y="9" fontSize="3.5" fontWeight="900" fill="#ffffff" fontFamily="sans-serif">EXP</text>
              </g>

              {/* ---------------- REALISTIC HEAD LOOKING FORWARD (RIGHT) ---------------- */}
              <g transform="translate(12, -32)">
                {/* Neck */}
                <path d="M-2 4 L2 10 L8 8 L4 2 Z" fill="#fed7aa" />
                {/* Human Head Silhouette Facing Right */}
                <path d="M-4 2 C-8 0 -8 -10 -3 -14 C4 -18 10 -14 12 -8 C12 -2 8 4 0 4 Z" fill="#fed7aa" stroke="#ea580c" strokeWidth="1" />
                {/* Short Athletic Hair */}
                <path d="M-5 -6 C-9 -12 2 -18 9 -12 C6 -8 -1 -8 -5 -6 Z" fill="#0f172a" />

                {/* Morning Rider Delivery Cap with Forward Visor */}
                <path d="M-4 -8 C-2 -16 10 -16 12 -8 Z" fill="#0b1b38" stroke="#1e293b" strokeWidth="0.8" />
                {/* Cap Visor Pointing Forward Right */}
                <polygon points="8,-9 18,-7 17,-4 7,-6" fill="#f57a10" stroke="#b45309" strokeWidth="0.8" />

                {/* Forward Looking Human Eye */}
                <path d="M6 -7.5 L11 -7" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" />
                <ellipse cx="8.5" cy="-5" rx="2.8" ry="1.7" fill="#ffffff" stroke="#0f172a" strokeWidth="0.6" />
                <circle cx="9.8" cy="-5" r="1.1" fill="#0f172a" />

                {/* Nose Profile Pointing Forward Right */}
                <path d="M10 -6 L13 -3 L10 -1.5" stroke="#ea580c" strokeWidth="1" strokeLinecap="round" fill="none" />
                {/* Exhaling Mouth Facing Right */}
                <path d="M8 0 Q10.5 0 9 1.5 Z" fill="#881337" stroke="#0f172a" strokeWidth="0.6" />
                {/* Chin & Jawline */}
                <path d="M10 2 L5 3 L-1 1" stroke="#ea580c" strokeWidth="0.8" fill="none" />

                {/* Aerodynamic Sweat Droplet Flying Backward */}
                <path
                  d="M-6 -6 C-10 -6 -12 -3 -8 -1 C-6 -3 -4 -6 -6 -6 Z"
                  fill="#38bdf8"
                  opacity="0.9"
                  className={isPanicking ? "runner-sweat-stream turbo-sweat" : "runner-sweat-stream"}
                />
              </g>
            </g>
          </g>

          {/* =========================================================================
              VEHICLE 2: REALISTIC MORNING RIDER SPORT MOTORCYCLE & RIDER
              Position: x=880, y=90
              ========================================================================= */}
          <g transform="translate(880, 90)" className="bike-container">
            {/* Ground Contact Shadow */}
            <ellipse cx="110" cy="136" rx="115" ry="6" fill="#050a14" opacity="0.85" />

            {/* Motorcycle Headlight Beam Piercing Forward */}
            <polygon
              points="180,82 480,45 480,140 180,105"
              fill="url(#headlightBeam)"
              className="headlight-beam"
            />

            {/* Speed Wind Streaks Behind Rider */}
            <g stroke="#f8b030" strokeWidth="2" strokeLinecap="round" opacity="0.8" className="rider-wind-trails">
              <line x1="-35" y1="35" x2="-5" y2="35" />
              <line x1="-55" y1="60" x2="-15" y2="60" />
              <line x1="-40" y1="85" x2="-10" y2="85" />
            </g>

            {/* ---------------- Heavy-Duty Oxford Thermal Delivery Box ---------------- */}
            <g transform="translate(20, 42)">
              {/* Outer Backpack / Cargo Box */}
              <rect
                x="0"
                y="0"
                width="56"
                height="52"
                rx="7"
                fill="#f57a10"
                stroke="#c2410c"
                strokeWidth="2.5"
              />
              {/* Heavy-duty Top Flap & Webbing */}
              <rect x="0" y="0" width="56" height="12" rx="4" fill="#ea580c" />
              <line x1="0" y1="12" x2="56" y2="12" stroke="#9a3412" strokeWidth="1.5" />

              {/* High-Visibility 3M Reflective Safety Band */}
              <rect x="4" y="24" width="48" height="6" rx="2" fill="#fef08a" />
              <rect x="6" y="26" width="44" height="2" fill="#ffffff" />

              {/* Side Zipper Pocket */}
              <rect x="6" y="34" width="44" height="12" rx="3" fill="#ea580c" stroke="#c2410c" strokeWidth="1" />
              <line x1="10" y1="40" x2="46" y2="40" stroke="#fef08a" strokeWidth="1.5" strokeDasharray="3 2" />

              {/* Official Kite Icon on Box */}
              <g transform="translate(18, 14) scale(0.028) translate(-303, -831)">
                <path
                  d="M640.36,856.8v170.38c0,4.02-5.75,4.71-6.69.8-9.97-41.71-30.1-79.47-57.65-110.5-1.2-1.35-1.15-3.38.12-4.66l58.42-58.42c2.14-2.14,5.8-.62,5.8,2.4Z"
                  fill="#ffffff"
                />
                <path
                  d="M617.45,837.29l-58.43,58.42c-1.27,1.27-3.31,1.32-4.66.12-31.03-27.55-68.79-47.69-110.5-57.65-3.91-.93-3.23-6.69.8-6.69h170.39c3.03,0,4.54,3.66,2.4,5.8Z"
                  fill="#f8b030"
                />
                <path
                  d="M537.08,917.65l-147.3,147.3c-2.14,2.14-5.8.62-5.8-2.4v-203.78c0-1.89,1.55-3.44,3.44-3.41,57.22.83,109.43,22.32,149.52,57.34,1.48,1.29,1.54,3.58.15,4.96Z"
                  fill="#ffffff"
                />
                <path
                  d="M613.1,1087.86h-203.8c-3.03,0-4.54-3.66-2.4-5.8l147.3-147.3c1.39-1.39,3.67-1.33,4.96.15,35.02,40.09,56.52,92.29,57.35,149.52.03,1.89-1.52,3.44-3.41,3.44Z"
                  fill="#f8b030"
                />
              </g>

              {/* Chrome Luggage Carrier Rack Brackets */}
              <line x1="8" y1="52" x2="8" y2="68" stroke="#94a3b8" strokeWidth="3" />
              <line x1="48" y1="52" x2="48" y2="68" stroke="#94a3b8" strokeWidth="3" />
            </g>

            {/* ---------------- Motorcycle Chassis, Engine, Exhaust ---------------- */}
            {/* Stainless Steel Upswept Exhaust Pipe */}
            <path
              d="M85 106 C100 114 116 114 135 100 L152 90"
              stroke="#cbd5e1"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            {/* Carbon-fiber Muffler Canister */}
            <path
              d="M125 104 L156 90"
              stroke="#0f172a"
              strokeWidth="11"
              strokeLinecap="round"
              fill="none"
            />
            {/* Muffler Chrome Tip */}
            <circle cx="156" cy="90" r="3.5" fill="#f8fafc" />

            {/* Rear Swingarm */}
            <line x1="40" y1="120" x2="95" y2="108" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />

            {/* Rear Monoshock Spring (Yellow Coils) */}
            <line x1="72" y1="94" x2="86" y2="108" stroke="#f8b030" strokeWidth="6" strokeLinecap="round" />

            {/* Trellis Frame (Dark Navy with Brand Orange Accents) */}
            <path
              d="M40 120 L82 92 L112 68 L168 84 L178 120"
              stroke="#0b1b38"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* Engine Block with Cooling Fins & Crankcase */}
            <rect x="80" y="88" width="36" height="26" rx="5" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            <line x1="84" y1="94" x2="112" y2="94" stroke="#475569" strokeWidth="1.5" />
            <line x1="84" y1="100" x2="112" y2="100" stroke="#475569" strokeWidth="1.5" />
            <line x1="84" y1="106" x2="112" y2="106" stroke="#475569" strokeWidth="1.5" />
            {/* Gold Stator Cap */}
            <circle cx="98" cy="102" r="6" fill="#f8b030" stroke="#d97706" strokeWidth="1.5" />

            {/* Sculpted Fuel Tank (Morning Rider Orange) */}
            <path
              d="M92 68 C102 54 136 56 148 70 C150 80 142 86 118 86 Z"
              fill="#f57a10"
              stroke="#ea580c"
              strokeWidth="2.5"
            />
            {/* Rubber Knee Grip Pad */}
            <path d="M110 70 C116 64 132 66 136 74 C134 78 126 80 112 78 Z" fill="#0b1b38" opacity="0.8" />

            {/* Front Inverted Telescopic Forks (Gold Stanchions) */}
            <line x1="150" y1="70" x2="180" y2="120" stroke="#f8b030" strokeWidth="5.5" strokeLinecap="round" />
            <line x1="155" y1="70" x2="185" y2="120" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />

            {/* Front Wheel Hugger Fender */}
            <path d="M162 102 A 26 26 0 0 1 198 108" fill="none" stroke="#f57a10" strokeWidth="4.5" strokeLinecap="round" />

            {/* Streetfighter Angular Headlight Cowl */}
            <polygon points="152,64 176,68 188,80 168,86 152,78" fill="#0b1b38" stroke="#1e293b" strokeWidth="1.5" />
            {/* Dual LED Projector Headlamp */}
            <polygon points="176,70 186,80 180,84 172,76" fill="#fef08a" />
            <circle cx="180" cy="78" r="3.5" fill="#ffffff" />

            {/* Clip-on Sport Handlebar */}
            <path d="M146 62 L158 66" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" />

            {/* ---------------- REALISTIC RIDER (DETAILED HUMAN ANATOMY) ---------------- */}
            {/* Rider Boots & Footrest Peg */}
            <rect x="98" y="112" width="18" height="8" rx="3" fill="#060f22" stroke="#1e293b" strokeWidth="1" />
            <rect x="95" y="115" width="4" height="4" fill="#94a3b8" /> {/* Peg */}

            {/* Rider Legs: Tucked bent knee into tank */}
            <path
              d="M86 82 L112 96 L104 116"
              stroke="#0b1b38"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Knee Armor Slider */}
            <ellipse cx="112" cy="96" rx="4" ry="6" fill="#1e293b" stroke="#f8b030" strokeWidth="1.5" />

            {/* Rider Torso Leaned Forward 45° Aggressive Aero Posture */}
            <path
              d="M74 74 C74 58 92 44 114 38 L136 56 C120 70 102 82 74 74 Z"
              fill="#f57a10"
              stroke="#c2410c"
              strokeWidth="2.5"
            />
            {/* Jacket Spine Shield & Shoulder Armor */}
            <path d="M80 68 C88 56 104 46 120 44" stroke="#0b1b38" strokeWidth="6.5" strokeLinecap="round" fill="none" />
            {/* High-Vis Reflective Stripe on Jacket Back */}
            <path d="M86 62 C94 52 108 44 118 42" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" fill="none" />

            {/* Rider Arm Reaching Forward to Handlebar Grip */}
            <path
              d="M112 46 L136 56 L152 65"
              stroke="#f57a10"
              strokeWidth="8.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Elbow Armor Pad */}
            <circle cx="136" cy="56" r="4" fill="#0b1b38" />
            {/* Leather Glove Gripping Throttle */}
            <circle cx="152" cy="65" r="5" fill="#060f22" stroke="#475569" strokeWidth="1" />

            {/* Full-Face Motorcycle Helmet (Realistic Aerodynamic Shape) */}
            <g transform="translate(130, 28)">
              {/* Main Helmet Shell */}
              <ellipse cx="0" cy="0" rx="16" ry="14" fill="#0b1b38" stroke="#1e293b" strokeWidth="1.5" />
              {/* Helmet Chin Guard */}
              <path d="M-8 4 C-4 14 8 14 14 6 C12 -2 6 -6 -2 -6 Z" fill="#060f22" />
              {/* Top Air Vent */}
              <path d="M-10 -10 L-2 -12 L4 -10 Z" fill="#f57a10" />
              {/* Rear Aero Spoiler Wing */}
              <path d="M-14 -4 L-19 0 L-13 4 Z" fill="#f8b030" />

              {/* Iridescent Mirror Tinted Visor with Speed Glare */}
              <path
                d="M-2 -5 C10 -5 18 0 16 7 C8 8 -2 5 -2 -5 Z"
                fill="#38bdf8"
                stroke="#0284c7"
                strokeWidth="1.5"
                opacity="0.95"
              />
              {/* High-Speed Glare Stripe Across Visor */}
              <line x1="2" y1="-2" x2="13" y2="4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            </g>

            {/* ---------------- PROMINENT, HIGH-VISIBILITY ROTATING MOTORCYCLE WHEELS ---------------- */}
            {/* REAR MOTORCYCLE WHEEL (Center at x=40, y=120, Radius=28px) */}
            <g transform="translate(40, 120)">
              {/* Black Rubber Tire with Tread Pattern */}
              <circle cx="0" cy="0" r="28" fill="#0a0f1d" stroke="#1e293b" strokeWidth="2" />
              <circle cx="0" cy="0" r="23" fill="#182030" />
              {/* High-visibility Brand Orange Rim Tape Wall */}
              <circle cx="0" cy="0" r="20" fill="none" stroke="#f57a10" strokeWidth="2.5" />
              {/* Slotted Brake Rotor Disc */}
              <circle cx="0" cy="0" r="14" fill="url(#brakeRotor)" stroke="#94a3b8" strokeWidth="0.8" />
              {/* Gold Rear Brake Caliper */}
              <path d="M-7 -14 A 14 14 0 0 1 7 -14 L5 -9 A 9 9 0 0 0 -5 -9 Z" fill="#f8b030" />

              {/* 5-SPOKE HIGH-CONTRAST ALLOY WHEEL (Spins continuously around 0,0) */}
              <g className="bike-wheel-rotate">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 0 0"
                  to="360 0 0"
                  dur="0.45s"
                  repeatCount="indefinite"
                />
                {/* 5 Distinct Silver-White Alloy Spokes */}
                <line x1="0" y1="0" x2="0" y2="-19" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
                <line x1="0" y1="0" x2="18" y2="-6" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
                <line x1="0" y1="0" x2="11" y2="15" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
                <line x1="0" y1="0" x2="-11" y2="15" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
                <line x1="0" y1="0" x2="-18" y2="-6" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />

                {/* Inner Spoke Highlight Grooves */}
                <line x1="0" y1="-2" x2="0" y2="-17" stroke="#f8b030" strokeWidth="1.5" />
                <line x1="2" y1="-1" x2="16" y2="-5" stroke="#f8b030" strokeWidth="1.5" />
                <line x1="1" y1="2" x2="10" y2="14" stroke="#f8b030" strokeWidth="1.5" />
                <line x1="-1" y1="2" x2="-10" y2="14" stroke="#f8b030" strokeWidth="1.5" />
                <line x1="-2" y1="-1" x2="-16" y2="-5" stroke="#f8b030" strokeWidth="1.5" />

                {/* Center Hub Nut */}
                <circle cx="0" cy="0" r="6" fill="#0f172a" stroke="#f8fafc" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="3" fill="#f8b030" />
              </g>
            </g>

            {/* FRONT MOTORCYCLE WHEEL (Center at x=180, y=120, Radius=28px) */}
            <g transform="translate(180, 120)">
              {/* Black Rubber Tire with Tread Pattern */}
              <circle cx="0" cy="0" r="28" fill="#0a0f1d" stroke="#1e293b" strokeWidth="2" />
              <circle cx="0" cy="0" r="23" fill="#182030" />
              {/* High-visibility Brand Orange Rim Tape Wall */}
              <circle cx="0" cy="0" r="20" fill="none" stroke="#f57a10" strokeWidth="2.5" />
              {/* Slotted Brake Rotor Disc */}
              <circle cx="0" cy="0" r="14" fill="url(#brakeRotor)" stroke="#94a3b8" strokeWidth="0.8" />
              {/* Gold Front Brake Caliper */}
              <path d="M-7 -14 A 14 14 0 0 1 7 -14 L5 -9 A 9 9 0 0 0 -5 -9 Z" fill="#f8b030" />

              {/* 5-SPOKE HIGH-CONTRAST ALLOY WHEEL (Spins continuously around 0,0) */}
              <g className="bike-wheel-rotate">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 0 0"
                  to="360 0 0"
                  dur="0.45s"
                  repeatCount="indefinite"
                />
                {/* 5 Distinct Silver-White Alloy Spokes */}
                <line x1="0" y1="0" x2="0" y2="-19" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
                <line x1="0" y1="0" x2="18" y2="-6" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
                <line x1="0" y1="0" x2="11" y2="15" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
                <line x1="0" y1="0" x2="-11" y2="15" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
                <line x1="0" y1="0" x2="-18" y2="-6" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />

                {/* Inner Spoke Highlight Grooves */}
                <line x1="0" y1="-2" x2="0" y2="-17" stroke="#f8b030" strokeWidth="1.5" />
                <line x1="2" y1="-1" x2="16" y2="-5" stroke="#f8b030" strokeWidth="1.5" />
                <line x1="1" y1="2" x2="10" y2="14" stroke="#f8b030" strokeWidth="1.5" />
                <line x1="-1" y1="2" x2="-10" y2="14" stroke="#f8b030" strokeWidth="1.5" />
                <line x1="-2" y1="-1" x2="-16" y2="-5" stroke="#f8b030" strokeWidth="1.5" />

                {/* Center Hub Nut */}
                <circle cx="0" cy="0" r="6" fill="#0f172a" stroke="#f8fafc" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="3" fill="#f8b030" />
              </g>
            </g>
          </g>
        </svg>

        {/* Dynamic Day/Night Cycle Status Indicator */}
        <div className="absolute bottom-3 left-4 z-20 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 border border-white/10 text-[11px] text-white">
          <span className="size-2 rounded-full bg-[#f8b030] animate-pulse" />
          <span className="font-semibold tracking-wide text-white/90">
            {t("Day & Night Non-Stop Express Dispatch (6 AM – 12 AM)")}
          </span>
        </div>
      </div>

      {/* ---------------- CSS ENHANCEMENTS FOR 60FPS SMOOTHNESS ---------------- */}
      <style>{`
        /* 1. Sunrise / Dawn (0s -> 6s, 20s -> 24s) */
        .sky-sunrise {
          background: linear-gradient(180deg, #0b1b38 0%, #1e3a6d 40%, #ea580c 75%, #f8b030 100%);
          animation: fadeSunrise 24s infinite ease-in-out;
        }

        /* 2. Bright Day (5s -> 13s) */
        .sky-day {
          background: linear-gradient(180deg, #0284c7 0%, #38bdf8 50%, #93c5fd 80%, #fed7aa 100%);
          animation: fadeDay 24s infinite ease-in-out;
        }

        /* 3. Sunset / Dusk (12s -> 18s) */
        .sky-sunset {
          background: linear-gradient(180deg, #1e1b4b 0%, #4c1d95 35%, #be185d 70%, #f97316 100%);
          animation: fadeSunset 24s infinite ease-in-out;
        }

        /* 4. Deep Night (17s -> 23s) */
        .sky-night {
          background: linear-gradient(180deg, #020617 0%, #060f22 45%, #0b1b38 85%, #151d30 100%);
          animation: fadeNight 24s infinite ease-in-out;
        }

        @keyframes fadeSunrise {
          0%, 100% { opacity: 1; }
          22% { opacity: 0; }
          75% { opacity: 0; }
          90% { opacity: 0.8; }
        }

        @keyframes fadeDay {
          0%, 15% { opacity: 0; }
          25%, 45% { opacity: 1; }
          55% { opacity: 0; }
          100% { opacity: 0; }
        }

        @keyframes fadeSunset {
          0%, 45% { opacity: 0; }
          52%, 68% { opacity: 1; }
          75% { opacity: 0; }
          100% { opacity: 0; }
        }

        @keyframes fadeNight {
          0%, 65% { opacity: 0; }
          75%, 90% { opacity: 1; }
          98% { opacity: 0; }
          100% { opacity: 0; }
        }

        /* Sun & Moon Orbit */
        .sun-body {
          animation: sunArc 24s infinite ease-in-out;
        }
        @keyframes sunArc {
          0% { transform: translate(120px, 80px) scale(0.8); opacity: 0.8; }
          25% { transform: translate(680px, 5px) scale(1.1); opacity: 1; }
          50% { transform: translate(1250px, 80px) scale(0.9); opacity: 0.8; }
          52%, 100% { transform: translate(1400px, 140px) scale(0.5); opacity: 0; }
        }

        .moon-body {
          animation: moonArc 24s infinite ease-in-out;
        }
        @keyframes moonArc {
          0%, 50% { transform: translate(100px, 140px) scale(0.5); opacity: 0; }
          65% { transform: translate(350px, 60px) scale(0.9); opacity: 0.8; }
          75% { transform: translate(750px, 15px) scale(1); opacity: 1; }
          92% { transform: translate(1200px, 75px) scale(0.9); opacity: 0.8; }
          100% { transform: translate(1350px, 140px) scale(0.5); opacity: 0; }
        }

        /* Twinkling Stars */
        .star {
          position: absolute;
          border-radius: 9999px;
          background: #ffffff;
          animation: twinkle 2s infinite ease-in-out;
        }
        .star-1 { top: 20%; left: 14%; width: 3px; height: 3px; animation-delay: 0.2s; }
        .star-2 { top: 32%; left: 26%; width: 2px; height: 2px; animation-delay: 0.7s; }
        .star-3 { top: 18%; left: 42%; width: 3px; height: 3px; animation-delay: 1.1s; }
        .star-4 { top: 28%; left: 58%; width: 2px; height: 2px; animation-delay: 0.4s; }
        .star-5 { top: 15%; left: 74%; width: 3px; height: 3px; animation-delay: 1.5s; }
        .star-6 { top: 38%; left: 86%; width: 2px; height: 2px; animation-delay: 0.9s; }
        .star-7 { top: 22%; left: 92%; width: 2.5px; height: 2.5px; animation-delay: 0.3s; }
        .star-8 { top: 12%; left: 30%; width: 2px; height: 2px; animation-delay: 1.3s; }
        .star-9 { top: 42%; left: 50%; width: 3px; height: 3px; animation-delay: 0.6s; }
        .star-10 { top: 26%; left: 68%; width: 2px; height: 2px; animation-delay: 1.7s; }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }

        /* Fast Road Rolling (Road rushing backwards) */
        .road-dashes {
          animation: roadSprint 0.45s linear infinite;
        }
        @keyframes roadSprint {
          from { transform: translateX(0); }
          to { transform: translateX(-60px); }
        }

        /* Realistic Van Suspension Vibration / Road Bob */
        .van-container {
          animation: vanBobbing 0.35s ease-in-out infinite;
        }
        @keyframes vanBobbing {
          0%, 100% { transform: translate(140px, 95px); }
          50% { transform: translate(140px, 93.5px); }
        }

        /* Realistic Motorcycle High-Speed Suspension Rush & Engine Vibration */
        .bike-container {
          animation: bikeRushBobbing 0.26s ease-in-out infinite;
        }
        @keyframes bikeRushBobbing {
          0%, 100% { transform: translate(880px, 90px) rotate(0deg); }
          25% { transform: translate(880px, 88.5px) rotate(-0.35deg); }
          75% { transform: translate(880px, 91px) rotate(0.25deg); }
        }

        /* Speed Streaks */
        .streak-1 { animation: streakFast 0.55s linear infinite; }
        .streak-2 { animation: streakFast 0.42s linear infinite 0.12s; }
        .streak-3 { animation: streakFast 0.48s linear infinite 0.25s; }
        @keyframes streakFast {
          0% { transform: translateX(200px); opacity: 0; }
          20% { opacity: 0.85; }
          80% { opacity: 0.85; }
          100% { transform: translateX(-800px); opacity: 0; }
        }

        /* Headlights Beam Intensity */
        .headlight-beam {
          animation: beamGlow 24s infinite ease-in-out;
        }
        @keyframes beamGlow {
          0%, 20% { opacity: 0.55; }
          25%, 45% { opacity: 0.25; }
          50%, 65% { opacity: 0.7; }
          70%, 95% { opacity: 0.95; }
          100% { opacity: 0.55; }
        }

        /* =======================================================
           REALISTIC HUMAN SPRINT BIOMECHANICS & KINEMATICS
           ======================================================= */
        /* Normal Running Stride (0.52s Gait Cycle) */
        .real-runner-group {
          animation: realRunnerBounce 0.52s ease-in-out infinite;
        }

        /* Panic Turbo Sprint When Honked / Tapped (0.25s High-Adrenaline Cycle) */
        .real-runner-turbo {
          animation: realRunnerBounce 0.25s ease-in-out infinite;
        }

        /* Vertical Center-of-Mass Double Bounce (Flight & Stance) */
        @keyframes realRunnerBounce {
          0%, 100% {
            transform: translateY(0px);
          }
          20% {
            transform: translateY(4px);  /* Foot strike stance dip */
          }
          45% {
            transform: translateY(-7px); /* Airborne flight phase launch */
          }
          70% {
            transform: translateY(4px);  /* Second foot strike dip */
          }
          95% {
            transform: translateY(-7px); /* Second flight phase launch */
          }
        }

        /* Ground Contact Shadow (Squashes on contact, shrinks in flight) */
        .runner-ground-shadow {
          animation: shadowPulse 0.52s ease-in-out infinite;
        }
        @keyframes shadowPulse {
          0%, 50%, 100% { transform: scale(0.85); opacity: 0.55; }
          20%, 70% { transform: scale(1.15); opacity: 0.85; }
        }

        /* ---------------- RUNNER STRIDE BIOMECHANICS ---------------- */
        .runner-leg-left {
          transform-origin: 0px 4px;
          animation: runnerLeftStride 0.48s linear infinite;
        }
        .turbo-left-leg {
          animation: runnerLeftStride 0.22s linear infinite !important;
        }

        .runner-leg-right {
          transform-origin: 4px 4px;
          animation: runnerRightStride 0.48s linear infinite;
        }
        .turbo-right-leg {
          animation: runnerRightStride 0.22s linear infinite !important;
        }

        /* Forward-running left leg gait cycle */
        @keyframes runnerLeftStride {
          0% {
            transform: rotate(-30deg);
          }
          25% {
            transform: rotate(2deg);
          }
          50% {
            transform: rotate(34deg);
          }
          75% {
            transform: rotate(8deg);
          }
          100% {
            transform: rotate(-30deg);
          }
        }

        /* Forward-running right leg gait cycle (50% phase offset) */
        @keyframes runnerRightStride {
          0% {
            transform: rotate(34deg);
          }
          25% {
            transform: rotate(8deg);
          }
          50% {
            transform: rotate(-30deg);
          }
          75% {
            transform: rotate(2deg);
          }
          100% {
            transform: rotate(34deg);
          }
        }

        /* Van Horn Shockwave Expand Animation */
        .van-horn-burst {
          animation: hornBlastPulse 0.3s ease-out infinite alternate;
        }
        @keyframes hornBlastPulse {
          0% {
            transform: translate(294px, 94px) scale(0.92);
            opacity: 0.7;
          }
          100% {
            transform: translate(298px, 94px) scale(1.1);
            opacity: 1;
          }
        }

        /* High-Velocity Sweat Stream */
        .runner-sweat-stream {
          animation: sweatStream 0.45s linear infinite;
        }
        .turbo-sweat {
          animation-duration: 0.2s !important;
        }
        @keyframes sweatStream {
          0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
          25% { opacity: 0.9; }
          100% { transform: translate(-26px, -14px) scale(1.2); opacity: 0; }
        }

        /* Skid Dust Particles */
        .runner-skid-dust {
          animation: skidDustBlow 0.35s linear infinite;
        }
        @keyframes skidDustBlow {
          0% { transform: translate(0, 0) scale(0.6); opacity: 0.75; }
          100% { transform: translate(-22px, -4px) scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
});
