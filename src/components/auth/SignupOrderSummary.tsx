import { Separator } from "@/components/ui/separator";
import { getCheckoutTotals, type PlanId } from "@/lib/pricing-data";
import { Cpu } from "lucide-react";

type Props = {
  planId: PlanId;
  iotQuantity: number;
  paid?: boolean;
};

export function SignupOrderSummary({ planId, iotQuantity, paid = false }: Props) {
  const totals = getCheckoutTotals(planId, iotQuantity);
  if (!totals) return null;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 space-y-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
        {paid ? "Your paid order" : "Order summary"}
      </p>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <div>
            <p className="font-medium text-slate-900">{totals.plan.name} plan</p>
            <p className="text-xs text-slate-600">Monthly subscription</p>
          </div>
        </div>
        <span className="font-semibold text-slate-900 shrink-0">
          Rs. {totals.monthlyPrice.toLocaleString()}/mo
        </span>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Cpu className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-slate-900">IoT sensors × {totals.iotQuantity}</p>
            <p className="text-xs text-slate-600">
              Rs. {totals.iotUnit.toLocaleString()} per sensor (one-time)
            </p>
          </div>
        </div>
        <span className="font-semibold text-slate-900 shrink-0">
          Rs. {totals.iotTotal.toLocaleString()}
        </span>
      </div>
      <Separator className="bg-emerald-200" />
      <div className="flex justify-between items-center font-semibold text-slate-900">
        <span>{paid ? "Total paid" : "Total due today"}</span>
        <span className="text-base text-emerald-800">Rs. {totals.dueToday.toLocaleString()}</span>
      </div>
      {!paid && (
        <p className="text-[11px] text-slate-500">
          Includes first month + sensor setup. Then Rs. {totals.monthlyPrice.toLocaleString()}/mo.
        </p>
      )}
    </div>
  );
}
