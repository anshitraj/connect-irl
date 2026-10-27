import { useSyncExternalStore } from "react";
// Small per-device preferences kept in localStorage, scoped to the signed-in account.
const changed = "connectirl:preferences";
const autoSaveKey = (account: string) => `connectirl.autoSaveBack.${account}`;
const savedBackKey = (account: string) => `connectirl.savedBack.${account}`;
function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Storage can be unavailable in private mode; the default applies. */
  }
  window.dispatchEvent(new Event(changed));
}
function subscribe(callback: () => void) {
  window.addEventListener(changed, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(changed, callback);
    window.removeEventListener("storage", callback);
  };
}
/** Whether people who scan you are saved back to your people automatically (on by default). */
export function useAutoSaveBack(account: string | undefined) {
  return useSyncExternalStore(
    subscribe,
    () => (account ? read(autoSaveKey(account)) !== "off" : false),
    () => false,
  );
}
export function setAutoSaveBack(account: string, enabled: boolean) {
  write(autoSaveKey(account), enabled ? "on" : "off");
}
/** Receipts already saved back once, so a contact you deleted is never re-added. */
export function savedBackReceipts(account: string): string[] {
  try {
    const value = JSON.parse(read(savedBackKey(account)) || "[]");
    return Array.isArray(value) ? value.slice(-500) : [];
  } catch {
    return [];
  }
}
export function rememberSavedBack(account: string, receipt: string) {
  const list = savedBackReceipts(account);
  if (list.includes(receipt)) return;
  try {
    localStorage.setItem(
      savedBackKey(account),
      JSON.stringify([...list, receipt].slice(-500)),
    );
  } catch {
    /* Without storage, a receipt may be offered again later. */
  }
}
