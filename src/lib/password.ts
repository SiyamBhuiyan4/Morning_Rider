/** A readable strong password: letters + digits, no look-alike characters. */
export function generatePassword() {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const word = [...bytes.slice(0, 6)].map((b) => letters[b % letters.length]).join("");
  return "Mr" + word + String(10 + (bytes[6] % 90));
}
