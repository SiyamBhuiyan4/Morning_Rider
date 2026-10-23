import { useEffect, useState } from "react";

export const TELEGRAM_BOT_TOKEN = "8819171458:AAHd3_pjEj2tEYfuB1zgJkznnSqPsisB6p0";
export const TELEGRAM_CHAT_ID = "-1004253971473";
export const TELEGRAM_PREFIX = "tg:";
export const CACHE_TTL_MS = 50 * 60 * 1000; // 50 minutes (Telegram links expire in ~1-2 hours)

// Backward compatibility constants
const BOT_TOKEN = TELEGRAM_BOT_TOKEN;
const CHAT_ID = TELEGRAM_CHAT_ID;

export interface TelegramUploadResult {
  fileId: string;
  url: string;
  storageId: string;
}

export interface CachedFileUrl {
  url: string;
  expiresAt: number;
}

// In-memory cache mapping fileId -> { url, expiresAt }
const urlCache = new Map<string, CachedFileUrl>();

// Deduplication map for pending in-flight getFile requests
const inFlightRequests = new Map<string, Promise<string>>();

// Reverse lookup mapping telegram file direct download URL -> fileId
const urlToFileId = new Map<string, string>();

/**
 * Formats a raw Telegram file_id into a unified storage identifier: "tg:<fileId>"
 */
export function formatTelegramIdentifier(fileId: string): string {
  if (!fileId) return "";
  return fileId.startsWith(TELEGRAM_PREFIX) ? fileId : `${TELEGRAM_PREFIX}${fileId}`;
}

/**
 * Checks if a given string is a Telegram storage identifier or raw file_id.
 */
export function isTelegramIdentifier(identifierOrUrl: string): boolean {
  if (!identifierOrUrl || typeof identifierOrUrl !== "string") return false;
  const trimmed = identifierOrUrl.trim();
  if (trimmed.startsWith(TELEGRAM_PREFIX)) return true;
  if (trimmed.startsWith("BQAC") || trimmed.startsWith("AgAC") || trimmed.startsWith("BAAC")) return true;
  if (trimmed.includes("api.telegram.org/file/bot")) return true;
  return false;
}

/**
 * Extracts a clean Telegram fileId from an identifier or known Telegram URL.
 */
export function extractTelegramFileId(identifierOrUrl: string): string | null {
  if (!identifierOrUrl || typeof identifierOrUrl !== "string") return null;
  const trimmed = identifierOrUrl.trim();
  if (trimmed.startsWith(TELEGRAM_PREFIX)) {
    return trimmed.slice(TELEGRAM_PREFIX.length);
  }
  if (trimmed.startsWith("BQAC") || trimmed.startsWith("AgAC") || trimmed.startsWith("BAAC")) {
    return trimmed;
  }
  if (urlToFileId.has(trimmed)) {
    return urlToFileId.get(trimmed) ?? null;
  }
  return null;
}

/**
 * Synchronously retrieves cached Telegram URL if available and unexpired.
 */
export function getCachedTelegramUrl(fileId: string): string | null {
  const cleanId = fileId.startsWith(TELEGRAM_PREFIX) ? fileId.slice(TELEGRAM_PREFIX.length) : fileId;
  const entry = urlCache.get(cleanId);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.url;
  }
  return null;
}

/**
 * Clears the in-memory CDN cache (useful for testing or cache resets).
 */
export function clearTelegramCdnCache(): void {
  urlCache.clear();
  inFlightRequests.clear();
  urlToFileId.clear();
}

/**
 * Fetches the latest live URL for any Telegram file_id.
 * Caches results in memory for 50 minutes to avoid spamming Telegram getFile.
 * Deduplicates concurrent requests for the same fileId.
 * Falls back to expired cached URL on network failure if available.
 */
export async function getTelegramFileUrl(fileId: string): Promise<string> {
  if (!fileId || typeof fileId !== "string") {
    throw new Error("Invalid Telegram fileId provided");
  }

  const cleanId = fileId.startsWith(TELEGRAM_PREFIX) ? fileId.slice(TELEGRAM_PREFIX.length) : fileId;

  // 1. Check valid in-memory cache
  const cached = urlCache.get(cleanId);
  const now = Date.now();
  if (cached && now < cached.expiresAt) {
    return cached.url;
  }

  // 2. Check if a request for this fileId is currently in flight
  const existingPromise = inFlightRequests.get(cleanId);
  if (existingPromise) {
    return existingPromise;
  }

  // 3. Initiate getFile request
  const fetchPromise = (async () => {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(cleanId)}`
      );

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`Telegram getFile failed (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      if (!data.ok || !data.result?.file_path) {
        throw new Error(data.description || "Telegram did not return a valid file_path");
      }

      const filePath = data.result.file_path;
      const directUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

      const expiresAt = Date.now() + CACHE_TTL_MS;
      urlCache.set(cleanId, { url: directUrl, expiresAt });
      urlToFileId.set(directUrl, cleanId);

      return directUrl;
    } catch (err) {
      // Fallback: If network issue occurs and we have a stale cached URL, return it
      if (cached && cached.url) {
        console.warn(`[telegramCdn] Fetch failed for ${cleanId}, using stale cached URL:`, err);
        return cached.url;
      }
      throw err;
    } finally {
      inFlightRequests.delete(cleanId);
    }
  })();

  inFlightRequests.set(cleanId, fetchPromise);
  return fetchPromise;
}

