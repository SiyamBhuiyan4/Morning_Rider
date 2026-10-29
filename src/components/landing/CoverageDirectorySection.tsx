import { useState } from "react";
import { MapPin, Search, Building } from "lucide-react";
import { Input, cx } from "../ui";
import { t } from "../../lib/prefs";

interface AreaItem {
  name: string;
  bnName: string;
  zone: "uttara" | "dhaka_north" | "dhaka_south" | "gazipur" | "narayanganj";
  zoneLabel: string;
  speed: string;
  express: boolean;
}

const ALL_AREAS: AreaItem[] = [
  // Uttara
  { name: "Uttara Sector 1-14", bnName: "উত্তরা ১-১৪ নম্বর সেক্টর", zone: "uttara", zoneLabel: "Uttara", speed: "Within 3 hours", express: true },
  { name: "Diabari", bnName: "দিয়াবাড়ি", zone: "uttara", zoneLabel: "Uttara", speed: "Within 3 hours", express: true },
  { name: "Abdullahpur", bnName: "আব্দুল্লাহপুর", zone: "uttara", zoneLabel: "Uttara", speed: "Within 3 hours", express: true },
  { name: "Airport & Kawla", bnName: "বিমানবন্দর ও কাওলা", zone: "uttara", zoneLabel: "Uttara", speed: "Within 3 hours", express: true },
  { name: "Khilkhet & Nikunja", bnName: "খিলক্ষেত ও নিকুঞ্জ", zone: "uttara", zoneLabel: "Uttara", speed: "Within 3 hours", express: true },

  // Dhaka North
  { name: "Gulshan 1 & 2", bnName: "গুলশান ১ ও ২", zone: "dhaka_north", zoneLabel: "Dhaka North", speed: "Same day", express: false },
  { name: "Banani & DOHS", bnName: "বনানী ও ডিওএইচএস", zone: "dhaka_north", zoneLabel: "Dhaka North", speed: "Same day", express: false },
  { name: "Bashundhara R/A", bnName: "বসুন্ধরা আবাসিক", zone: "dhaka_north", zoneLabel: "Dhaka North", speed: "Same day", express: false },
  { name: "Baridhara & Diplomatic Zone", bnName: "বারিধারা ও কূটনৈতিক এলাকা", zone: "dhaka_north", zoneLabel: "Dhaka North", speed: "Same day", express: false },
  { name: "Mirpur 1, 2, 6, 10, 11, 12", bnName: "মিরপুর ১, ২, ৬, ১০, ১১, ১২", zone: "dhaka_north", zoneLabel: "Dhaka North", speed: "Same day", express: false },
  { name: "Pallabi & Kafrul", bnName: "পল্লবী ও কাফরুল", zone: "dhaka_north", zoneLabel: "Dhaka North", speed: "Same day", express: false },
  { name: "Mohakhali & Wireless", bnName: "মহাখালী ও ওয়ারলেস", zone: "dhaka_north", zoneLabel: "Dhaka North", speed: "Same day", express: false },
  { name: "Tejgaon & Farmgate", bnName: "তেজগাঁও ও ফার্মগেট", zone: "dhaka_north", zoneLabel: "Dhaka North", speed: "Same day", express: false },
  { name: "Badda, Rampura & Banasree", bnName: "বাড্ডা, রামপুরা ও বনশ্রী", zone: "dhaka_north", zoneLabel: "Dhaka North", speed: "Same day", express: false },

  // Dhaka South
  { name: "Dhanmondi & Sobhanbag", bnName: "ধানমন্ডি ও সোবহানবাগ", zone: "dhaka_south", zoneLabel: "Dhaka South", speed: "Same day", express: false },
  { name: "Mohammadpur & Ring Road", bnName: "মোহাম্মদপুর ও রিং রোড", zone: "dhaka_south", zoneLabel: "Dhaka South", speed: "Same day", express: false },
  { name: "Shyamoli & Kallyanpur", bnName: "শ্যামলী ও কল্যাণপুর", zone: "dhaka_south", zoneLabel: "Dhaka South", speed: "Same day", express: false },
  { name: "Lalmatia & Shankar", bnName: "লালমাটিয়া ও শংকর", zone: "dhaka_south", zoneLabel: "Dhaka South", speed: "Same day", express: false },
  { name: "Motijheel & Dilkusha", bnName: "মতিঝিল ও দিলকুশা", zone: "dhaka_south", zoneLabel: "Dhaka South", speed: "Same day", express: false },
  { name: "Paltan, Kakrail & Malibagh", bnName: "পল্টন, কাকরাইল ও মালিবাগ", zone: "dhaka_south", zoneLabel: "Dhaka South", speed: "Same day", express: false },
  { name: "Khilgaon & Basabo", bnName: "খিলগাঁও ও বাসাবো", zone: "dhaka_south", zoneLabel: "Dhaka South", speed: "Same day", express: false },
  { name: "Old Dhaka & Sadarghat", bnName: "পুরান ঢাকা ও সদরঘাট", zone: "dhaka_south", zoneLabel: "Dhaka South", speed: "Same day", express: false },
  { name: "Jatrabari, Sayedabad & Demra", bnName: "যাত্রাবাড়ী, সায়েদাবাদ ও ডেমরা", zone: "dhaka_south", zoneLabel: "Dhaka South", speed: "Same day", express: false },
  { name: "Keraniganj", bnName: "কেরানীগঞ্জ", zone: "dhaka_south", zoneLabel: "Dhaka South", speed: "Same day", express: false },

  // Gazipur City
  { name: "Tongi & Station Road", bnName: "টঙ্গী ও স্টেশন রোড", zone: "gazipur", zoneLabel: "Gazipur City", speed: "Same day", express: false },
  { name: "Gazipur Sadar & Chowrasta", bnName: "গাজীপুর সদর ও চৌরাস্তা", zone: "gazipur", zoneLabel: "Gazipur City", speed: "Same day", express: false },
  { name: "Joydebpur", bnName: "জয়দেবপুর", zone: "gazipur", zoneLabel: "Gazipur City", speed: "Same day", express: false },
  { name: "Board Bazar & DUET", bnName: "বোর্ড বাজার ও ডুয়েট", zone: "gazipur", zoneLabel: "Gazipur City", speed: "Same day", express: false },
  { name: "Konabari & Kashimpur", bnName: "কোনাবাড়ি ও কাশিমপুর", zone: "gazipur", zoneLabel: "Gazipur City", speed: "Same day", express: false },

  // Narayanganj City
  { name: "Narayanganj Sadar", bnName: "নারায়ণগঞ্জ সদর", zone: "narayanganj", zoneLabel: "Narayanganj City", speed: "Same day", express: false },
  { name: "Chashara", bnName: "চাষাড়া", zone: "narayanganj", zoneLabel: "Narayanganj City", speed: "Same day", express: false },
  { name: "Fatullah", bnName: "ফতুল্লা", zone: "narayanganj", zoneLabel: "Narayanganj City", speed: "Same day", express: false },
  { name: "Siddhirganj & Signboard", bnName: "সিদ্ধিরগঞ্জ ও সাইনবোর্ড", zone: "narayanganj", zoneLabel: "Narayanganj City", speed: "Same day", express: false },
  { name: "Bandar", bnName: "বন্দর", zone: "narayanganj", zoneLabel: "Narayanganj City", speed: "Same day", express: false },
];

