import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseOrderText,
  predictDeliveryRisk,
  normalizeBdPhone,
  convertBanglaDigitsToEnglish,
  detectDeliveryZone,
  extractAmountToCollect,
} from "./aiParser.ts";

describe("aiParser - Helper Functions", () => {
  it("converts Bangla digits to English digits", () => {
    assert.equal(convertBanglaDigitsToEnglish("০১২৩৪৫৬৭৮৯"), "0123456789");
    assert.equal(convertBanglaDigitsToEnglish("টাকা ১৫০০/-"), "টাকা 1500/-");
    assert.equal(convertBanglaDigitsToEnglish("No digits here"), "No digits here");
  });

  it("normalises Bangladeshi mobile numbers", () => {
    assert.equal(normalizeBdPhone("01712345678"), "01712345678");
    assert.equal(normalizeBdPhone("+8801819234567"), "01819234567");
    assert.equal(normalizeBdPhone("8801912345678"), "01912345678");
    assert.equal(normalizeBdPhone("01712-345678"), "01712345678");
    assert.equal(normalizeBdPhone("01314 747 084"), "01314747084");
    assert.equal(normalizeBdPhone("০১৭১২৩৪৫৬৭৮"), "01712345678");
    assert.equal(normalizeBdPhone("+৮৮০১৬১২৩৪৫৬৭৮"), "01612345678");

    // Invalid numbers
    assert.equal(normalizeBdPhone(""), null);
    assert.equal(normalizeBdPhone("01234567890"), null); // 012 is not a valid BD mobile operator
    assert.equal(normalizeBdPhone("0171234567"), null); // Only 10 digits
    assert.equal(normalizeBdPhone("12345678901"), null); // Does not start with 01
  });

  it("detects delivery zones accurately", () => {
    // Uttara
    assert.equal(detectDeliveryZone("Sector 3, Uttara, Dhaka"), "uttara");
    assert.equal(detectDeliveryZone("হাউস ১২, রোড ৫, উত্তরা, ঢাকা"), "uttara");
    assert.equal(detectDeliveryZone("Diabari metro station"), "uttara");
    assert.equal(detectDeliveryZone("Abdullahpur bus stand"), "uttara");

    // Gazipur City
    assert.equal(detectDeliveryZone("Board Bazar, Gazipur"), "gazipur_city");
    assert.equal(detectDeliveryZone("Tongi Station Road"), "gazipur_city");
    assert.equal(detectDeliveryZone("কোনাবাড়ি, গাজীপুর সদর"), "gazipur_city");
    assert.equal(detectDeliveryZone("জয়দেবপুর চৌরাস্তা"), "gazipur_city");

    // Narayanganj City
    assert.equal(detectDeliveryZone("Chashara, Narayanganj"), "narayanganj_city");
    assert.equal(detectDeliveryZone("Fatullah post office"), "narayanganj_city");
    assert.equal(detectDeliveryZone("সিদ্ধিরগঞ্জ পুল, নারায়ণগঞ্জ"), "narayanganj_city");

    // Dhaka City (default & specific areas)
    assert.equal(detectDeliveryZone("Mirpur 10, Dhaka"), "dhaka_city");
    assert.equal(detectDeliveryZone("Dhanmondi 27, Dhaka"), "dhaka_city");
    assert.equal(detectDeliveryZone("Gulshan 2 circle"), "dhaka_city");
    assert.equal(detectDeliveryZone("Unspecified location"), "dhaka_city");
  });

  it("extracts COD amounts in various formats", () => {
    assert.equal(extractAmountToCollect("COD: 1500"), 1500);
    assert.equal(extractAmountToCollect("ক্যাশ অন ডেলিভারি ১০০০ টাকা"), 1000);
    assert.equal(extractAmountToCollect("total 2,500 tk"), 2500);
    assert.equal(extractAmountToCollect("১৫০০/-"), 1500);
    assert.equal(extractAmountToCollect("৳ ৩,২০০"), 3200);
    assert.equal(extractAmountToCollect("বাকি ৫০০"), 500);
    assert.equal(extractAmountToCollect("দাম: ৮৫০"), 850);
    assert.equal(extractAmountToCollect("No payment mentioned"), null);
  });
});

