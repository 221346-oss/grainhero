import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyOrder, cancelMyOrder } from "@/lib/buyer-portal.functions";
import { startBuyerCheckout } from "@/lib/buyer-checkout.functions";
import { resendInvoiceEmail } from "@/lib/invoicing.functions";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { ShipmentPanel } from "@/components/app/marketplace/ShipmentPanel";
import { BuyerReviewForm } from "@/components/app/marketplace/BuyerReviewForm";
import { BuyerDisputeCard } from "@/components/app/marketplace/BuyerDisputeCard";
import { LocalizedContent, translateText, useI18n } from "@/i18n";

const search = z.object({ checkout: z.enum(["success", "cancel"]).optional() });

export const Route = createFileRoute("/_authenticated/buyer/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Buyer · Orders · OrderId — Grain Hero" },
      {
        name: "description",
        content:
          "Buyer · Orders · OrderId workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Buyer · Orders · OrderId — Grain Hero" },
      {
        property: "og:description",
        content: "Buyer · Orders · OrderId workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s) => search.parse(s),
  component: OrderDetail,
});

function OrderDetail() {
  const { locale } = useI18n();
  const { orderId } = Route.useParams();
  const s = useSearch({ from: "/_authenticated/buyer/orders/$orderId" });
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-order", orderId],
    queryFn: () => getMyOrder({ data: { orderId } }),
    refetchInterval: (q) => (q.state.data?.order?.status === "pending" ? 3000 : false),
  });

  useEffect(() => {
    if (s.checkout === "success") {
      toast.success(translateText("Payment received — thank you!", locale));
      refetch();
    } else if (s.checkout === "cancel") {
      toast.info(translateText("Checkout cancelled.", locale));
    }
  }, [s.checkout, refetch]);

  const pay = useMutation({
    mutationFn: async () =>
      startBuyerCheckout({ data: { orderId, origin: window.location.origin } }),
    onSuccess: ({ url }) => {
      if (url) window.location.href = url;
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const resendFn = useServerFn(resendInvoiceEmail);
  const resend = useMutation({
    mutationFn: (invoiceId: string) => resendFn({ data: { invoiceId } }),
    onSuccess: (r) =>
      r.ok
        ? toast.success(translateText("Invoice email sent", locale))
        : toast.error(r.error ?? translateText("Failed to send", locale)),
    onError: (e) => toast.error((e as Error).message),
  });

  const cancel = useMutation({
    mutationFn: async () => cancelMyOrder({ data: { orderId } }),
    onSuccess: () => {
      toast.success(translateText("Order cancelled", locale));
      qc.invalidateQueries({ queryKey: ["my-order", orderId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading)
    return (
      <LocalizedContent>
        <div className="max-w-4xl mx-auto p-6 text-muted-foreground">Loading…</div>
      </LocalizedContent>
    );
  const o = data?.order;
  if (!o)
    return (
      <LocalizedContent>
        <div className="max-w-4xl mx-auto p-6">Order not found.</div>
      </LocalizedContent>
    );
  const events = data?.events ?? [];
  const canPay = o.status === "pending" || o.status === "confirmed" || o.status === "invoiced";

  return (
    <LocalizedContent>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Link to="/buyer/orders" className="text-sm text-muted-foreground hover:text-foreground">
        ← All orders
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground">{o.order_number}</div>
          <h1 className="text-2xl font-semibold">{o.grain_listings?.title ?? "Order"}</h1>
          <div className="text-sm text-muted-foreground">
            {Number(o.quantity_kg).toLocaleString()} kg × {o.currency}{" "}
            {Number(o.unit_price).toFixed(2)}
          </div>
        </div>
        <Badge variant="outline" className="capitalize text-base">
          {o.status}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">
              {o.currency} {Number(o.subtotal).toFixed(2)}
            </span>
          </div>
          {o.paid_at && (
            <div className="text-sm text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Paid {new Date(o.paid_at).toLocaleString()}
            </div>
          )}
          {o.dispatched_at && (
            <div className="text-sm text-muted-foreground">
              Dispatched {new Date(o.dispatched_at).toLocaleString()}
            </div>
          )}
          {o.completed_at && (
            <div className="text-sm text-muted-foreground">
              Completed {new Date(o.completed_at).toLocaleString()}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            {canPay && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => pay.mutate()}
                disabled={pay.isPending}
              >
                {pay.isPending ? "Redirecting…" : "Pay now"}
              </Button>
            )}
            {o.status === "pending" && (
              <Button variant="outline" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                Cancel order
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-medium mb-2">Timeline</h2>
        <Card>
          <CardContent className="p-4 space-y-2">
            {events.length === 0 && (
              <div className="text-sm text-muted-foreground">No events yet.</div>
            )}
            {events.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0"
              >
                <span>
                  <span className="capitalize">{e.from_state ?? "created"}</span>
                  {" → "}
                  <span className="capitalize font-medium">{e.to_state}</span>
                  {e.note && <span className="text-muted-foreground"> · {e.note}</span>}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {(o.status === "dispatched" || o.status === "completed" || o.status === "paid") && (
        <ShipmentPanel orderId={o.id} canManage={false} orderStatus={o.status} />
      )}
      {o.status === "completed" && <BuyerReviewForm orderId={o.id} />}
      {["delivered", "completed", "dispatched", "paid"].includes(o.status) && (
        <BuyerDisputeCard orderId={o.id} />
      )}
      {(o.invoice_pdf_url ||
        (o.buyer_invoices && (o.buyer_invoices as { id?: string; pdf_url?: string })?.id)) && (
        <div className="flex items-center gap-3">
          {(o.invoice_pdf_url || (o.buyer_invoices as { pdf_url?: string })?.pdf_url) && (
            <a
              href={o.invoice_pdf_url ?? (o.buyer_invoices as { pdf_url?: string })?.pdf_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-700 underline"
            >
              Download invoice (PDF)
            </a>
          )}
          {(o.buyer_invoices as { id?: string })?.id && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={resend.isPending}
                onClick={() => resend.mutate((o.buyer_invoices as { id: string }).id)}
              >
                {resend.isPending ? "Sending…" : "Resend invoice email"}
              </Button>
              {(o.buyer_invoices as { email_status?: string })?.email_status === "failed" && (
                <span className="text-xs text-rose-600">Last email failed</span>
              )}
            </>
          )}
        </div>
      )}
      </div>
    </LocalizedContent>
  );
}
