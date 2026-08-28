import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { openDispute } from "@/lib/disputes.functions";
import { getMarketplaceSettings } from "@/lib/marketplace-settings.functions";
import { supabase } from "@/integrations/supabase/client";
import { X, Paperclip } from "lucide-react";
import { LocalizedContent, translateText, useI18n } from "@/i18n";

export function BuyerDisputeCard({ orderId }: { orderId: string }) {
  const { locale } = useI18n();
  const settingsFn = useServerFn(getMarketplaceSettings);
  const openFn = useServerFn(openDispute);
  const { data: settings } = useQuery({
    queryKey: ["marketplace-settings-buyer"],
    queryFn: () => settingsFn(),
  });
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<
    Array<{ path: string; name: string; mime?: string; size?: number }>
  >([]);
  const [uploading, setUploading] = useState(false);
  const cats = settings?.settings.disputes.categories ?? [];
  const enabled = settings?.settings.disputes.enabled ?? false;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    if (files.length + selected.length > 10) {
      toast.error(translateText("Max 10 attachments", locale));
      return;
    }
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const uploaded: typeof files = [];
      for (const f of selected) {
        if (f.size > 10 * 1024 * 1024) {
          toast.error(`${f.name} exceeds 10MB`);
          continue;
        }
        const path = `${uid}/${orderId}/${Date.now()}-${f.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage
          .from("dispute-attachments")
          .upload(path, f, { contentType: f.type });
        if (error) throw error;
        uploaded.push({ path, name: f.name, mime: f.type, size: f.size });
      }
      setFiles((prev) => [...prev, ...uploaded]);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const mut = useMutation({
    mutationFn: () => openFn({ data: { orderId, category, description, attachments: files } }),
    onSuccess: () => {
      toast.success(translateText("Dispute submitted", locale));
      setOpen(false);
      setDescription("");
      setCategory("");
      setFiles([]);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!enabled) return null;
  if (!open) {
    return (
      <LocalizedContent>
        <div className="pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-rose-700 hover:text-rose-800"
          onClick={() => setOpen(true)}
        >
          Report a problem with this order
        </Button>
        </div>
      </LocalizedContent>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Open a dispute</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {cats.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Describe the issue</Label>
          <Textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please share details, dates, and any photos or reference numbers."
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Attachments (photos, PDFs — up to 10, max 10MB each)</Label>
          <label className="inline-flex items-center gap-2 text-sm px-3 py-1.5 border rounded cursor-pointer hover:bg-muted">
            <Paperclip className="h-4 w-4" />
            <span>{uploading ? "Uploading…" : "Add files"}</span>
            <input
              type="file"
              multiple
              className="hidden"
              accept="image/*,.pdf"
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>
          {files.length > 0 && (
            <ul className="space-y-1">
              {files.map((f, i) => (
                <li
                  key={f.path}
                  className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1"
                >
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-rose-600"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!category || description.length < 10 || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? "Submitting…" : "Submit dispute"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
