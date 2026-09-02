import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function InfoDot({ text, className = "" }: { text: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={text}
          className={`inline-grid h-3.5 w-3.5 place-items-center rounded-full border border-muted-foreground/40 text-[9px] font-semibold text-muted-foreground hover:border-emerald-500 hover:text-emerald-600 transition cursor-default ${className}`}
        >
          i
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[180px] text-[11px] leading-snug py-1.5 px-2">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
