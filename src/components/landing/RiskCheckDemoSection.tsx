import { useState } from "react";
import { ShieldAlert, ShieldCheck, Search, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { Button, Input, cx } from "../ui";
import { navigate } from "../../lib/router";
import { t } from "../../lib/prefs";

interface RiskProfile {
  phone: string;
  totalParcels: number;
  delivered: number;
  returned: number;
  successRate: number;
  level: "low" | "medium" | "high";
  label: string;
  advice: string;
}

const PRESET_PROFILES: Record<string, RiskProfile> = {
  "01711000001": {
    phone: "01711000001",
    totalParcels: 38,
    delivered: 37,
    returned: 1,
    successRate: 97.4,
    level: "low",
    label: "Safe & Verified Customer",
    advice: "High delivery acceptance. Safe to ship immediately with regular COD.",
  },
  "01922000002": {
    phone: "01922000002",
    totalParcels: 6,
    delivered: 4,
    returned: 2,
    successRate: 66.7,
    level: "medium",
    label: "Moderate Risk / Review",
    advice: "Customer has returned parcels before. Call customer to re-confirm before dispatching.",
  },
  "01833000003": {
    phone: "01833000003",
    totalParcels: 14,
    delivered: 4,
    returned: 10,
    successRate: 28.5,
    level: "high",
    label: "High Return Risk Detected",
    advice: "High refusal frequency across courier network. Take delivery charge in advance or cancel.",
  },
};

export function RiskCheckDemoSection() {
  const [inputPhone, setInputPhone] = useState("01711000001");
  const [activeProfile, setActiveProfile] = useState<RiskProfile>(PRESET_PROFILES["01711000001"]);

  const handleCheck = (phone: string) => {
    const clean = phone.trim().replace(/\D/g, "");
    if (PRESET_PROFILES[clean]) {
      setActiveProfile(PRESET_PROFILES[clean]);
    } else {
      // Dynamic profile generator for any typed number
      const hash = clean.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const isHigh = hash % 3 === 0;
      const isMed = hash % 3 === 1;

      if (isHigh) {
        setActiveProfile({
          phone: clean || "018XXXXXXXX",
          totalParcels: 12,
          delivered: 5,
          returned: 7,
          successRate: 41.6,
          level: "high",
          label: "High Return Risk Detected",
          advice: "Frequent order refusals. Request advance delivery payment.",
        });
      } else if (isMed) {
        setActiveProfile({
          phone: clean || "019XXXXXXXX",
          totalParcels: 9,
          delivered: 6,
          returned: 3,
          successRate: 66.7,
          level: "medium",
          label: "Moderate Risk / Review",
          advice: "Average reliability. Confirm parcel delivery address via phone before shipping.",
        });
      } else {
        setActiveProfile({
          phone: clean || "017XXXXXXXX",
          totalParcels: 26,
          delivered: 25,
          returned: 1,
          successRate: 96.1,
          level: "low",
          label: "Safe & Verified Customer",
          advice: "Excellent customer track record. 100% safe to dispatch.",
        });
      }
    }
  };

  return (
    <section id="risk-check" className="py-20 bg-page dark:bg-navy-950/50 scroll-mt-10 border-t border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          {/* Left Text */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-bold text-brand dark:bg-brand/20">
              <ShieldCheck className="size-3.5" />
              <span>{t("AI Fraud & Return Prevention")}</span>
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl dark:text-white">
              {t("Delivery Risk Check before you ship")}
            </h2>

            <p className="text-base text-ink-2 dark:text-white/70 leading-relaxed">
              {t(
                "Stop losing money on fake orders and returned parcels. Morning Rider analyzes recipient delivery history across thousands of courier deliveries so you know whether a customer accepts parcels or cancels at the door."
              )}
            </p>

            <ul className="space-y-3">
              {[
                t("Instant success rate check using customer phone number"),
                t("Detection of habitual order returners and fraudulent buyers"),
                t("Actionable dispatch advice: ship safely or collect advance fee"),
                t("Free and integrated inside every merchant dashboard"),
              ].map((pt) => (
                <li key={pt} className="flex items-start gap-2.5 text-sm font-semibold text-ink dark:text-white">
                  <CheckCircle2 className="size-4 shrink-0 text-brand mt-0.5" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <Button size="lg" onClick={() => navigate("/register")}>
                <span>{t("Unlock full merchant fraud protection")}</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>

          {/* Right: Interactive Risk Check Simulation Card */}
          <div className="relative">
            {/* Soft Glow */}
            <div className="absolute -inset-3 rounded-3xl bg-brand/10 blur-xl dark:bg-brand/15" />

            <div className="relative rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-xl dark:bg-navy-900/90 dark:border-white/10">
              <div className="flex items-center justify-between border-b border-line pb-4 dark:border-white/10">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-3 dark:text-white/60">
                    {t("Live Demo Simulator")}
                  </p>
                  <p className="text-sm font-extrabold text-ink dark:text-white">
                    {t("Customer Delivery Risk Analyzer")}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  {t("Active Database")}
                </span>
              </div>

              {/* Input Form */}
              <div className="mt-5 space-y-3">
                <label className="block text-xs font-bold text-ink-3 dark:text-white/60">
                  {t("Enter Buyer Phone Number:")}
                </label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    value={inputPhone}
                    onChange={(e) => {
                      setInputPhone(e.target.value);
                      handleCheck(e.target.value);
                    }}
                    placeholder="01XXXXXXXXX"
                    className="h-11 font-mono font-bold tracking-wider"
                  />
                  <Button
                    type="button"
                    onClick={() => handleCheck(inputPhone)}
                    icon={Search}
                    className="shrink-0"
                  >
                    {t("Check Risk")}
                  </Button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-ink-3 dark:text-white/60">
                  <span className="font-semibold">{t("Try presets:")}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setInputPhone("01711000001");
                      handleCheck("01711000001");
                    }}
                    className="rounded-md bg-page px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-600 hover:bg-emerald-50 dark:bg-navy-950"
                  >
                    01711-Safe
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputPhone("01922000002");
                      handleCheck("01922000002");
                    }}
                    className="rounded-md bg-page px-2 py-0.5 font-mono text-[11px] font-bold text-amber-600 hover:bg-amber-50 dark:bg-navy-950"
                  >
                    01922-Review
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputPhone("01833000003");
                      handleCheck("01833000003");
                    }}
                    className="rounded-md bg-page px-2 py-0.5 font-mono text-[11px] font-bold text-red-600 hover:bg-red-50 dark:bg-navy-950"
                  >
                    01833-HighRisk
                  </button>
                </div>
              </div>

              {/* Dynamic Result Card */}
              <div
                className={cx(
                  "mt-6 rounded-2xl border p-5 transition-all duration-300",
                  activeProfile.level === "low" &&
                    "border-emerald-300 bg-emerald-50/70 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-700/40 dark:text-emerald-200",
                  activeProfile.level === "medium" &&
                    "border-amber-300 bg-amber-50/70 text-amber-950 dark:bg-amber-950/30 dark:border-amber-700/40 dark:text-amber-200",
                  activeProfile.level === "high" &&
                    "border-red-300 bg-red-50/70 text-red-950 dark:bg-red-950/30 dark:border-red-700/40 dark:text-red-200"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {activeProfile.level === "low" ? (
                      <ShieldCheck className="size-6 text-emerald-600 dark:text-emerald-400" />
                    ) : activeProfile.level === "medium" ? (
                      <AlertTriangle className="size-6 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <ShieldAlert className="size-6 text-red-600 dark:text-red-400" />
                    )}
                    <div>
                      <p className="font-extrabold text-sm sm:text-base">{t(activeProfile.label)}</p>
                      <p className="font-mono text-xs opacity-75">{activeProfile.phone}</p>
                    </div>
                  </div>
                  <span className="text-xl sm:text-2xl font-black">
                    {activeProfile.successRate}%
                  </span>
                </div>

                {/* Score Stats */}
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-current/15 pt-3 text-center">
                  <div>
                    <p className="text-[10px] uppercase font-bold opacity-75">{t("Total Orders")}</p>
                    <p className="text-base font-extrabold">{activeProfile.totalParcels}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold opacity-75">{t("Accepted")}</p>
                    <p className="text-base font-extrabold">{activeProfile.delivered}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold opacity-75">{t("Returned")}</p>
                    <p className="text-base font-extrabold">{activeProfile.returned}</p>
                  </div>
                </div>

                {/* Advice Box */}
                <div className="mt-3.5 rounded-xl bg-white/70 p-2.5 text-xs font-semibold dark:bg-navy-950/80">
                  <span className="font-bold">{t("System Advice:")}</span> {t(activeProfile.advice)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
