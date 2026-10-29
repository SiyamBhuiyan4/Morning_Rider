/**
 * Smart AI automation & NLP parser for Morning Rider logistics.
 * Pure TypeScript functions with zero external dependencies.
 */

export type DeliveryZone = "uttara" | "dhaka_city" | "gazipur_city" | "narayanganj_city";

export type DeliveryRiskLevel = "low" | "medium" | "high";

export interface ParsedOrder {
  recipientPhone: string | null;
  recipientName: string | null;
  zone: DeliveryZone;
  deliveryAddress: string | null;
  amountToCollect: number | null;
  notes: string | null;
}

export interface DeliveryRiskInput {
  phone: string;
  codAmount: number;
  successRate?: number;
  totalOrders?: number;
}

export interface DeliveryRiskResult {
  riskLevel: DeliveryRiskLevel;
  score: number; // 0 (safest) to 100 (highest risk)
  reasons: string[];
  recommendation: string;
}

// Map Bengali digits ০-৯ to ASCII 0-9
const BANGLA_TO_ENGLISH_DIGITS: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

/**
 * Converts Bengali numeric characters to ASCII digits.
 */
export function convertBanglaDigitsToEnglish(input: string): string {
  return input.replace(/[০-৯]/g, (digit) => BANGLA_TO_ENGLISH_DIGITS[digit] ?? digit);
}

/**
 * Normalises a Bangladeshi mobile number into standard 11-digit `01XXXXXXXXX` format.
 * Accepts: `+88017...`, `88017...`, `017...`, `০১৭১...`, with dashes/spaces.
 * Returns null if the number does not form a valid 11-digit Bangladesh mobile number.
 */
export function normalizeBdPhone(raw: string): string | null {
  if (!raw) return null;
  const converted = convertBanglaDigitsToEnglish(raw);
  const digits = converted.replace(/\D/g, "");
  const local = digits.startsWith("880") ? "0" + digits.slice(3) : digits;
  if (/^01[3-9]\d{8}$/.test(local)) {
    return local;
  }
  return null;
}

/**
 * Determines delivery zone based on address and location keywords.
 * Morning Rider operates 4 distinct service zones:
 * - `uttara`: 3-hour express delivery (Uttara sectors, Diabari, Abdullahpur, etc.)
 * - `gazipur_city`: Same-day Gazipur City (Tongi, Joydebpur, Board Bazar, Konabari, etc.)
 * - `narayanganj_city`: Same-day Narayanganj City (Chashara, Fatullah, Siddhirganj, etc.)
 * - `dhaka_city`: Same-day Dhaka City Corporation areas (Mirpur, Dhanmondi, Gulshan, etc.)
 */
export function detectDeliveryZone(text: string): DeliveryZone {
  if (!text) return "dhaka_city";
  const normalized = convertBanglaDigitsToEnglish(text.normalize("NFC")).toLowerCase();

  // 1. Uttara zone (express 3-hour area)
  const uttaraRegex =
    /\b(?:uttara|uttora|diabari|diyabari|abdullahpur|azampur|jasimuddin|rajlakshmi|house\s*building)\b|উত্তরা|দিয়াবাড়ি|দিয়াবাড়ী|আব্দুল্লাহপুর|আজমপুর|রাজলক্ষ্মী|জসীমউদ্দীন|সেক্টর\s*(?:[১-৯]|১০|১১|১২|১৩|১৪|১৫|১৬|১৭|১৮)|\bsector\s*(?:[1-9]|1[0-8])\b/i;
  if (uttaraRegex.test(normalized)) {
    return "uttara";
  }

  // 2. Gazipur City zone
  const gazipurRegex =
    /\b(?:gazipur|tongi|joydebpur|board\s*bazar|konabari|kashimpur|chowrasta|chourasta|salna|cherag\s*ali|chandana)\b|গাজীপুর|টঙ্গী|টঙ্গি|জয়দেবপুর|বোর্ড\s*বাজার|কোনাবাড়ি|কোনাবাড়ী|কাশিমপুর|চৌরাস্তা|সালনা|চেরাগ\s*আলী/i;
  if (gazipurRegex.test(normalized)) {
    return "gazipur_city";
  }

  // 3. Narayanganj City zone
  const narayanganjRegex =
    /\b(?:narayanganj|narayangonj|chashara|chasara|fatullah|fatulla|siddhirganj|shiddhirganj|kanchpur|pagla|godnail|madanganj)\b|নারায়ণগঞ্জ|নারায়নগঞ্জ|চাষাড়া|চাষাড়া|ফতুল্লা|সিদ্ধিরগঞ্জ|কাঁচপুর|পাগলা|মদনগঞ্জ/i;
  if (narayanganjRegex.test(normalized)) {
    return "narayanganj_city";
  }

  // 4. Default to Dhaka City
  return "dhaka_city";
}

