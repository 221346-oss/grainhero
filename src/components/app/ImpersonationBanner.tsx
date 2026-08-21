import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { UserCog, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { stopImpersonation } from "@/lib/impersonation.functions";

const STORAGE_KEY = "gh_impersonation_session";
const CHANGE_EVENT = "gh_impersonation_changed";

export interface ImpersonationSession {
  adminId: string;
  adminName: string;
  adminEmail: string | null;
  businessType: string | null;
}

/** Read the current impersonation session from localStorage */
export function getImpersonationSession(): ImpersonationSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ImpersonationSession) : null;
  } catch {
    return null;
  }
}

/** Save an impersonation session and notify same-tab listeners */
export function saveImpersonationSession(session: ImpersonationSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/** Clear the impersonation session and notify same-tab listeners */
export function clearImpersonationSession(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function ImpersonationBanner() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const stopFn = useServerFn(stopImpersonation);
  const [session, setSession] = useState<ImpersonationSession | null>(() =>
    getImpersonationSession(),
  );

  useEffect(() => {
    const load = () => setSession(getImpersonationSession());
    // cross-tab changes
    window.addEventListener("storage", load);
    // same-tab changes (dispatched by save/clear helpers above)
    window.addEventListener(CHANGE_EVENT, load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener(CHANGE_EVENT, load);
    };
  }, []);

  const stopMutation = useMutation({
    mutationFn: () => stopFn(),
    onSuccess: () => {
      clearImpersonationSession();
      setSession(null);
      toast.success("Stopped impersonation");
      queryClient.invalidateQueries();
      navigate({ to: "/platform/users" });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (!session) return null;

  return (
    <div className="bg-amber-100 border-b border-amber-200 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-amber-800">
          <UserCog className="h-4 w-4" />
          <span className="text-sm font-medium">
            Viewing as{" "}
            <span className="font-semibold">
              {session.adminName || session.adminEmail || "Unknown User"}
            </span>
            {session.businessType && (
              <span className="text-amber-700 ml-1">({session.businessType})</span>
            )}
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => stopMutation.mutate()}
          disabled={stopMutation.isPending}
          className="bg-white hover:bg-amber-50 border-amber-300 text-amber-800"
        >
          <X className="h-3 w-3 mr-1" />
          Exit Impersonation
        </Button>
      </div>
    </div>
  );
}
