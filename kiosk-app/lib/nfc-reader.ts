import NfcManager, { NfcTech } from "react-native-nfc-manager";

export class NfcReaderError extends Error {
  code: "NFC_TIMEOUT" | "NFC_CANCELLED" | "NFC_DISABLED" | "NFC_UNSUPPORTED" | "NFC_READ_FAILED";

  constructor(
    code: NfcReaderError["code"],
    message?: string,
  ) {
    super(message ?? code);
    this.name = "NfcReaderError";
    this.code = code;
  }
}

let nfcStarted = false;

async function ensureNfcStarted(): Promise<void> {
  if (nfcStarted) return;
  await NfcManager.start();
  nfcStarted = true;
}

function normalizeBadgeUid(raw: string): string {
  const hex = raw.replace(/[^0-9A-Fa-f]/g, "");
  if (!hex) {
    throw new NfcReaderError("NFC_READ_FAILED", "Badge sans identifiant");
  }
  return hex.toUpperCase();
}

function mapReadError(error: unknown): NfcReaderError {
  if (error instanceof NfcReaderError) return error;

  const msg =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (msg.includes("cancel") || msg.includes("user") && msg.includes("abort")) {
    return new NfcReaderError("NFC_CANCELLED");
  }
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return new NfcReaderError("NFC_TIMEOUT");
  }
  if (msg.includes("disabled") || msg.includes("not enabled")) {
    return new NfcReaderError("NFC_DISABLED");
  }
  return new NfcReaderError("NFC_READ_FAILED", error instanceof Error ? error.message : undefined);
}

/**
 * Blocks until a badge is presented or `timeoutMs` elapses.
 * Resolves with the badge UID as an uppercase hex string.
 */
export async function readNfcBadgeUid(timeoutMs = 10_000): Promise<string> {
  await ensureNfcStarted();

  const supported = await NfcManager.isSupported();
  if (!supported) {
    throw new NfcReaderError("NFC_UNSUPPORTED");
  }

  const enabled = await NfcManager.isEnabled();
  if (!enabled) {
    throw new NfcReaderError("NFC_DISABLED");
  }

  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  try {
    const uid = await Promise.race<string>([
      (async () => {
        await NfcManager.requestTechnology(NfcTech.Ndef, {
          alertMessage: "Presentez votre badge NFC",
        });
        const tag = await NfcManager.getTag();
        if (!tag?.id) {
          throw new NfcReaderError("NFC_READ_FAILED", "Badge sans identifiant");
        }
        return normalizeBadgeUid(tag.id);
      })(),
      new Promise<string>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new NfcReaderError("NFC_TIMEOUT"));
        }, timeoutMs);
      }),
    ]);
    return uid;
  } catch (error) {
    throw mapReadError(error);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch {
      // ignore — reader may already be idle
    }
  }
}
