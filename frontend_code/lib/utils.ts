import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { config } from "@/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}




export async function apiFetch(path: string, options?: RequestInit) {
  const url = `${config.backendUrl}${path}`;
  
  // Get token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  // Merge headers to include authorization
  const headers = {
    ...(options?.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  
  const res = await fetch(url, {
    ...options,
    headers
  });
  
  if (!res.ok) {
    // Try to get error message from response
    try {
      const errorData = await res.json();
      throw new Error(errorData.message || errorData.error || `API error: ${res.status}`);
    } catch {
      throw new Error(`API error: ${res.status} - ${res.statusText}`);
  }
  }
  
  return res.json();
}
