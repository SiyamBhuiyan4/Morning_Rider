import { memo } from "react";
import { t } from "../lib/prefs";

export const RoadBandAnimation = memo(function RoadBandAnimation() {
  return (
    <div className="relative w-full overflow-hidden select-none bg-[#060f22]">
      {/* ---------------- Day/Night Ambient Sky Container ---------------- */}
      <div className="relative w-full h-[260px] sm:h-[300px] overflow-hidden">
        {/* Layer 1: Morning Sunrise / Dawn (Theme baseline) */}
        <div className="sky-layer sky-sunrise absolute inset-0 pointer-events-none" />

        {/* Layer 2: Bright Daylight / Noon */}
        <div className="sky-layer sky-day absolute inset-0 pointer-events-none" />

        {/* Layer 3: Sunset / Dusk */}
        <div className="sky-layer sky-sunset absolute inset-0 pointer-events-none" />

        {/* Layer 4: Deep Night with Twinkling Stars */}
        <div className="sky-layer sky-night absolute inset-0 pointer-events-none">
          {/* Star Field */}
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

        {/* Celestial Bodies: Sun and Moon orbiting across the horizon */}
        <div className="celestial-orbit absolute inset-x-0 bottom-16 h-36 pointer-events-none">
          {/* Glowing Sun */}
          <div className="sun-body absolute size-14 rounded-full bg-gradient-to-tr from-[#f57a10] to-[#f8b030] shadow-[0_0_40px_15px_rgba(248,176,48,0.6)]" />

          {/* Glowing Crescent Moon */}
          <div className="moon-body absolute size-11 rounded-full shadow-[0_0_25px_8px_rgba(224,231,255,0.5)]">
            <div className="size-full rounded-full bg-[#f1f5f9] shadow-inner" />
            <div className="absolute -top-1 -right-1 size-9 rounded-full bg-[#060f22]" />
          </div>
        </div>

        {/* Distant Parallax City Skyline Silhouette */}
        <div className="absolute inset-x-0 bottom-16 h-28 pointer-events-none opacity-45">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-full fill-current text-[#0b1b38]">
            <path d="M0 120 V85 H30 V65 H45 V85 H80 V45 H110 V85 H135 V75 H170 V85 H210 V55 H225 V35 H235 V55 H260 V85 H320 V60 H345 V85 H400 V40 H420 V30 H430 V40 H450 V85 H510 V70 H540 V85 H600 V50 H625 V35 H635 V50 H660 V85 H720 V65 H750 V85 H810 V45 H835 V20 H845 V45 H870 V85 H930 V70 H960 V85 H1020 V50 H1040 V30 H1050 V50 H1070 V85 H1130 V65 H1160 V85 H1220 V45 H1250 V85 H1300 V70 H1330 V85 H1440 V120 Z" />
          </svg>
        </div>

        {/* ---------------- Main Road & Vehicles SVG ---------------- */}
        <svg
          viewBox="0 0 1440 280"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMax slice"
        >
          <defs>
            {/* Delivery Van Gradient */}
            <linearGradient id="vanBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f57a10" />
              <stop offset="60%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>

            {/* Van Cab Gradient */}
            <linearGradient id="vanCabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0b1b38" />
              <stop offset="100%" stopColor="#060f22" />
            </linearGradient>

            {/* Van Windshield Reflection */}
            <linearGradient id="windshieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
            </linearGradient>

            {/* Headlight Beam Cone */}
            <linearGradient id="headlightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.75" />
              <stop offset="50%" stopColor="#fef08a" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
            </linearGradient>

            {/* Wheel Rim Gradient */}
            <radialGradient id="wheelRim">
              <stop offset="0%" stopColor="#f8b030" />
              <stop offset="45%" stopColor="#d97706" />
              <stop offset="85%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>

            {/* Wheel Spokes Pattern */}
            <g id="spokePattern">
              <circle cx="0" cy="0" r="22" fill="#0f172a" stroke="#f8b030" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="14" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
              <circle cx="0" cy="0" r="6" fill="#f8b030" />
              <line x1="-19" y1="0" x2="19" y2="0" stroke="#f8b030" strokeWidth="2" opacity="0.8" />
              <line x1="0" y1="-19" x2="0" y2="19" stroke="#f8b030" strokeWidth="2" opacity="0.8" />
              <line x1="-14" y1="-14" x2="14" y2="14" stroke="#f8b030" strokeWidth="1.5" opacity="0.6" />
              <line x1="-14" y1="14" x2="14" y2="-14" stroke="#f8b030" strokeWidth="1.5" opacity="0.6" />
            </g>
          </defs>

          {/* ---------------- ROAD STRUCTURE ---------------- */}
          {/* Road Asphalt Bed */}
          <rect x="0" y="210" width="1440" height="70" fill="#151b26" />

          {/* Curb / Shoulder in Morning Rider Brand Colors */}
          <rect x="0" y="210" width="1440" height="5" fill="#f57a10" />
          <rect x="0" y="215" width="1440" height="2" fill="#f8b030" opacity="0.8" />

          {/* Road Asphalt Texture Lines */}
          <line x1="0" y1="248" x2="1440" y2="248" stroke="#0b1019" strokeWidth="1" />
          <line x1="0" y1="272" x2="1440" y2="272" stroke="#0b1019" strokeWidth="1" />

          {/* Fast Moving Dashed Road Center Line */}
          <g className="road-stripes">
            {Array.from({ length: 28 }).map((_, i) => (
              <rect
                key={i}
                x={-60 + i * 60}
                y="246"
                width="34"
                height="5"
                rx="2.5"
                fill="#fef08a"
                opacity="0.85"
              />
            ))}
          </g>

          {/* ---------------- SPEED STREAKS / WIND PARTICLES ---------------- */}
          <g className="speed-streaks" stroke="#fef08a" strokeLinecap="round" opacity="0.45">
            <line x1="1400" y1="180" x2="1470" y2="180" strokeWidth="2" className="streak-1" />
            <line x1="1200" y1="150" x2="1290" y2="150" strokeWidth="1.5" className="streak-2" />
            <line x1="900" y1="170" x2="980" y2="170" strokeWidth="2.5" className="streak-3" />
            <line x1="700" y1="195" x2="770" y2="195" strokeWidth="1.5" className="streak-1" />
            <line x1="500" y1="160" x2="610" y2="160" strokeWidth="2" className="streak-2" />
            <line x1="200" y1="190" x2="280" y2="190" strokeWidth="2" className="streak-3" />
          </g>

          {/* ========================================================
              VEHICLE 1: MORNING RIDER DELIVERY TRUCK / VAN
              ======================================================== */}
          <g transform="translate(180, 115)" className="van-group">
            {/* Ground Contact Shadow */}
            <ellipse cx="140" cy="98" rx="145" ry="7" fill="#050a14" opacity="0.75" />

            {/* Front Headlight Beam */}
            <polygon
              points="272,62 520,35 520,105 272,78"
              fill="url(#headlightBeam)"
              className="headlight-beam"
            />

            {/* Van Cargo Body */}
            <rect
              x="0"
              y="0"
              width="215"
              height="88"
              rx="12"
              fill="url(#vanBodyGrad)"
              stroke="#ea580c"
              strokeWidth="2"
            />

            {/* Lower Navy Trim / Skirt */}
            <path
              d="M0 72 h215 v12 a6 6 0 0 1 -6 6 H6 a6 6 0 0 1 -6 -6 Z"
              fill="#0b1b38"
            />

            {/* Brand Accent Stripe (Sunrise Gold) */}
            <rect x="0" y="68" width="215" height="4" fill="#f8b030" />

            {/* Morning Rider Branding Text & Kite Logo on Van */}
            <g transform="translate(24, 20)">
              {/* Official Kite Icon */}
              <g transform="scale(0.045) translate(-303, -831)">
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

              {/* Bold Morning Rider Wordmark */}
              <text
                x="32"
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
                x="33"
                y="35"
                fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
                fontSize="9"
                fontWeight="700"
                fill="#ffedd5"
                letterSpacing="0.8"
              >
                EXPRESS DISPATCH
              </text>
            </g>

            {/* Aerodynamic Van Driver Cab */}
            <path
              d="M213 18 H248 L275 50 V88 H213 Z"
              fill="url(#vanCabGrad)"
              stroke="#0b1b38"
              strokeWidth="2"
            />

            {/* Windshield */}
            <path
              d="M218 24 H245 L268 50 H218 Z"
              fill="url(#windshieldGrad)"
              stroke="#0b1b38"
              strokeWidth="1.5"
            />
            {/* Driver Silhouette Inside Cab */}
            <circle cx="232" cy="38" r="8" fill="#1e293b" />
            <path d="M224 48 C224 42 240 42 240 48 Z" fill="#0f172a" />

            {/* Side Window Divider */}
            <line x1="245" y1="24" x2="245" y2="50" stroke="#0b1b38" strokeWidth="2" />

            {/* Front Headlight Unit */}
            <rect x="268" y="58" width="8" height="14" rx="2" fill="#fef08a" />
            <rect x="272" y="60" width="3" height="10" rx="1" fill="#ffffff" />

            {/* Rear Taillight */}
            <rect x="0" y="54" width="4" height="18" rx="2" fill="#ef4444" />

            {/* Front Bumper */}
            <rect x="265" y="78" width="14" height="12" rx="3" fill="#0b1b38" />

            {/* Wheels with Fast Rotation */}
            {/* Rear Wheel */}
            <g transform="translate(56, 92)" className="wheel-spin">
              <use href="#spokePattern" />
            </g>

            {/* Front Wheel */}
            <g transform="translate(225, 92)" className="wheel-spin">
              <use href="#spokePattern" />
            </g>
          </g>

          {/* ========================================================
              VEHICLE 2: REALISTIC MORNING RIDER MOTORCYCLE & RIDER
              Aerodynamic high-speed sprint forward lean posture
              ======================================================== */}
          <g transform="translate(900, 110)" className="bike-group">
            {/* Ground Contact Shadow */}
            <ellipse cx="90" cy="102" rx="95" ry="6" fill="#050a14" opacity="0.8" />

            {/* Motorcycle Headlight Piercing Forward Beam */}
            <polygon
              points="155,62 380,30 380,105 155,78"
              fill="url(#headlightBeam)"
              className="headlight-beam"
            />

            {/* Speed Wind Ribbons around Rider */}
            <g stroke="#f8b030" strokeWidth="1.8" strokeLinecap="round" opacity="0.75" className="rider-wind">
              <line x1="-30" y1="20" x2="-5" y2="20" />
              <line x1="-45" y1="38" x2="-15" y2="38" />
              <line x1="-25" y1="58" x2="5" y2="58" />
            </g>

            {/* Rear Thermal Delivery Box (Morning Rider Brand Orange) */}
            <g transform="translate(14, 28)">
              <rect
                x="0"
                y="0"
                width="48"
                height="44"
                rx="6"
                fill="#f57a10"
                stroke="#c2410c"
                strokeWidth="2"
              />
              <rect x="0" y="0" width="48" height="9" rx="3" fill="#ea580c" />
              {/* High-visibility reflective safety tape */}
              <rect x="4" y="20" width="40" height="4" rx="2" fill="#fef08a" />
              {/* Morning Rider Kite Icon on Delivery Box */}
              <g transform="translate(15, 26) scale(0.026) translate(-303, -831)">
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
            </g>

            {/* Motorcycle Chassis, Engine, Exhaust, Swingarm */}
            {/* Upswept Sport Exhaust */}
            <path
              d="M65 84 L98 74 L108 68"
              stroke="#64748b"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M92 76 L112 70"
              stroke="#cbd5e1"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />

            {/* Rear Swingarm */}
            <line x1="32" y1="96" x2="75" y2="84" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" />

            {/* Main Trellis Frame (Deep Navy & Orange Accents) */}
            <path
              d="M32 96 L68 76 L92 56 L138 68 L146 96"
              stroke="#0b1b38"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* Engine Block Detail */}
            <rect x="68" y="70" width="28" height="20" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
            <circle cx="82" cy="80" r="5" fill="#f8b030" />

            {/* Fuel Tank (Aerodynamic Sporty Orange) */}
            <path
              d="M74 54 C82 44 112 46 122 56 C124 64 116 68 96 68 Z"
              fill="#f57a10"
              stroke="#ea580c"
              strokeWidth="2"
            />
            {/* Tank knee grip pad */}
            <path d="M90 56 C96 52 108 53 112 58 Z" fill="#0b1b38" opacity="0.6" />

            {/* Front Suspension Forks */}
            <line x1="122" y1="56" x2="148" y2="96" stroke="#f8b030" strokeWidth="4.5" strokeLinecap="round" />
            <line x1="126" y1="56" x2="152" y2="96" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />

            {/* Front Aerodynamic Headlight Cowl */}
            <polygon points="124,52 144,54 154,64 138,68 124,62" fill="#0b1b38" />
            {/* Dual LED Headlight */}
            <polygon points="144,56 153,64 148,67 141,60" fill="#fef08a" />
            <circle cx="147" cy="62" r="3" fill="#ffffff" />

            {/* Clip-on Handlebars */}
            <path d="M120 50 L128 54" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />

            {/* ---------------- REALISTIC RIDER FIGURE ---------------- */}
            {/* Aggressive forward lean sprint posture */}
            {/* Rider Legs & Knee Tuck */}
            <path
              d="M70 66 L92 78 L86 94"
              stroke="#0b1b38"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Rider Foot & Boot on Peg */}
            <rect x="80" y="90" width="14" height="6" rx="2" fill="#060f22" />

            {/* Rider Torso Leaned Forward 45° */}
            <path
              d="M62 58 C62 46 76 34 94 30 L110 44 C96 56 82 66 62 58 Z"
              fill="#f57a10"
              stroke="#ea580c"
              strokeWidth="2"
            />
            {/* Jacket Navy Spine Panel */}
            <path d="M66 54 C72 44 86 36 98 34" stroke="#0b1b38" strokeWidth="5" strokeLinecap="round" fill="none" />
            {/* Retro-reflective Safety Stripe on Back */}
            <path d="M70 48 C76 40 88 34 96 32" stroke="#fef08a" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* Rider Arms Reaching Forward to Handlebar */}
            <path
              d="M92 36 L112 44 L124 52"
              stroke="#f57a10"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Glove gripping handlebar */}
            <circle cx="124" cy="52" r="4.5" fill="#060f22" />

            {/* Realistic Motorcycle Helmet */}
            {/* Helmet Shell (Morning Rider Navy with Brand Orange Aero Wing) */}
            <ellipse cx="106" cy="22" rx="14" ry="12" fill="#0b1b38" />
            <path d="M96 24 C100 12 116 12 122 22 C120 28 112 32 98 28 Z" fill="#060f22" />
            {/* Helmet Aero Spoiler */}
            <path d="M94 20 L90 24 L96 26 Z" fill="#f57a10" />

            {/* Tinted Aerodynamic Face Visor with Speed Glare */}
            <path
              d="M106 18 C116 18 124 22 122 27 C116 28 108 26 106 22 Z"
              fill="#38bdf8"
              opacity="0.9"
            />
            <line x1="110" y1="20" x2="119" y2="23" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />

            {/* Rear Wheel with Fast Rotation */}
            <g transform="translate(32, 96)" className="wheel-spin">
              <use href="#spokePattern" />
            </g>

            {/* Front Wheel with Fast Rotation */}
            <g transform="translate(148, 96)" className="wheel-spin">
              <use href="#spokePattern" />
            </g>
          </g>
        </svg>

        {/* Dynamic Day/Night Cycle Status Badge */}
        <div className="absolute bottom-3 left-4 z-20 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 border border-white/10 text-[11px] text-white">
          <span className="size-2 rounded-full bg-[#f8b030] animate-pulse" />
          <span className="font-semibold tracking-wide text-white/90">
            {t("Day & Night Non-Stop Express Delivery (6 AM – 12 AM)")}
          </span>
        </div>
      </div>

      {/* ---------------- EMBEDDED CSS ANIMATIONS ---------------- */}
      <style>{`
        /* Day to Night Sky Cycle (Smooth 24s infinite cycle) */
        .sky-layer {
          transition: opacity 1.5s ease-in-out;
        }

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

        /* Celestial Body Orbits (Sun & Moon) */
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

        /* Twinkling Star Field */
        .star {
          position: absolute;
          border-radius: 9999px;
          background: #ffffff;
          animation: twinkle 2s infinite ease-in-out;
        }
        .star-1 { top: 22%; left: 15%; width: 3px; height: 3px; animation-delay: 0.2s; }
        .star-2 { top: 35%; left: 28%; width: 2px; height: 2px; animation-delay: 0.7s; }
        .star-3 { top: 18%; left: 45%; width: 3px; height: 3px; animation-delay: 1.1s; }
        .star-4 { top: 28%; left: 62%; width: 2px; height: 2px; animation-delay: 0.4s; }
        .star-5 { top: 15%; left: 78%; width: 3px; height: 3px; animation-delay: 1.5s; }
        .star-6 { top: 40%; left: 88%; width: 2px; height: 2px; animation-delay: 0.9s; }
        .star-7 { top: 25%; left: 94%; width: 2.5px; height: 2.5px; animation-delay: 0.3s; }
        .star-8 { top: 12%; left: 32%; width: 2px; height: 2px; animation-delay: 1.3s; }
        .star-9 { top: 45%; left: 52%; width: 3px; height: 3px; animation-delay: 0.6s; }
        .star-10 { top: 30%; left: 70%; width: 2px; height: 2px; animation-delay: 1.7s; }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }

        /* Fast Road Translation Animation (Road rushing backwards) */
        .road-stripes {
          animation: roadRoll 0.45s linear infinite;
        }
        @keyframes roadRoll {
          from { transform: translateX(0); }
          to { transform: translateX(-60px); }
        }

        /* High Speed Wheel Rotation */
        .wheel-spin {
          transform-box: fill-box;
          transform-origin: center;
          animation: wheelFastSpin 0.35s linear infinite;
        }
        @keyframes wheelFastSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Realistic Motorcycle High-Speed Suspension Rush & Micro-Vibration */
        .bike-group {
          animation: bikeRushSprint 0.28s ease-in-out infinite;
        }
        @keyframes bikeRushSprint {
          0%, 100% { transform: translate(900px, 110px) rotate(0deg); }
          25% { transform: translate(900px, 108.5px) rotate(-0.35deg); }
          75% { transform: translate(900px, 111px) rotate(0.25deg); }
        }

        /* Delivery Van High-Speed Sprint Bobbing */
        .van-group {
          animation: vanSprintBob 0.38s ease-in-out infinite;
        }
        @keyframes vanSprintBob {
          0%, 100% { transform: translate(180px, 115px); }
          50% { transform: translate(180px, 113.5px); }
        }

        /* Wind Speed Streaks Zipping Past */
        .streak-1 { animation: streakFly 0.6s linear infinite; }
        .streak-2 { animation: streakFly 0.45s linear infinite 0.15s; }
        .streak-3 { animation: streakFly 0.52s linear infinite 0.3s; }
        @keyframes streakFly {
          0% { transform: translateX(200px); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { transform: translateX(-800px); opacity: 0; }
        }

        /* Headlights Beam Intensity (Glows brighter at dusk & night) */
        .headlight-beam {
          animation: headlightGlow 24s infinite ease-in-out;
        }
        @keyframes headlightGlow {
          0%, 20% { opacity: 0.55; }
          25%, 45% { opacity: 0.25; }
          50%, 65% { opacity: 0.65; }
          70%, 95% { opacity: 0.95; }
          100% { opacity: 0.55; }
        }
      `}</style>
    </div>
  );
});