/**
 * Extracts Cash On Delivery (COD) amount to collect from freeform text.
 * Supports: '১০০০ টাকা', '1500 tk', 'cod 500', '৳ ১,২০০', '১২৫০/-', etc.
 */
export function extractAmountToCollect(text: string): number | null {
  if (!text) return null;
  const converted = convertBanglaDigitsToEnglish(text);

  // 1. Explicit COD or collection keywords: e.g. "COD: 1500", "ক্যাশ অন ডেলিভারি ১০০০", "Collect 1200"
  const explicitCodMatch = converted.match(
    /(?:cod|cash\s*on\s*delivery|ক্যাশ\s*অন\s*ডেলিভারি|কড|সিওডি|collect|amount\s*to\s*collect|বাকি|due)[:\s\-\–—]*৳?\s*(\d[\d,]*)(?!\d)/i,
  );
  if (explicitCodMatch) {
    const val = Number(explicitCodMatch[1].replace(/,/g, ""));
    if (!Number.isNaN(val) && val >= 0 && val <= 500000) return val;
  }

  // 2. Total / Bill / Price / টাকা labels: e.g. "টাকা: ১৫০০", "মোট: ১২০০", "Price: 850", "Total: 2500"
  const labelAmountMatch = converted.match(
    /(?:মোট\s*টাকা|মোট|দাম|মূল্য|বিল|টাকা|total|bill|price|amount)[:\s\-\–—]+৳?\s*(\d[\d,]*)(?!\d)/i,
  );
  if (labelAmountMatch) {
    const val = Number(labelAmountMatch[1].replace(/,/g, ""));
    if (!Number.isNaN(val) && val >= 0 && val <= 500000) return val;
  }

  // 3. Amount with currency suffix: e.g. "1500 tk", "1500 taka", "১৫০০ টাকা", "1500/-", "1500tk"
  // Exclude address qualifiers like road/house/sector/flat
  const suffixMatches = converted.matchAll(/(?<!(?:road|house|sector|flat|রোড|বাড়ি|সেক্টর|ফ্ল্যাট)\s*)(\d[\d,]*)\s*(?:tk|taka|টাকা|bdt|\/-)/gi);
  for (const match of suffixMatches) {
    const val = Number(match[1].replace(/,/g, ""));
    if (!Number.isNaN(val) && val >= 10 && val <= 500000) {
      return val;
    }
  }

  // 4. Amount with currency prefix: e.g. "৳ 1500", "৳১৫০০", "BDT 1500"
  const prefixMatch = converted.match(/(?:৳|bdt)\s*(\d[\d,]*)(?!\d)/i);
  if (prefixMatch) {
    const val = Number(prefixMatch[1].replace(/,/g, ""));
    if (!Number.isNaN(val) && val >= 10 && val <= 500000) return val;
  }

  return null;
}

/**
 * Extracts delivery instructions/notes from text.
 */