export function CoverageDirectorySection() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = ALL_AREAS.filter((a) => {
    const matchesTab = activeTab === "all" || a.zone === activeTab;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q || a.name.toLowerCase().includes(q) || a.bnName.toLowerCase().includes(q) || a.zoneLabel.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  return (
    <section id="coverage" className="py-20 bg-page dark:bg-navy-950/60 scroll-mt-10 border-t border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-brand uppercase">
            {t("Extensive Reach")}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl dark:text-white">
            {t("Complete city corporation coverage")}
          </h2>
          <p className="mt-3 text-base text-ink-2 dark:text-white/70">
            {t(
              "Covering Dhaka North, Dhaka South, Gazipur City, Narayanganj City, and our premier 3-hour express hub in Uttara."
            )}
          </p>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-surface border border-line dark:bg-navy-900 dark:border-white/10">
            {[
              { id: "all", label: t("All Areas") },
              { id: "uttara", label: t("Uttara (3h Express)") },
              { id: "dhaka_north", label: t("Dhaka North") },
              { id: "dhaka_south", label: t("Dhaka South") },
              { id: "gazipur", label: t("Gazipur City") },
              { id: "narayanganj", label: t("Narayanganj City") },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cx(
                  "rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer",
                  activeTab === tab.id
                    ? "bg-brand text-white shadow-sm"
                    : "text-ink-2 hover:bg-page hover:text-ink dark:text-white/70 dark:hover:bg-navy-800 dark:hover:text-white"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-3 dark:text-white/40" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("Search neighborhood (e.g. Mirpur, Gulshan)...")}
              className="h-10 pl-9 text-xs font-semibold"
            />
          </div>
        </div>

        {/* Areas Grid */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((area) => (
            <div
              key={area.name}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-xs transition hover:border-brand/40 hover:shadow-md dark:bg-navy-900/60 dark:border-white/10"
            >
              <div className="min-w-0 flex items-center gap-2.5">
                <div
                  className={cx(
                    "grid size-8 shrink-0 place-items-center rounded-xl",
                    area.express
                      ? "bg-brand/15 text-brand dark:bg-brand/25 dark:text-sun"
                      : "bg-navy-50 text-navy-700 dark:bg-navy-800 dark:text-white"
                  )}
                >
                  <MapPin className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs sm:text-sm font-bold text-ink dark:text-white">
                    {area.name}
                  </p>
                  <p className="text-[11px] text-ink-3 dark:text-white/50">{area.zoneLabel}</p>
                </div>
              </div>

              <span
                className={cx(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                  area.express
                    ? "bg-brand text-white shadow-xs"
                    : "bg-page text-ink-2 border border-line dark:bg-navy-950 dark:text-white/70 dark:border-white/10"
                )}
              >
                {t(area.speed)}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom Banner with Coverage Summary */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-surface border border-line p-6 dark:bg-navy-900/70 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-brand text-white shadow-md shadow-brand/30">
              <Building className="size-6" />
            </div>
            <div>
              <p className="font-extrabold text-sm sm:text-base text-ink dark:text-white">
                {t("Need delivery to any unlisted neighborhood?")}
              </p>
              <p className="text-xs text-ink-2 dark:text-white/70">
                {t("We deliver anywhere across the 3 greater metropolitan corporations 7 days a week.")}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-brand dark:text-sun">
            {t("100% Home Delivery • No Point Pickup Required")}
          </span>
        </div>
      </div>
    </section>
  );
}
