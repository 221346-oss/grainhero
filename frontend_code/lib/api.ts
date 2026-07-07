/* eslint-disable @typescript-eslint/no-explicit-any */
import { config } from "@/config";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

function getAuthHeaders() {
  if (typeof window === "undefined") return {} as Record<string, string>;
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, method: HttpMethod = "GET", body?: unknown): Promise<ApiResponse<T>> {
  try {
    // In production (Vercel) we proxy `/api/*` + `/auth/*` through Next route handlers
    // to avoid CORS and to keep a single origin for the frontend.
    const isBrowser = typeof window !== "undefined";
    const shouldUseSameOriginProxy =
      isBrowser && (path.startsWith("/api/") || path.startsWith("/auth/"));

    const url = shouldUseSameOriginProxy ? path : `${config.backendUrl}${path}`;

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const isJson = res.headers.get("content-type")?.includes("application/json");
    const payload = isJson ? await res.json() : undefined;
    if (!res.ok) {
      return { ok: false, status: res.status, error: (payload && (payload.error || payload.msg)) || res.statusText };
    }
    return { ok: true, status: res.status, data: payload as T };
  } catch (e: unknown) {
    const errorMessage = e && typeof e === 'object' && 'message' in e ? (e as {message: string}).message : "Network error";
    return { ok: false, status: 0, error: errorMessage };
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, "GET"),
  post: <T>(path: string, body?: unknown) => request<T>(path, "POST", body),
  patch: <T>(path: string, body?: unknown) => request<T>(path, "PATCH", body),
  put: <T>(path: string, body?: unknown) => request<T>(path, "PUT", body),
  delete: <T>(path: string) => request<T>(path, "DELETE"),

  // For file uploads
  postFormData: async <T>(path: string, formData: FormData): Promise<ApiResponse<T>> => {
    try {
      const res = await fetch(`${config.backendUrl}${path}`, {
        method: "POST",
        headers: { ...getAuthHeaders() }, // Browser sets Content-Type with boundary
        body: formData,
      });
      const payload = await res.json();
      if (!res.ok) return { ok: false, status: res.status, error: payload?.error || res.statusText };
      return { ok: true, status: res.status, data: payload as T };
    } catch (e: any) { return { ok: false, status: 0, error: e.message }; }
  },

  // For file downloads
  download: async (path: string): Promise<Blob | null> => {
    try {
      const res = await fetch(`${config.backendUrl}${path}`, {
        headers: { ...getAuthHeaders() },
      });
      if (!res.ok) return null;
      return await res.blob();
    } catch { return null; }
  }
};


