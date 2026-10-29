import { useState } from "react";
import { ArrowRight, Calculator, Sparkles, Snowflake, FileText, Package } from "lucide-react";
import { Button, Input, cx } from "../ui";
import { navigate } from "../../lib/router";
import { tk } from "../../lib/format";
import { t } from "../../lib/prefs";

interface RateCalculatorProps {
  rates?: {
    uttara: number;
    dhakaCity: number;
    gazipurCity: number;
    narayanganjCity: number;
    extraPerKg: number;
    extraPerKgOutside: number;
    codPercent: number;
    codPercentOutside: number;
    returnPercent: number;
  };
}

export function RateCalculatorSection({ rates }: RateCalculatorProps) {
  const [toZone, setToZone] = useState<"uttara" | "dhaka_city" | "gazipur_city" | "narayanganj_city">("dhaka_city");
  const [itemType, setItemType] = useState<"regular" | "document" | "frozen" | "bakery">("regular");
  const [weight, setWeight] = useState(1);
  const [codAmount, setCodAmount] = useState(1200);

  // Default rates fallback
  const currentRates = rates || {
    uttara: 60,
    dhakaCity: 70,
    gazipurCity: 90,
    narayanganjCity: 110,
    extraPerKg: 15,
    extraPerKgOutside: 20,
    codPercent: 0,
    codPercentOutside: 1,
    returnPercent: 50,
  };

  // Base rate logic
  let baseRate = 70;
  if (toZone === "uttara") {
    baseRate = currentRates.uttara; // 60
  } else if (toZone === "dhaka_city") {
    baseRate = currentRates.dhakaCity; // 70
  } else if (toZone === "gazipur_city") {
    baseRate = currentRates.gazipurCity; // 90
  } else if (toZone === "narayanganj_city") {
    baseRate = currentRates.narayanganjCity; // 110
  }

  // Cold chain or bakery surcharge
  let itemSurcharge = 0;
  if (itemType === "frozen") {
    itemSurcharge = 30; // Specialized cold-box insulated carry
  } else if (itemType === "bakery") {
    itemSurcharge = 20; // Upright delicate care
  } else if (itemType === "document") {
    itemSurcharge = -10; // Documents slight discount
  }

  const isOutside = toZone === "gazipur_city" || toZone === "narayanganj_city";
  const extraKg = Math.max(0, Math.ceil(weight - 1));
  const extraRate = isOutside ? currentRates.extraPerKgOutside : currentRates.extraPerKg;
  const weightCharge = extraKg * extraRate;

  const codPct = isOutside ? currentRates.codPercentOutside : currentRates.codPercent;
  const codCharge = codAmount > 0 ? Math.round((codAmount * codPct) / 100) : 0;

  const totalDeliveryCost = Math.max(50, baseRate + itemSurcharge + weightCharge + codCharge);
  const merchantReceives = Math.max(0, codAmount - totalDeliveryCost);

  // Speed estimation
  const deliveryTime =
    toZone === "uttara"
      ? t("Within 3 hours (Express)")
      : itemType === "frozen"
      ? t("Within 6 hours (Cold-Chain)")
      : t("Same day delivery");

  return (
    <section id="rates" className="py-20 bg-surface dark:bg-navy-950/70 border-t border-line scroll-mt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-brand uppercase">
            {t("Transparent Pricing")}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl dark:text-white">
            {t("Know the exact cost before you send")}
          </h2>
          <p className="mt-3 text-base text-ink-2 dark:text-white/70">
            {t(
              "Select your route, weight and cash collection. Up to 1 kg base rate with zero hidden costs."
            )}
          </p>
        </div>

        {/* 4 Quick Rate Cards */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              zone: t("Uttara (3-hour express)"),
              price: currentRates.uttara,
              time: t("Within 3 hours"),
              tag: t("Express"),
              hot: true,
            },
            {
              zone: t("Dhaka City Corporation"),
              price: currentRates.dhakaCity,
              time: t("Same day"),
              tag: t("Popular"),
              hot: false,
            },
            {
              zone: t("Gazipur City"),
              price: currentRates.gazipurCity,
              time: t("Same day"),
              tag: t("Suburban"),
              hot: false,
            },
            {
              zone: t("Narayanganj City"),
              price: currentRates.narayanganjCity,
              time: t("Same day"),
              tag: t("Suburban"),
              hot: false,
            },
          ].map((r) => (
            <div
              key={r.zone}
              className={cx(
                "relative rounded-3xl border p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
                r.hot
                  ? "border-brand bg-brand-50/20 dark:bg-brand/10 dark:border-brand/40"
                  : "border-line bg-page dark:bg-navy-900/60 dark:border-white/10"
              )}
            >
              {r.hot && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-[11px] font-extrabold text-white shadow-md shadow-brand/30">
                  {r.tag}
                </span>
              )}
              <p className="text-xs font-bold text-ink-3 dark:text-white/60 uppercase tracking-wider">
                {r.zone}
              </p>
              <p className="mt-3 text-4xl font-extrabold tracking-tight text-ink dark:text-white">
                {tk(r.price)}
              </p>
              <p className="mt-2 text-xs font-semibold text-brand dark:text-sun">
                {r.time}
              </p>
              <p className="mt-1 text-[11px] text-ink-3 dark:text-white/50">
                {t("Up to 1 kg • 0% COD in Dhaka")}
              </p>
            </div>
          ))}
        </div>

        {/* Steadfast-Grade Interactive Rate Calculator Box */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-line bg-page shadow-2xl dark:bg-navy-900/80 dark:border-white/15">
          {/* Header Bar */}
          <div className="sunrise flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-white">
            <div className="flex items-center gap-2.5">
              <Calculator className="size-5 text-sun" />
              <h3 className="font-extrabold tracking-tight text-base sm:text-lg">
                {t("Interactive Delivery Rate & Payout Calculator")}
              </h3>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-sun ring-1 ring-white/15">
              {t("Live Rate Simulator")}
            </span>
          </div>

          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr]">
            {/* Left Column: Form Inputs */}
            <div className="space-y-6">
              {/* 1. Route Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 dark:text-white/60">
                  1. {t("Select Delivery Route")}
                </label>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  {[
                    { id: "uttara" as const, name: "Uttara", time: t("3h Express") },
                    { id: "dhaka_city" as const, name: "Dhaka City", time: t("Same day") },
                    { id: "gazipur_city" as const, name: "Gazipur City", time: t("Same day") },
                    { id: "narayanganj_city" as const, name: "Narayanganj", time: t("Same day") },
                  ].map((z) => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setToZone(z.id)}
                      className={cx(
                        "flex flex-col items-start rounded-2xl p-3 text-left transition-all duration-150 cursor-pointer",
                        toZone === z.id
                          ? "border-2 border-brand bg-brand-50/70 text-ink shadow-sm dark:bg-brand/20 dark:text-white"
                          : "border border-line bg-surface text-ink-2 hover:border-brand/40 dark:bg-navy-950 dark:border-white/10 dark:text-white/70"
                      )}
                    >
                      <span className="text-sm font-bold text-ink dark:text-white">{z.name}</span>
                      <span className="text-[11px] text-ink-3 dark:text-white/50">{z.time}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Item Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 dark:text-white/60">
                  2. {t("What are you sending?")}
                </label>
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { id: "regular" as const, label: t("Regular Parcel"), icon: Package },
                    { id: "frozen" as const, label: t("Cold Chain"), icon: Snowflake },
                    { id: "bakery" as const, label: t("Cake & Bakery"), icon: Sparkles },
                    { id: "document" as const, label: t("Documents"), icon: FileText },
                  ].map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => setItemType(it.id)}
                      className={cx(
                        "flex flex-col items-center justify-center rounded-2xl p-3 text-center transition-all cursor-pointer",
                        itemType === it.id
                          ? "border-2 border-brand bg-brand-50/70 font-bold text-ink shadow-sm dark:bg-brand/20 dark:text-white"
                          : "border border-line bg-surface text-ink-2 hover:bg-page dark:bg-navy-950 dark:border-white/10 dark:text-white/70"
                      )}
                    >
                      <it.icon className="size-4 text-brand mb-1" />
                      <span className="text-xs font-semibold">{it.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Weight Selector */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 dark:text-white/60">
                    3. {t("Parcel Weight")}
                  </label>
                  <span className="text-xs font-bold text-brand dark:text-sun">
                    {weight} {t("kg")}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  {[0.5, 1, 2, 3, 5, 10].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setWeight(w)}
                      className={cx(
                        "flex-1 rounded-xl py-2 text-xs font-bold transition cursor-pointer",
                        weight === w
                          ? "bg-navy-900 text-white shadow-sm dark:bg-brand"
                          : "border border-line bg-surface text-ink-2 hover:bg-page dark:bg-navy-950 dark:border-white/10 dark:text-white/70"
                      )}
                    >
                      {w} {t("kg")}
                    </button>
                  ))}
                  <div className="w-20 shrink-0">
                    <Input
                      type="number"
                      min={0.5}
                      max={50}
                      step={0.5}
                      value={weight}
                      onChange={(e) => setWeight(Math.max(0.5, Number(e.target.value) || 1))}
                      className="h-9 px-2 text-center text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Cash to Collect (COD) */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 dark:text-white/60">
                    4. {t("Cash on Delivery (COD) Amount")}
                  </label>
                  <span className="text-xs font-bold text-brand dark:text-sun">{tk(codAmount)}</span>
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  {[0, 500, 1500, 3000].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCodAmount(c)}
                      className={cx(
                        "flex-1 rounded-xl py-2 text-xs font-bold transition cursor-pointer",
                        codAmount === c
                          ? "bg-navy-900 text-white shadow-sm dark:bg-brand"
                          : "border border-line bg-surface text-ink-2 hover:bg-page dark:bg-navy-950 dark:border-white/10 dark:text-white/70"
                      )}
                    >
                      {tk(c)}
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    value={codAmount || ""}
                    onChange={(e) => setCodAmount(Math.max(0, Number(e.target.value) || 0))}
                    placeholder={t("Custom COD amount (৳)")}
                    className="h-10 text-sm font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Calculation Summary */}
            <div className="flex flex-col justify-between rounded-3xl border border-line bg-surface p-6 shadow-sm dark:bg-navy-950/80 dark:border-white/10">
              <div>
                <div className="flex items-center justify-between border-b border-line pb-3 dark:border-white/10">
                  <p className="text-xs font-bold tracking-wider uppercase text-ink-3 dark:text-white/60">
                    {t("Cost Breakdown")}
                  </p>
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand dark:bg-brand/20">
                    {deliveryTime}
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between text-ink-2 dark:text-white/70">
                    <span>{t("Base delivery charge")} (1 kg)</span>
                    <span className="font-bold text-ink dark:text-white">{tk(baseRate)}</span>
                  </div>

                  {itemSurcharge !== 0 && (
                    <div className="flex justify-between text-ink-2 dark:text-white/70">
                      <span>
                        {itemType === "frozen"
                          ? t("Cold-box insulation fee")
                          : itemType === "bakery"
                          ? t("Delicate cake care fee")
                          : t("Document discount")}
                      </span>
                      <span className="font-bold text-ink dark:text-white">
                        {itemSurcharge > 0 ? `+ ${tk(itemSurcharge)}` : `- ${tk(Math.abs(itemSurcharge))}`}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-ink-2 dark:text-white/70">
                    <span>
                      {t("Extra weight")} ({extraKg} kg @ {tk(extraRate)}/kg)
                    </span>
                    <span className="font-bold text-ink dark:text-white">
                      {extraKg > 0 ? `+ ${tk(weightCharge)}` : "—"}
                    </span>
                  </div>

                  <div className="flex justify-between text-ink-2 dark:text-white/70">
                    <span>
                      {t("COD fee")} ({codPct}%)
                    </span>
                    <span className="font-bold text-ink dark:text-white">
                      {codCharge > 0 ? `+ ${tk(codCharge)}` : t("Free (0%)")}
                    </span>
                  </div>

                  <div className="border-t border-line pt-3 dark:border-white/10">
                    <div className="flex justify-between font-extrabold text-ink dark:text-white">
                      <span>{t("Total delivery charge")}</span>
                      <span className="text-lg font-black text-brand dark:text-sun">
                        {tk(totalDeliveryCost)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Net Merchant Payout Box */}
                {codAmount > 0 && (
                  <div className="mt-6 rounded-2xl bg-emerald-50 p-4 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/40">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      {t("Net merchant payout")}
                    </p>
                    <p className="mt-1 text-3xl font-black text-emerald-900 dark:text-emerald-300">
                      {tk(merchantReceives)}
                    </p>
                    <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80">
                      {t("Settled next day directly to your bKash, Nagad or Bank account.")}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-line dark:border-white/10">
                <Button size="lg" className="w-full shadow-glow" onClick={() => navigate("/register")}>
                  <span>{t("Start shipping at these rates")}</span>
                  <ArrowRight className="size-4" />
                </Button>
                <p className="mt-2 text-center text-[11px] text-ink-3 dark:text-white/50">
                  {t("Free merchant sign-up • No upfront fees or monthly commitment")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
