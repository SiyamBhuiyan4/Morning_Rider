import { memo } from "react";

export const RoadBandAnimation = memo(function RoadBandAnimation() {
  return (
    <div className="relative w-full overflow-hidden select-none pointer-events-none">
      {/* Upper edge blend */}
      <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-navy-950 to-transparent z-10" />

      {/* The animated road SVG */}
      <img
        src="/brand/road-band.svg"
        alt="Morning Rider Delivery Road Animation"
        width={1440}
        height={250}
        className="w-full h-auto min-w-[900px] object-cover object-bottom"
        loading="eager"
        decoding="async"
      />

      {/* Lower edge road shadow */}
      <div className="h-2 w-full bg-[#1b1a1c]" />
    </div>
  );
});
