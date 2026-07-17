import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { openDispute } from "@/lib/disputes.functions";
import { getMarketplaceSettings } from "@/lib/marketplace-settings.functions";

export function BuyerDisputeCard({ orderId }: { orderId: string }) {
  const settingsFn = useServerFn(getMarketplaceSettings);
  const openFn = useServerFn(openDispute);
  const { data: settings } = useQuery({
    queryKey: ["marketplace-settings-buyer"],
    queryFn: () => settingsFn(),
  });
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);
  const cats = settings?.settings.disputes.categories ?? [];
  const enabled = settings?.settings.disputes.enabled ?? false;

  const mut = useMutation({
    mutationFn: () => openFn({ data: { orderId, category, description } }),
    onSuccess: () => { toast.success("Dispute submitted"); setOpen(false); setDescription(""); setCategory(""); },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!enabled) return null;
  if (!open) {
    return (
      <div className="pt-2">
        <Button variant="ghost" size="sm" className="text-rose-700 hover:text-rose-800" onClick={() => setOpen(true)}>
          Report a problem with this order
        </Button>
      </div>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Open a dispute</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {cats.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Describe the issue</Label>
          <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Please share details, dates, and any photos or reference numbers." />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" disabled={!category || description.length < 10 || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Submitting…" : "Submit dispute"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}