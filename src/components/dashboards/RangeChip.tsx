import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const RANGE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "mtd", label: "This month" },
  { key: "ytd", label: "This year" },
] as const;
export type RangeKey = typeof RANGE_OPTIONS[number]["key"];

export function RangeChip({ value, onChange }: { value: RangeKey; onChange: (v: RangeKey) => void }) {
  const label = RANGE_OPTIONS.find((r) => r.key === value)?.label ?? "This month";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full border text-[11px] font-medium bg-card hover:border-emerald-500/50 hover:text-emerald-600 transition"
        >
          {label}
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {RANGE_OPTIONS.map((r) => (
          <DropdownMenuItem key={r.key} onClick={() => onChange(r.key)} className="text-xs">
            {r.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}