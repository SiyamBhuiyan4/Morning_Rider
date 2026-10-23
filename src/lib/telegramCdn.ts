const BOT_TOKEN = "8819171458:AAHd3_pjEj2tEYfuB1zgJkznnSqPsisB6p0";
const CHAT_ID = "-1004253971473";

export interface TelegramUploadResult {
  fileId: string;
  url: string;
}

/**
 * Uploads a file directly to the Telegram CDN channel and returns its direct URL.
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
  return { fileId, url };
}