/**
 * Resolves any media identifier or URL into a live, accessible media URL:
 * - Direct http/https URLs (Cloudinary, Convex storage, S3, etc.) return immediately.
 * - Telegram identifiers ("tg:<fileId>" or raw file_ids) are resolved via Telegram API (cached).
 * - Telegram URLs: if known, refreshed when expired; if unknown, returned directly.
 * - Non-network identifiers or blob/data/relative URLs are passed through as-is.
 * - Network failures gracefully return fallbackUrl or the original identifier.
 */
export async function resolveMediaUrl(identifierOrUrl: string, fallbackUrl?: string): Promise<string> {
  if (!identifierOrUrl || typeof identifierOrUrl !== "string") {
    return fallbackUrl ?? "";
  }

  const trimmed = identifierOrUrl.trim();
  if (!trimmed) {
    return fallbackUrl ?? "";
  }

  // 1. Direct local, blob or data URLs
  if (
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  // 2. HTTP/HTTPS URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    if (!trimmed.includes("api.telegram.org/file/bot")) {
      return trimmed;
    }

    const fileId = extractTelegramFileId(trimmed);
    if (fileId) {
      try {
        return await getTelegramFileUrl(fileId);
      } catch (err) {
        console.warn("[telegramCdn] Failed to refresh telegram URL, using existing:", err);
        return trimmed;
      }
    }
    return trimmed;
  }

  // 3. Telegram formatted ID or raw fileId
  const fileId = extractTelegramFileId(trimmed);
  if (fileId) {
    try {
      return await getTelegramFileUrl(fileId);
    } catch (err) {
      console.error(`[telegramCdn] Failed to resolve media URL for ${trimmed}:`, err);
      return fallbackUrl ?? trimmed;
    }
  }

  // 4. Fallback for any other identifier
  return fallbackUrl ?? trimmed;
}

/**
 * Resolves an array of media identifiers or URLs in parallel.
 */
export async function resolveMediaUrls(identifiers: string[], fallbackUrl?: string): Promise<string[]> {
  return Promise.all(identifiers.map((id) => resolveMediaUrl(id, fallbackUrl)));
}

/**
 * Uploads a file directly to the Telegram CDN channel and returns its direct URL and permanent storageId.
 */
export async function uploadToTelegramCdn(file: File): Promise<TelegramUploadResult> {
  const formData = new FormData();
  formData.append("chat_id", CHAT_ID);
  formData.append("document", file, file.name);

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Telegram CDN upload failed: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  const fileId = data.result?.document?.file_id;
  if (!fileId) throw new Error("Telegram CDN did not return a file_id");

  // Fetch the file path from Telegram to construct the direct URL
  const pathRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`);
  if (!pathRes.ok) throw new Error("Could not retrieve file path from Telegram");

  const pathData = await pathRes.json();
  const filePath = pathData.result?.file_path;
  if (!filePath) throw new Error("Telegram did not provide a file_path");

  const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
  const storageId = formatTelegramIdentifier(fileId);

  // Seed into in-memory cache
  const expiresAt = Date.now() + CACHE_TTL_MS;
  urlCache.set(fileId, { url, expiresAt });
  urlToFileId.set(url, fileId);

  return { fileId, url, storageId };
}

/**
 * React hook to resolve a media identifier (such as "tg:<fileId>") to a fresh, live URL.
 */
export function useResolvedMediaUrl(identifierOrUrl?: string | null, fallbackUrl?: string) {
  const [url, setUrl] = useState<string | null>(() => {
    if (!identifierOrUrl) return fallbackUrl ?? null;
    const trimmed = identifierOrUrl.trim();
    if (
      trimmed.startsWith("blob:") ||
      trimmed.startsWith("data:") ||
      trimmed.startsWith("/") ||
      (trimmed.startsWith("http") && !trimmed.includes("api.telegram.org/file/bot"))
    ) {
      return trimmed;
    }
    const fileId = extractTelegramFileId(trimmed);
    if (fileId) {
      const cached = urlCache.get(fileId);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.url;
      }
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(!url && !!identifierOrUrl);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!identifierOrUrl) {
      setUrl(fallbackUrl ?? null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    resolveMediaUrl(identifierOrUrl, fallbackUrl)
      .then((resolved) => {
        if (active) {
          setUrl(resolved);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setUrl(fallbackUrl ?? identifierOrUrl);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [identifierOrUrl, fallbackUrl]);

  return { url, loading, error };
}
