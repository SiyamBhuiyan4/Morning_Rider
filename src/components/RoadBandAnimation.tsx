import { memo } from "react";
import { t } from "../lib/prefs";

export const RoadBandAnimation = memo(function RoadBandAnimation() {
  return (
    <div className="relative w-full overflow-hidden select-none bg-[#050b18]">
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
              PANICKED COURIER RUNNER WITH PARCEL ON HEAD (RUNNING IN FEAR OF THE TRUCK!)
              Position: x=580, y=175 (Sprinting between the Delivery Van and Motorcycle)
              ========================================================================= */}
          <g className="runner-container">
            {/* Ground Contact Shadow under Running Feet */}
            <ellipse cx="2" cy="50" rx="20" ry="4.5" fill="#050a14" opacity="0.75" />

            {/* Foot Dust Puffs Flying Backward */}
            <g className="dust-cloud">
              <circle cx="-22" cy="46" r="4.5" fill="#94a3b8" opacity="0.6" />
              <circle cx="-30" cy="48" r="3" fill="#cbd5e1" opacity="0.4" />
            </g>

            {/* ---------------- SPRINTING LEGS ---------------- */}
            {/* Back Leg (Left) */}
            <g className="runner-leg-back">
              <path
                d="M-2 12 L-18 26 L-26 44"
                stroke="#0b1b38"
                strokeWidth="6.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              {/* Sneaker Shoe */}
              <path d="M-32 42 L-22 42 L-20 47 L-32 47 Z" fill="#ea580c" />
              <rect x="-30" y="46" width="10" height="2" fill="#ffffff" />
            </g>

            {/* Front Leg (Right) */}
            <g className="runner-leg-front">
              <path
                d="M4 12 L22 24 L16 46"
                stroke="#0b1b38"
                strokeWidth="6.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              {/* Sneaker Shoe */}
              <path d="M12 44 L24 44 L26 49 L12 49 Z" fill="#ea580c" />
              <rect x="14" y="48" width="10" height="2" fill="#ffffff" />
            </g>

            {/* ---------------- TORSO & UNIFORM ---------------- */}
            {/* Torso aggressively leaned forward in full sprint */}
            <path
              d="M-6 12 C-6 2 -2 -8 8 -12 L16 -8 C10 4 2 14 -6 12 Z"
              fill="#f57a10"
              stroke="#c2410c"
              strokeWidth="2"
            />
            {/* T-shirt Collar & White Accent */}
            <path d="M6 -12 L12 -8 L4 -6 Z" fill="#ffffff" />
            {/* Morning Rider Kite Icon on Runner's Chest */}
            <circle cx="8" cy="-2" r="2.5" fill="#f8b030" />

            {/* Fluttering T-shirt Hem in the Wind */}
            <path d="M-8 8 L-14 12 L-6 13 Z" fill="#ea580c" />

            {/* ---------------- ARMS HOLDING PARCEL ON HEAD ---------------- */}
            {/* Left Arm reaching up to balance box */}
            <path
              d="M-4 -8 L-15 -24 L-12 -38"
              stroke="#ea580c"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Left Hand gripping left side of carton */}
            <circle cx="-12" cy="-38" r="3.5" fill="#fed7aa" stroke="#c2410c" strokeWidth="1" />

            {/* Right Arm reaching up to balance box */}
            <path
              d="M10 -6 L20 -22 L14 -38"
              stroke="#ea580c"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Right Hand gripping right side of carton */}
            <circle cx="14" cy="-38" r="3.5" fill="#fed7aa" stroke="#c2410c" strokeWidth="1" />

            {/* ---------------- PARCEL CARTON BALANCED ON HEAD ---------------- */}
            <g transform="translate(1, -50)">
              {/* Corrugated Cardboard Delivery Carton */}
              <rect
                x="-18"
                y="-14"
                width="36"
                height="26"
                rx="3"
                fill="#d97706"
                stroke="#92400e"
                strokeWidth="2"
              />
              {/* Box Top Flap Crease */}
              <line x1="-18" y1="-7" x2="18" y2="-7" stroke="#b45309" strokeWidth="1.5" />

              {/* Morning Rider Official Orange Packing Tape */}
              <rect x="-18" y="-4" width="36" height="6" fill="#f57a10" />
              <rect x="-3" y="-14" width="6" height="26" fill="#ea580c" />

              {/* White Barcode Shipping Label */}
              <rect x="-14" y="3" width="14" height="7" rx="1" fill="#ffffff" />
              <line x1="-12" y1="5" x2="-2" y2="5" stroke="#0f172a" strokeWidth="1" strokeDasharray="1.5 1" />
              <line x1="-12" y1="8" x2="-4" y2="8" stroke="#0f172a" strokeWidth="0.8" />

              {/* "FRAGILE / THIS SIDE UP" Arrows in Red */}
              <path d="M10 4 L10 9 M8 6 L10 4 L12 6" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" />
            </g>

            {/* ---------------- PANICKED FACE (LOOKING BACK AT TRUCK IN FEAR!) ---------------- */}
            <g transform="translate(1, -22)">
              {/* Head (tilted backward looking over left shoulder at oncoming truck) */}
              <circle cx="0" cy="0" r="11" fill="#fed7aa" stroke="#ea580c" strokeWidth="1.5" />

              {/* Disheveled Black Hair blowing in the wind */}
              <path d="M-8 -6 C-12 -12 4 -14 10 -8 C6 -4 -4 -4 -8 -6 Z" fill="#0f172a" />
              <path d="M-10 -4 L-15 -7 L-9 -1 Z" fill="#0f172a" />

              {/* Wide Terrified Cartoon Eyes (Looking back to the left at the truck!) */}
              {/* Left Eye */}
              <ellipse cx="-4" cy="-1" rx="4" ry="4.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
              <circle cx="-6" cy="-1" r="1.8" fill="#0f172a" />
              {/* Right Eye */}
              <ellipse cx="4" cy="-1" rx="3.5" ry="4" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
              <circle cx="2" cy="-1" r="1.6" fill="#0f172a" />

              {/* Panicked Open Screaming / Gasping Mouth */}
              <path d="M-5 5 Q-1 9 4 5 Q-1 4 -5 5 Z" fill="#ef4444" stroke="#0f172a" strokeWidth="1" />
              <ellipse cx="-1" cy="6" rx="2.5" ry="1.5" fill="#ffffff" />

              {/* Flying Panic Sweat Drops (Popping off and flying backward!) */}
              <path
                d="M-10 -8 C-14 -8 -16 -4 -12 -2 C-10 -4 -8 -8 -10 -8 Z"
                fill="#38bdf8"
                stroke="#0284c7"
                strokeWidth="0.8"
                className="sweat-burst-1"
              />
              <path
                d="M-7 -12 C-10 -12 -12 -9 -9 -7 C-7 -9 -5 -12 -7 -12 Z"
                fill="#38bdf8"
                stroke="#0284c7"
                strokeWidth="0.8"
                className="sweat-burst-2"
              />

              {/* Comical Panic Stress Lines Above Eyebrows */}
              <line x1="-8" y1="-8" x2="-4" y2="-6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="2" y1="-7" x2="6" y2="-8" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
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

        /* Panicked Courier Runner Sprint (Fleeing the oncoming truck in fear!) */
        .runner-container {
          animation: runnerSprintPanic 0.22s ease-in-out infinite;
        }
        @keyframes runnerSprintPanic {
          0%, 100% {
            transform: translate(575px, 175px) rotate(8deg);
          }
          50% {
            transform: translate(575px, 169px) rotate(4deg);
          }
        }

        /* Frantic Sprinting Legs */
        .runner-leg-front {
          transform-box: fill-box;
          transform-origin: top center;
          animation: sprintFrontLeg 0.22s ease-in-out infinite alternate;
        }
        @keyframes sprintFrontLeg {
          0% { transform: rotate(-38deg); }
          100% { transform: rotate(45deg); }
        }

        .runner-leg-back {
          transform-box: fill-box;
          transform-origin: top center;
          animation: sprintBackLeg 0.22s ease-in-out infinite alternate;
        }
        @keyframes sprintBackLeg {
          0% { transform: rotate(45deg); }
          100% { transform: rotate(-38deg); }
        }

        /* Flying Panic Sweat Drops */
        .sweat-burst-1 {
          animation: sweatFly 0.45s linear infinite;
        }
        .sweat-burst-2 {
          animation: sweatFly 0.45s linear infinite 0.22s;
        }
        @keyframes sweatFly {
          0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
          25% { opacity: 1; }
          100% { transform: translate(-28px, -18px) scale(1.3); opacity: 0; }
        }

        /* Foot Dust Puffs */
        .dust-cloud {
          animation: dustPuffBlow 0.35s linear infinite;
        }
        @keyframes dustPuffBlow {
          0% { transform: translate(0, 0) scale(0.6); opacity: 0.8; }
          100% { transform: translate(-25px, -6px) scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
});
