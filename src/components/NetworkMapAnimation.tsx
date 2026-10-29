import { memo } from "react";
import { t } from "../lib/prefs";

export const NetworkMapAnimation = memo(function NetworkMapAnimation() {
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

        {/* Map Graphic with synchronized nationwide dispatch from Dhaka center point */}
        <div className="relative overflow-hidden rounded-2xl bg-[#131c17]/60 p-2 sm:p-4 border border-white/5 shadow-inner flex items-center justify-center">
          <img
            src="/brand/network-map.svg"
            alt="Bangladesh Live Courier Network Map"
            width={480}
            height={600}
            className="w-full max-w-[460px] h-auto object-contain mx-auto"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
});