describe("aiParser - parseOrderText", () => {
  it("parses structured Bengali order with labels", () => {
    const raw = `
নাম: তানভীর আহমেদ
ফোন: ০১৭১২-৩৪৫৬৭৮
ঠিকানা: বাড়ি ১২, রোড ৫, সেক্টর ৩, উত্তরা, ঢাকা
টাকা: ১৫০০ টাকা
নোট: সন্ধ্যায় ডেলিভারি দিবেন
`;
    const result = parseOrderText(raw);

    assert.equal(result.recipientName, "তানভীর আহমেদ");
    assert.equal(result.recipientPhone, "01712345678");
    assert.equal(result.deliveryAddress, "বাড়ি ১২, রোড ৫, সেক্টর ৩, উত্তরা, ঢাকা");
    assert.equal(result.zone, "uttara");
    assert.equal(result.amountToCollect, 1500);
    assert.equal(result.notes, "সন্ধ্যায় ডেলিভারি দিবেন");
  });

  it("parses structured English order with WhatsApp format", () => {
    const raw = `
Name: Rahim Uddin
Phone: +8801819234567
Address: Flat 4B, House 10, Road 2, Block D, Mirpur 1, Dhaka
COD: 1200 tk
Note: Call before delivery
`;
    const result = parseOrderText(raw);

    assert.equal(result.recipientName, "Rahim Uddin");
    assert.equal(result.recipientPhone, "01819234567");
    assert.equal(result.deliveryAddress, "Flat 4B, House 10, Road 2, Block D, Mirpur 1, Dhaka");
    assert.equal(result.zone, "dhaka_city");
    assert.equal(result.amountToCollect, 1200);
    assert.equal(result.notes, "Call before delivery");
  });

  it("parses Gazipur City customer order with Bengali characters", () => {
    const raw = `
কাস্টমারঃ সোহেল রানা
মোবাইলঃ ০১৯৮৭৬৫৪৩২১
ঠিকানাঃ কোনাবাড়ি বাজার, গাজীপুর সদর
ক্যাশ অন ডেলিভারি ২০০০ টাকা
জরুরী ডেলিভারি
`;
    const result = parseOrderText(raw);

    assert.equal(result.recipientName, "সোহেল রানা");
    assert.equal(result.recipientPhone, "01987654321");
    assert.equal(result.zone, "gazipur_city");
    assert.equal(result.deliveryAddress, "কোনাবাড়ি বাজার, গাজীপুর সদর");
    assert.equal(result.amountToCollect, 2000);
    assert.equal(result.notes, "জরুরী ডেলিভারি");
  });

  it("parses Narayanganj City unlabeled order", () => {
    const raw = `
Anika Rahman
01552334455
Chashara, Narayanganj
850/-
deliver in the evening please
`;
    const result = parseOrderText(raw);

    assert.equal(result.recipientName, "Anika Rahman");
    assert.equal(result.recipientPhone, "01552334455");
    assert.equal(result.zone, "narayanganj_city");
    assert.equal(result.deliveryAddress, "Chashara, Narayanganj");
    assert.equal(result.amountToCollect, 850);
    assert.equal(result.notes, "deliver in the evening please");
  });

  it("parses single-line comma-separated order", () => {
    const raw = "Nusrat Jahan, 01314747084, Road 11 Banani Dhaka, 500 tk";
    const result = parseOrderText(raw);

    assert.equal(result.recipientName, "Nusrat Jahan");
    assert.equal(result.recipientPhone, "01314747084");
    assert.equal(result.zone, "dhaka_city");
    assert.equal(result.deliveryAddress, "Road 11 Banani Dhaka");
    assert.equal(result.amountToCollect, 500);
  });

  it("does not confuse house/road numbers with COD amount", () => {
    const raw = `
Customer: MD Arif
Mobile: 01700000001
Address: House 24, Road 12, Sector 11, Uttara
Note: Call before arrival
`;
    const result = parseOrderText(raw);

    assert.equal(result.recipientName, "MD Arif");
    assert.equal(result.recipientPhone, "01700000001");
    assert.equal(result.zone, "uttara");
    assert.equal(result.amountToCollect, null);
    assert.equal(result.notes, "Call before arrival");
  });

  it("handles empty or whitespace-only inputs gracefully", () => {
    const result = parseOrderText("");
    assert.equal(result.recipientPhone, null);
    assert.equal(result.recipientName, null);
    assert.equal(result.zone, "dhaka_city");
    assert.equal(result.deliveryAddress, null);
    assert.equal(result.amountToCollect, null);
    assert.equal(result.notes, null);
  });
});

