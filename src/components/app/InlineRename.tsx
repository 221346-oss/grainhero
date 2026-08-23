import { useState } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Name + small pencil icon that turns into an inline rename input on click.
 * Renders as plain text (no pencil, no way to trigger editing) when
 * `canRename` is false — used to hide the rename affordance from roles that
 * shouldn't see it (e.g. technician), per the same allow-list the server
 * enforces.
 */
export function InlineRename({
  value,
  onSave,
  canRename,
  className,
  textClassName,
}: {
  value: string;
  onSave: (next: string) => void | Promise<void>;
  canRename: boolean;
  className?: string;
  textClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  if (!canRename) {
    return <span className={textClassName}>{value}</span>;
  }

  if (editing) {
    async function commit() {
      const next = draft.trim();
      if (!next || next === value) {
        setEditing(false);
        return;
      }
      setSaving(true);
      try {
        await onSave(next);
        setEditing(false);
      } finally {
        setSaving(false);
      }
    }
    return (
      <span
        className={cn("inline-flex items-center gap-1", className)}
        onClick={(e) => e.stopPropagation()}
      >
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
          disabled={saving}
          className="h-6 w-36 px-1.5 py-0 text-sm"
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={commit}
          disabled={saving}
          className="text-emerald-600 hover:text-emerald-700 shrink-0"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setEditing(false)}
          disabled={saving}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }

  return (
    <span className={cn("group inline-flex items-center gap-1", className)}>
      <span className={textClassName}>{value}</span>
      <button
        type="button"
        aria-label={`Rename ${value}`}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setDraft(value);
          setEditing(true);
        }}
        className="text-muted-foreground/40 hover:text-emerald-600 group-hover:text-muted-foreground transition shrink-0"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </span>
  );
}
