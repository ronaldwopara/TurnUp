const KEY = "turnup_permission_step";

export function getPermissionStep(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw == null) return 0;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? Math.max(0, Math.min(2, n)) : 0;
  } catch {
    return 0;
  }
}

export function setPermissionStep(step: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, String(Math.max(0, Math.min(2, step))));
  } catch {
    /* ignore */
  }
}

export function clearPermissionStep(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
