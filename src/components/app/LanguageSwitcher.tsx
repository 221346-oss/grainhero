import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n, LOCALES, type Locale, useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  const { t } = useTranslation();
  const current = LOCALES.find((l) => l.id === locale) ?? LOCALES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("common.language")}
          className={cn(
            "shrink-0 h-9 w-9 grid place-items-center rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground",
            className,
          )}
        >
          <Globe className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.id}
            onClick={() => setLocale(l.id)}
            className={cn(
              "cursor-pointer flex items-center justify-between",
              locale === l.id && "bg-accent text-accent-foreground",
            )}
          >
            <span>{l.nativeLabel}</span>
            {locale === l.id && (
              <span className="text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
