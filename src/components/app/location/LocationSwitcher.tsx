/**
 * LocationSwitcher — change the active city without returning to the picker.
 *
 * Two jobs. It makes switching cheap, which the requirement asks for
 * explicitly; and it keeps the active location permanently on screen, which is
 * the main defence against misreading one site's numbers as another's. Nothing
 * renders when the user has no location scope — manager, technician and
 * super-admin views are untouched.
 */
import { Check, ChevronsUpDown, LayoutGrid, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocationScope } from "./LocationScope";

export function LocationSwitcher() {
  const scope = useLocationScope();
  if (!scope || !scope.active || scope.locations.length === 0) return null;

  const { active, activeWarehouse, locations, select, selectWarehouse, clear } = scope;
  // The warehouse is the live scope, so it is what the trigger names.
  const label = activeWarehouse ? activeWarehouse.name : active.city;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2.5 text-[13px] font-medium"
          aria-label={`Active location: ${label}. Change location`}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="max-w-[10rem] truncate">{label}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-60">
        {/* Warehouses in the current city first — switching between sites in
            one city is the common move, and the warehouse is the real scope. */}
        {active.warehouses.length > 1 && (
          <>
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {active.city}
            </DropdownMenuLabel>
            {active.warehouses.map((wh) => (
              <DropdownMenuItem
                key={wh.id}
                onSelect={() => selectWarehouse(wh.id)}
                className="flex items-center justify-between gap-2"
              >
                <span className="min-w-0 flex-1 truncate">{wh.name}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {wh.siloCount}
                </span>
                {wh.id === activeWarehouse?.id && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Locations
        </DropdownMenuLabel>
        {locations.map((loc) => (
          <DropdownMenuItem
            key={loc.key}
            onSelect={() => select(loc.key)}
            className="flex items-center justify-between gap-2"
          >
            <span className="min-w-0 flex-1 truncate">{loc.city}</span>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {loc.warehouseCount}
            </span>
            {loc.key === active.key && !activeWarehouse && (
              <Check className="h-3.5 w-3.5 shrink-0 text-success" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => clear()} className="gap-2">
          <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          All locations
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
