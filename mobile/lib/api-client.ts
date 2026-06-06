import type { ApiError, ApiSuccess } from "@/lib/api-types";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export function getApiBaseUrl() {
  return API_BASE.replace(/\/$/, "");
}

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch(path: string, init: RequestInit = {}, token?: string | null) {
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });
}

export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null
): Promise<T> {
  const response = await apiFetch(path, init, token);
  const payload = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiError | null;

  if (!response.ok) {
    const message = payload && "error" in payload ? payload.error.message : `Request failed (${response.status})`;
    const code = payload && "error" in payload ? payload.error.code : undefined;
    const details = payload && "error" in payload ? payload.error.details : undefined;
    throw new ApiRequestError(message, response.status, code, details);
  }

  if (!payload || !("data" in payload)) {
    throw new ApiRequestError("Invalid API response shape", response.status);
  }

  return payload.data;
}

export async function smokeTestApi(token?: string | null) {
  const [flyers, profile] = await Promise.all([
    apiJson<unknown[]>("/api/flyers", { method: "GET" }, token),
    apiJson<unknown>("/api/profile", { method: "GET", cache: "no-store" }, token),
  ]);

  return {
    flyersOk: Array.isArray(flyers),
    profileOk: Boolean(profile),
  };
}
