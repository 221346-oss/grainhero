import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { UserCog, X } from "lucide-react";
import { toast } from "sonner";
import { getImpersonation, stopImpersonation } from "@/lib/impersonation.functions";

/**
 * Persistent banner shown while a super_admin is viewing the app as a
 * tenant. Rendered near the top of the authenticated shell.
 */
export function ImpersonationBanner() {
  const qc = useQueryClient();
  const router = useRouter();
  const getFn = useServerFn(getImpersonation);
  const stopFn = useServerFn(stopImpersonation);
  const { data } = useQuery({
    queryKey: ["impersonation"],
    queryFn: () => getFn(),
    staleTime: 30_000,
  });
  const stop = useMutation({
    mutationFn: () => stopFn(),
    onSuccess: async () => {
      toast.success("Exited impersonation");
      await qc.invalidateQueries();
      router.invalidate();
    },
  });
  if (!data) return null;
  return (
    <div className="sticky top-0 z-40 bg-amber-500 text-amber-950 border-b border-amber-600">
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center gap-3 text-sm">
        <UserCog className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">
          Viewing as tenant: <strong>{data.tenantName}</strong> — writes may
          still be allowed by RLS; act with care.
        </span>
        <button
          type="button"
          onClick={() => stop.mutate()}
          disabled={stop.isPending}
          className="inline-flex items-center gap-1 rounded-md bg-amber-950/10 hover:bg-amber-950/20 px-2 py-1 font-medium"
        >
          <X className="h-3.5 w-3.5" /> Exit
        </button>
      </div>
    </div>
  );
}