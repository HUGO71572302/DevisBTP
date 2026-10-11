"use client";

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function canShareFile(file: File): boolean {
  try {
    return typeof navigator !== "undefined" && !!navigator.canShare && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/** Ouvre le menu Partager du téléphone avec le fichier. Renvoie "shared" | "cancelled" | "unsupported". */
export async function shareFile(blob: Blob, filename: string, title: string, text?: string): Promise<"shared" | "cancelled" | "unsupported"> {
  const file = new File([blob], filename, { type: blob.type });
  if (!canShareFile(file)) return "unsupported";
  try {
    await navigator.share({ files: [file], title, text });
    return "shared";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    return "unsupported";
  }
}

function anchorDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Enregistre un fichier sur le téléphone.
 * - Android / ordinateur / Safari iOS : téléchargement direct (attribut download).
 * - App installée sur iPhone (mode autonome, téléchargement non supporté) : menu Partager
 *   (« Enregistrer dans Fichiers », WhatsApp, Drive, e-mail…).
 */
export async function saveFile(blob: Blob, filename: string, title: string): Promise<"downloaded" | "shared" | "cancelled" | "opened"> {
  if (isIOS() && isStandalone()) {
    const r = await shareFile(blob, filename, title);
    if (r === "shared") return "shared";
    if (r === "cancelled") return "cancelled";
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    return "opened";
  }
  anchorDownload(blob, filename);
  return "downloaded";
}

export function whatsappNumber(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 8) d = "228" + d;
  return d;
}
