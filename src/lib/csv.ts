/** RFC 4180-style CSV parser: quoted fields, escaped quotes, CRLF, and a leading BOM. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  picked_up: "Picked up",
  at_hub: "At hub",
  out_for_delivery: "Out for delivery",
  hold: "On hold",
  delivered: "Delivered",
  partial_delivered: "Partial delivered",
  returning: "Returning",
  returned: "Returned",
  cancelled: "Cancelled",
};

const ZONE_LABELS: Record<string, string> = {
  uttara: "Uttara",
  dhaka_city: "Dhaka City",
  gazipur_city: "Gazipur City",
  narayanganj_city: "Narayanganj City",
};

const SETTLEMENT_LABELS: Record<string, string> = {
  open: "Open",
  unpaid: "Unpaid",
  paid: "Paid",
};

export interface ParcelExportData {
  headers: string[];
  values: (string | number | boolean | null | undefined)[];
  row: (string | number | boolean | null | undefined)[];
  [Symbol.iterator](): Generator<string[] | (string | number | boolean | null | undefined)[], void, unknown>;
}

/**
 * Maps a parcel object to a clean array of headers and values for CSV download.
 *
 * Supports destructuring as:
 * - object: `const { headers, values } = formatParcelForExport(parcel)`
 * - object: `const { headers, row } = formatParcelForExport(parcel)`
 * - tuple: `const [headers, values] = formatParcelForExport(parcel)`
 */
export function formatParcelForExport(
  parcel: any,
  t?: (key: string) => string
): ParcelExportData {
  const tr = t ?? ((key: string) => key);
  const p = parcel || {};

  const headers = [
    tr("Tracking ID"),
    tr("Invoice"),
    tr("Customer Name"),
    tr("Customer Phone"),
    tr("Address"),
    tr("Area"),
    tr("Zone"),
    tr("Category"),
    tr("Weight (kg)"),
    tr("COD Amount"),
    tr("Collected Amount"),
    tr("Delivery Charge"),
    tr("COD Charge"),
    tr("Return Charge"),
    tr("Status"),
    tr("Settlement"),
    tr("Item Description"),
    tr("Note"),
    tr("Created At"),
  ];

  let createdAtFormatted = "";
  if (p.createdAt) {
    try {
      const d = new Date(p.createdAt);
      if (!isNaN(d.getTime())) {
        createdAtFormatted = d.toISOString().replace("T", " ").replace(/\..+/, "");
      } else {
        createdAtFormatted = String(p.createdAt);
      }
    } catch {
      createdAtFormatted = String(p.createdAt);
    }
  }

  const statusStr = p.status ? tr(STATUS_LABELS[p.status] ?? p.status) : "";
  const zoneStr = p.zone ? tr(ZONE_LABELS[p.zone] ?? p.zone) : "";
  const settlementStr = p.settlement ? tr(SETTLEMENT_LABELS[p.settlement] ?? p.settlement) : "";
  const categoryStr = p.category ? tr(p.category) : "";

  const values: (string | number | boolean | null | undefined)[] = [
    p.trackingCode ?? p.trackingId ?? p.code ?? "",
    p.invoice ?? "",
    p.recipientName ?? p.customerName ?? p.name ?? "",
    p.recipientPhone ?? p.customerPhone ?? p.phone ?? "",
    p.recipientAddress ?? p.address ?? "",
    p.district ?? p.area ?? "",
    zoneStr,
    categoryStr,
    p.weightKg ?? p.weight ?? 0,
    p.codAmount ?? 0,
    p.collectedAmount ?? 0,
    p.deliveryCharge ?? 0,
    p.codCharge ?? 0,
    p.returnCharge ?? 0,
    statusStr,
    settlementStr,
    p.itemDescription ?? p.item ?? "",
    p.note ?? "",
    createdAtFormatted,
  ];

  return {
    headers,
    values,
    row: values,
    *[Symbol.iterator]() {
      yield headers;
      yield values;
    },
  };
}

/**
 * Export tabular data as a CSV file and trigger download in the browser.
 *
 * Features:
 * - Properly prepends UTF-8 BOM (\uFEFF) so Bengali text (বাংলা) displays perfectly
 *   in Microsoft Excel, Google Sheets, and LibreOffice.
 * - Escapes double quotes (" -> "") and wraps fields in double quotes if they contain
 *   commas, newlines, or quotes.
 * - Creates an invisible <a> element with Object URL, triggers download, and cleans up the URL.
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const formatCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines: string[] = [];
  if (headers && headers.length > 0) {
    lines.push(headers.map(formatCell).join(","));
  }
  for (const row of rows) {
    lines.push(row.map(formatCell).join(","));
  }

  // Prepend UTF-8 BOM (\uFEFF) for proper Bengali (বাংলা) font rendering in Excel/Sheets
  const csvContent = "\uFEFF" + lines.join("\r\n");

  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.style.display = "none";
  a.style.visibility = "hidden";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
