import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAssetUrl(asset: { url: string; r2_key?: string }): string {
  if (asset?.r2_key) {
    return `https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/${asset.r2_key}`;
  }
  return asset?.url ?? "";
}
