import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function InfoDot({ text, className = "" }: { text: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={text}
          className={`inline-grid h-3.5 w-3.5 place-items-center rounded-full border border-muted-foreground/40 text-[9px] font-semibold text-muted-foreground hover:border-emerald-500 hover:text-emerald-600 transition ${className}`}
        >
          i
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}