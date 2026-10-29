import { memo } from "react";
import { t } from "../lib/prefs";

export const NetworkMapAnimation = memo(function NetworkMapAnimation() {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0e1612] p-6 sm:p-8 text-white shadow-2xl">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        {/* Left: Animated Map Container */}
        <div className="relative mx-auto w-full max-w-md">
          {/* Top-left "Network live" badge (Exact match to screenshot) */}
          <div className="absolute top-3 left-3 z-20">
            <span className="inline-flex items-center gap-2 rounded-xl bg-[#17251d]/90 px-3 py-1.5 text-xs font-bold text-[#58E8A6] border border-[#58E8A6]/30 shadow-lg backdrop-blur-md">
              <span className="size-2 rounded-full bg-[#00BF6F] animate-ping" />
              <span>{t("Network live")}</span>
            </span>
          </div>

          {/* Map Graphic with fast shooting lights from Dhaka center point */}
          <div className="relative overflow-hidden rounded-2xl bg-[#131c17]/60 p-2 border border-white/5 shadow-inner">
            <img
              src="/brand/network-map.svg"
              alt="Bangladesh Live Courier Network Map"
              width={480}
              height={600}
              className="w-full h-auto object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>

          <p className="mt-2 text-center text-[10px] text-white/40">
            {t("Routes shown are illustrative. Fast division dispatch across Bangladesh.")}
          </p>
        </div>

        {/* Right: Network Statistics & Highlights */}
        <div className="space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#58E8A6]">
              {t("Nationwide Connectivity")}
            </span>
            <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {t("One central hub. Rapid distribution to every corner.")}
            </h3>
            <p className="mt-2.5 text-xs sm:text-sm text-white/70 leading-relaxed">
              {t(
                "From our central Dhaka dispatch sorting hub, express parcels and consignments radiate outward at breakneck speed to all divisional hubs and upazilas across Bangladesh."
              )}
            </p>
          </div>

          {/* Grid of stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[
              { val: "1,000+", label: t("Delivery Points"), sub: t("Active countrywide network") },
              { val: "7,500+", label: t("Delivery Personnel"), sub: t("Riders & logistics team") },
              { val: "8", label: t("Divisions"), sub: t("Connected sorting hubs") },
              { val: "64", label: t("Districts"), sub: t("Complete national coverage") },
              { val: "495", label: t("Upazilas"), sub: t("Doorstep delivery reached") },
              { val: "330", label: t("Municipalities"), sub: t("Full urban penetration") },
            ].map((st) => (
              <div
                key={st.label}
                className="rounded-2xl border border-white/10 bg-[#16221c]/80 p-3.5 sm:p-4 backdrop-blur-sm transition hover:border-[#58E8A6]/40"
              >
                <p className="text-xl sm:text-2xl font-black text-[#58E8A6]">{st.val}</p>
                <p className="text-xs font-bold text-white mt-0.5">{st.label}</p>
                <p className="text-[10px] text-white/50">{st.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
