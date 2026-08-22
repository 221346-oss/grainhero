import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Download, FileUp, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listPolicyDocuments,
  createPolicyDocumentUploadUrl,
  savePolicyDocument,
  getPolicyDocumentDownloadUrl,
  deletePolicyDocument,
} from "@/lib/insurance.functions";

export const Route = createFileRoute("/_authenticated/insurance-policies/$policyId/documents")({
  head: () => ({
    meta: [
      { title: "Insurance Policies · PolicyId · Documents — Grain Hero" },
      { name: "description", content: "Insurance Policies · PolicyId · Documents workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Insurance Policies · PolicyId · Documents — Grain Hero" },
      { property: "og:description", content: "Insurance Policies · PolicyId · Documents workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PolicyDocumentsPage,
});

function PolicyDocumentsPage() {
  const { policyId } = Route.useParams();
  const qc = useQueryClient();
  const list = useServerFn(listPolicyDocuments);
  const signUpload = useServerFn(createPolicyDocumentUploadUrl);
  const save = useServerFn(savePolicyDocument);
  const download = useServerFn(getPolicyDocumentDownloadUrl);
  const del = useServerFn(deletePolicyDocument);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["policy-docs", policyId],
    queryFn: () => list({ data: { policy_id: policyId } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["policy-docs", policyId] });

  const onUpload = async (file: File) => {
    setBusy(true);
    try {
      const signed = await signUpload({ data: { policy_id: policyId, filename: file.name } });
      const up = await supabase.storage.from("insurance-attachments")
        .uploadToSignedUrl(signed.path, signed.token, file);
      if (up.error) throw up.error;
      await save({ data: {
        policy_id: policyId,
        filename: file.name,
        storage_path: signed.path,
        mime: file.type || null,
        size_bytes: file.size,
        document_type: "policy",
        notes: notes || null,
      } });
      toast.success("Document uploaded");
      setNotes("");
      invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openDownload = async (id: string) => {
    try {
      const r = await download({ data: { id } });
      window.open(r.url, "_blank", "noopener");
    } catch (e) { toast.error((e as Error).message); }
  };

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const policy = data?.policy;
  const docs = data?.documents ?? [];

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <Link to="/insurance" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to insurance
      </Link>
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Policy documents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload and version coverage PDFs. Each new upload becomes the current document.
        </p>
      </div>

      {policy && (
        <Card>
          <CardContent className="p-4 text-sm flex flex-wrap items-center gap-4">
            <div><span className="text-muted-foreground text-xs uppercase">Policy #</span> <span className="font-mono">{policy.policy_number ?? policy.id.slice(0,8)}</span></div>
            <div><span className="text-muted-foreground text-xs uppercase">Product</span> {policy.product?.name ?? "—"}</div>
            <div><span className="text-muted-foreground text-xs uppercase">Carrier</span> {policy.product?.carrier?.name ?? "—"}</div>
            <Badge className="capitalize bg-emerald-100 text-emerald-700 border-emerald-200">{policy.status}</Badge>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Upload new version</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea placeholder="Notes for this version (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
            }}
          />
          <Button disabled={busy} onClick={() => fileRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-700">
            <FileUp className="h-4 w-4 mr-2" /> {busy ? "Uploading…" : "Choose file"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Version history</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground text-sm">Loading…</div>
          ) : docs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
              No documents uploaded yet.
            </div>
          ) : (
            <ul className="divide-y">
              {docs.map((d) => (
                <li key={d.id} className="p-4 flex items-center gap-3">
                  <FileText className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.filename}</div>
                    <div className="text-[11px] text-muted-foreground">
                      v{d.version} · {new Date(d.created_at).toLocaleString()}
                      {d.size_bytes ? ` · ${Math.round(d.size_bytes / 1024)} KB` : ""}
                    </div>
                    {d.notes && <div className="text-xs text-muted-foreground mt-1">{d.notes}</div>}
                  </div>
                  {d.is_current && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Current</Badge>}
                  <Button size="sm" variant="outline" onClick={() => openDownload(d.id)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Open
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => delMut.mutate(d.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}