describe("aiParser - predictDeliveryRisk", () => {
  it("flags invalid phone numbers with high risk", () => {
    const result = predictDeliveryRisk({
      phone: "12345",
      codAmount: 1000,
    });

    assert.equal(result.riskLevel, "high");
    assert.equal(result.score, 95);
    assert.ok(result.reasons[0].includes("Invalid or unrecognized Bangladesh mobile phone number"));
  });

  it("evaluates first-time recipient with high COD as high risk", () => {
    const result = predictDeliveryRisk({
      phone: "01712345678",
      codAmount: 5000,
    });

    assert.equal(result.riskLevel, "high");
    assert.ok(result.score >= 60);
    assert.ok(result.reasons.some((r) => r.includes("First-time recipient with high COD amount")));
    assert.ok(result.recommendation.includes("advance"));
  });

  it("evaluates first-time recipient with moderate COD as medium risk", () => {
    const result = predictDeliveryRisk({
      phone: "01712345678",
      codAmount: 2000,
    });

    assert.equal(result.riskLevel, "medium");
    assert.ok(result.score >= 30 && result.score < 60);
    assert.ok(result.reasons.some((r) => r.includes("First-time recipient with moderate COD amount")));
  });

  it("evaluates first-time recipient with low or zero COD as low risk", () => {
    const result = predictDeliveryRisk({
      phone: "01712345678",
      codAmount: 400,
    });

    assert.equal(result.riskLevel, "low");
    assert.ok(result.score < 30);
    assert.ok(result.reasons.some((r) => r.includes("First-time recipient with low COD amount")));
  });

  it("evaluates customer with severe past return history as high risk", () => {
    const result = predictDeliveryRisk({
      phone: "01812345678",
      codAmount: 2500,
      totalOrders: 10,
      successRate: 30, // 70% return rate
    });

    assert.equal(result.riskLevel, "high");
    assert.ok(result.score >= 70);
    assert.ok(result.reasons.some((r) => r.includes("High return history")));
  });

  it("evaluates customer with moderate return history and high COD as high risk", () => {
    const result = predictDeliveryRisk({
      phone: "01912345678",
      codAmount: 4500,
      totalOrders: 6,
      successRate: 60,
    });

    assert.equal(result.riskLevel, "high");
    assert.ok(result.reasons.some((r) => r.includes("Past return history")));
  });

  it("evaluates verified customer with high success rate as low risk", () => {
    const result = predictDeliveryRisk({
      phone: "01312345678",
      codAmount: 1500,
      totalOrders: 12,
      successRate: 95,
    });

    assert.equal(result.riskLevel, "low");
    assert.ok(result.score <= 15);
    assert.ok(result.reasons.some((r) => r.includes("Verified customer")));
    assert.ok(result.recommendation.includes("Safe to dispatch"));
  });

  it("evaluates verified customer with high COD still maintaining low risk", () => {
    const result = predictDeliveryRisk({
      phone: "01612345678",
      codAmount: 6000,
      totalOrders: 8,
      successRate: 92,
    });

    assert.equal(result.riskLevel, "low");
    assert.ok(result.reasons.some((r) => r.includes("proven delivery track record")));
  });
});
