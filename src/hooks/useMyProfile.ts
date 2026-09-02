import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMySettings } from "@/lib/team-settings-insurance.functions";

export function useMyProfile() {
  const fn = useServerFn(getMySettings);
  return useQuery({ queryKey: ["my-settings"], queryFn: () => fn(), staleTime: 60_000 });
}

export function initialsOf(name?: string | null, email?: string | null) {
  const src = (name ?? email ?? "").trim();
  if (!src) return "?";
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || first.toUpperCase() || "?";
}