function extractNotes(text: string): string | null {
  if (!text) return null;

  // Explicit label: Note: / নোট: / Instructions: / মন্তব্য:
  const labeledMatch = text.match(
    /(?:নোট|মন্তব্য|বিশেষ\s*নির্দেশ(?:না)?|বিশেষ\s*দ্রষ্টব্য|note|notes|instructions?|remarks?)[:\s\-\–—ঃ।|*]+([^\n\r]+)/i,
  );
  if (labeledMatch) {
    const note = labeledMatch[1].trim();
    if (note.length > 0) return note;
  }

  // Pattern-based customer instructions:
  const instructionPatterns = [
    /(?:জরুরী|জরুরি|urgent)[^\n\r,.]*(?:ডেলিভারি|delivery)?/i,
    /(?:সন্ধ্যায়|সন্ধ্যায়|সকালে|বিকেলে|রাতে|শুক্রবার|অফিস\s*টাইমে)[^\n\r,.]*(?:ডেলিভারি|দিবেন|করবেন|পৌঁছে|পাঠাবেন)/i,
    /(?:ডেলিভারির?\s*আগে|আসার\s*আগে|ডেলিভারি\s*দেয়ার\s*আগে)[^\n\r,.]*(?:ফোন|কল|জানাবেন)/i,
    /(?:বিকেলের|সন্ধ্যায়|সন্ধ্যায়|সকালে)[^\n\r,.]*(?:পর|আগে)[^\n\r,.]*(?:ফোন|কল)[^\n\r,.]*/i,
    /\b(?:call\s*(?:before|prior\s*to)\s*(?:delivery|coming|arrival)|deliver\s*(?:in\s*the\s*evening|in\s*morning|on\s*friday|after\s*\d+)|fragile|handle\s*with\s*care|urgent\s*delivery)\b[^\n\r]*/i,
  ];

  for (const pattern of instructionPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return null;
}

/**
 * Cleans extracted address text by stripping labels, duplicate punctuation, and trimming.
 */
function cleanAddress(raw: string): string {
  return raw
    .replace(/^(?:ঠিকানা|ডেলিভারি\s*ঠিকানা|প্রাপকের\s*ঠিকানা|লোকেশন|address|delivery\s*address|location)[:\s\-\–—ঃ।|*]+/i, "")
    .replace(/^[,.\s\-\–—ঃ।|*]+|[,.\s\-\–—ঃ।|*]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Cleans extracted customer name.
 */
function cleanName(raw: string): string {
  return raw
    .replace(/^(?:নাম|গ্রাহক(?:\s*নাম)?|কাস্টমার(?:\s*নাম)?|প্রাপক(?:\s*নাম)?|ক্রেতা(?:\s*নাম)?|name|customer(?:\s*name)?|recipient(?:\s*name)?)[:\s\-\–—ঃ।|*]+/i, "")
    .replace(/^[,.\s\-\–—ঃ।|*]+|[,.\s\-\–—ঃ।|*]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Parses unstructured customer order text (copied from Facebook, WhatsApp, SMS, or forms).
 * Extracts phone, customer name, delivery zone, delivery address, COD amount, and notes.
 *
 * @param text Unstructured freeform order text in Bengali or English.
 * @returns Parsed order details with normalized values.
 */
export function parseOrderText(text: string): ParsedOrder {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return {
      recipientPhone: null,
      recipientName: null,
      zone: "dhaka_city",
      deliveryAddress: null,
      amountToCollect: null,
      notes: null,
    };
  }

  const rawText = text.normalize("NFC").trim();
  const convertedText = convertBanglaDigitsToEnglish(rawText);

  // 1. Extract Phone Number
  let recipientPhone: string | null = null;

  // 1a. Try explicit phone label
  const phoneLabelMatch = rawText.match(
    /(?:মোবাইল(?:\s*নাম্বার)?|ফোন(?:\s*নাম্বার)?|নম্বর|যোগাযোগ|phone|mobile|cell|contact|tel|whatsapp)[:\s\-\–—]*([+০-৯\d\s\-()]{10,25})/i,
  );
  if (phoneLabelMatch) {
    recipientPhone = normalizeBdPhone(phoneLabelMatch[1]);
  }

  // 1b. If not found via label, search whole text for any 11-digit Bangladesh phone pattern
  if (!recipientPhone) {
    const generalPhoneMatches = convertedText.matchAll(/(?:\+?88\s*[-.]?\s*)?(01[3-9][\d\s\-.]{8,15}\b)/g);
    for (const match of generalPhoneMatches) {
      const candidate = normalizeBdPhone(match[1]);
      if (candidate) {
        recipientPhone = candidate;
        break;
      }
    }
  }

  // 2. Extract COD Amount
  const amountToCollect = extractAmountToCollect(rawText);

  // 3. Extract Customer Notes / Instructions
  const notes = extractNotes(rawText);

  // 4. Extract Name and Address
  let recipientName: string | null = null;
  let deliveryAddress: string | null = null;

  // 4a. Check for explicitly labeled Name
  const labeledNameMatch = rawText.match(
    /(?:নাম|গ্রাহক(?:\s*নাম)?|কাস্টমার(?:\s*নাম)?|প্রাপক(?:\s*নাম)?|ক্রেতা(?:\s*নাম)?|name|customer(?:\s*name)?|recipient(?:\s*name)?)[:\s\-\–—ঃ।|*]+([^\n\r,]+)/i,
  );
  if (labeledNameMatch) {
    const candidateName = cleanName(labeledNameMatch[1]);
    // Ensure it's not a phone number or amount accidentally matched
    if (!/^\d+$/.test(candidateName) && candidateName.length >= 2) {
      recipientName = candidateName;
    }
  }

  // 4b. Check for explicitly labeled Address
  const labeledAddressMatch = rawText.match(
    /(?:ঠিকানা|ডেলিভারি\s*ঠিকানা|প্রাপকের\s*ঠিকানা|লোকেশন|address|delivery\s*address|location)[:\s\-\–—ঃ।|*]+([\s\S]+?)(?=\n\s*(?:phone|mobile|cell|contact|ফোন|মোবাইল|নম্বর|যোগাযোগ|টাকা|cod|কড|দাম|নোট|note|instruction)|$)/i,
  );
  if (labeledAddressMatch) {
    deliveryAddress = cleanAddress(labeledAddressMatch[1].split(/\n/)[0]);
  }

  // 4c. Line-by-line fallback for unlabeled / semi-structured texts
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const addressKeywords =
    /(?:house|road|sector|block|lane|avenue|flat|holding|village|thana|district|bazar|market|city|area|dhaka|uttara|gazipur|tongi|joydebpur|narayanganj|narayangonj|chashara|fatullah|siddhirganj|mirpur|dhanmondi|gulshan|banani|mohammadpur|বাড়ি|রোড|রাস্তা|সেক্টর|ব্লক|ফ্ল্যাট|লেন|হোল্ডিং|গ্রাম|থানা|জেলা|বাজার|মার্কেট|ঢাকা|উত্তরা|মিরপুর|গাজীপুর|টঙ্গী|জয়দেবপুর|নারায়ণগঞ্জ|নারায়নগঞ্জ|চাষাড়া|সিদ্ধিরগঞ্জ|ধানমন্ডি|গুলশান|বনানী|মোহাম্মদপুর)/i;

  const orderLineKeywords =
    /(?:phone|mobile|cell|contact|ফোন|মোবাইল|টাকা|cod|দাম|নোট|note|instruction|বাকি|bill|price)/i;

  if (!recipientName || !deliveryAddress) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isPhoneLine = recipientPhone && convertBanglaDigitsToEnglish(line).replace(/\D/g, "").includes(recipientPhone.slice(2));
      const isAmountLine = amountToCollect !== null && convertBanglaDigitsToEnglish(line).includes(String(amountToCollect));
      const isNoteLine = notes && line.includes(notes);

      // Potential Name line: usually 1st or 2nd line, short (2-40 chars), no address keywords, not phone/amount/note
      if (
        !recipientName &&
        !isPhoneLine &&
        !isAmountLine &&
        !isNoteLine &&
        !addressKeywords.test(line) &&
        !orderLineKeywords.test(line) &&
        line.length >= 2 &&
        line.length <= 45 &&
        !/^\d+$/.test(line.replace(/\s/g, ""))
      ) {
        recipientName = cleanName(line);
        continue;
      }

      // Potential Address line: has address keywords and is not phone/amount/note
      if (
        !deliveryAddress &&
        !isPhoneLine &&
        !isAmountLine &&
        !isNoteLine &&
        addressKeywords.test(line) &&
        !line.match(/^(?:name|customer|নাম|গ্রাহক)[:\s]/i)
      ) {
        deliveryAddress = cleanAddress(line);
      }
    }
  }

  // 4d. Fallback for single-line comma-separated orders (e.g., "Rahim, 01712345678, Uttara Sector 3, 1000 tk")
  if ((!recipientName || !deliveryAddress) && lines.length === 1 && rawText.includes(",")) {
    const parts = rawText.split(",").map((p) => p.trim());
    for (const part of parts) {
      if (!recipientName && !normalizeBdPhone(part) && !addressKeywords.test(part) && !extractAmountToCollect(part) && part.length >= 2) {
        recipientName = cleanName(part);
      } else if (!deliveryAddress && addressKeywords.test(part)) {
        deliveryAddress = cleanAddress(part);
      }
    }
  }

  // 5. Determine Delivery Zone
  // Zone is extracted primarily from the delivery address; if address is absent, search entire text
  const zone = detectDeliveryZone(deliveryAddress || rawText);

  return {
    recipientPhone,
    recipientName,
    zone,
    deliveryAddress,
    amountToCollect,
    notes,
  };
}

/**
 * Evaluates the delivery risk level of a parcel based on customer phone, COD amount,
 * and historical delivery track record.
 *
 * @param input Evaluation parameters: recipient phone, COD amount, and optional delivery metrics.
 * @returns Risk assessment ('low', 'medium', 'high') with comprehensive rationale and recommendations.
 */
export function predictDeliveryRisk({
  phone,
  codAmount,
  successRate,
  totalOrders,
}: DeliveryRiskInput): DeliveryRiskResult {
  const reasons: string[] = [];
  const normalizedPhone = normalizeBdPhone(phone);

  // 1. Check for Invalid or Suspicious Phone Number
  if (!normalizedPhone) {
    return {
      riskLevel: "high",
      score: 95,
      reasons: ["Invalid or unrecognized Bangladesh mobile phone number format"],
      recommendation: "Do not dispatch. Confirm a valid 11-digit mobile number (01XXXXXXXXX) with customer.",
    };
  }

  const cod = Math.max(0, codAmount || 0);
  const isFirstTimeCustomer = totalOrders === undefined || totalOrders === 0 || successRate === undefined;

  // 2. First-time Recipient Evaluation (no delivery record on file)
  if (isFirstTimeCustomer) {
    if (cod >= 4000) {
      reasons.push(`First-time recipient with high COD amount (৳${cod})`);
      reasons.push("No prior delivery history on record");
      return {
        riskLevel: "high",
        score: 75,
        reasons,
        recommendation: "Take delivery charge or partial payment in advance before dispatching high-value COD.",
      };
    }

    if (cod >= 1500) {
      reasons.push(`First-time recipient with moderate COD amount (৳${cod})`);
      reasons.push("No prior delivery history on record");
      return {
        riskLevel: "medium",
        score: 45,
        reasons,
        recommendation: "Call customer to verify address and confirm readiness before dispatch.",
      };
    }

    // Low COD (or prepaid / ৳0) for new customer
    reasons.push(`First-time recipient with low COD amount (৳${cod})`);
    reasons.push("Minimal financial exposure if delivery is refused");
    return {
      riskLevel: "low",
      score: 25,
      reasons,
      recommendation: "Safe to dispatch with standard delivery.",
    };
  }

  // 3. Established Recipient with Historical Orders
  const rate = Math.max(0, Math.min(100, Math.round(successRate)));
  const orders = totalOrders;

  // 3a. Severe return history (< 50% success rate)
  if (rate < 50) {
    reasons.push(`High return history: only ${rate}% delivery success rate across ${orders} past orders`);
    if (cod >= 2000) {
      reasons.push(`High COD amount (৳${cod}) elevates financial risk for frequent returner`);
    }
    return {
      riskLevel: "high",
      score: 85,
      reasons,
      recommendation: "High return probability. Require advance delivery payment or confirm via phone prior to dispatch.",
    };
  }

  // 3b. Moderate return history (50% - 74% success rate)
  if (rate < 75) {
    const returnRate = 100 - rate;
    reasons.push(`Past return history: ${returnRate}% of previous ${orders} orders were returned or cancelled`);

    if (cod >= 3500) {
      reasons.push(`High COD amount (৳${cod}) further elevates order risk`);
      return {
        riskLevel: "high",
        score: 65,
        reasons,
        recommendation: "Call customer to re-confirm order items and address before handing to rider.",
      };
    }

    return {
      riskLevel: "medium",
      score: 50,
      reasons,
      recommendation: "Call customer to confirm delivery time and availability before dispatch.",
    };
  }

  // 3c. Good reliability (75% - 89% success rate)
  if (rate < 90) {
    reasons.push(`Reliable customer with ${rate}% delivery success rate across ${orders} orders`);

    if (cod >= 8000) {
      reasons.push(`Exceptionally high COD amount (৳${cod}) warrants pre-dispatch phone verification`);
      return {
        riskLevel: "medium",
        score: 40,
        reasons,
        recommendation: "Call customer to verify high-value parcel dispatch.",
      };
    }

    return {
      riskLevel: "low",
      score: 20,
      reasons,
      recommendation: "Safe to dispatch with standard delivery.",
    };
  }

  // 3d. Verified customer (>= 90% success rate)
  if (orders >= 3) {
    reasons.push(`Verified customer with excellent delivery history (${rate}% success across ${orders} orders)`);
  } else {
    reasons.push(`Reliable customer with ${rate}% delivery success rate`);
  }

  if (cod >= 5000) {
    reasons.push(`High COD amount (৳${cod}), but customer has proven delivery track record`);
  }

  return {
    riskLevel: "low",
    score: Math.max(5, Math.min(15, 20 - Math.min(10, orders))),
    reasons,
    recommendation: "Safe to dispatch; verified customer with trusted delivery track record.",
  };
}
