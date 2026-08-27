/**
 * WarehouseAssignmentSidebar
 *
 * Sidebar panel to assign manager and technicians to a warehouse.
 * No popup - just a right-side drawer that slides in.
 */
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { listAvailableTeam, updateWarehouseTeam } from "@/lib/operations.functions";
import { X, Loader2, Check, AlertCircle, User, Wrench } from "lucide-react";
import { toast } from "sonner";
import { LocalizedContent } from "@/i18n";

type WarehouseRow = {
  id: string;
  warehouse_id: string;
  name: string;
  manager_id: string | null;
  manager_name: string | null;
  technician_ids: string[];
  technician_names: string[];
};

type Team = {
  managers: Array<{ id: string; name: string }>;
  technicians: Array<{ id: string; name: string }>;
};

export function WarehouseAssignmentSidebar({
  warehouse,
  isOpen,
  onClose,
}: {
  warehouse: WarehouseRow | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const fetchTeam = useServerFn(listAvailableTeam);
  const updateTeam = useServerFn(updateWarehouseTeam);
  const queryClient = useQueryClient();

  // Form state
  const [managerId, setManagerId] = useState<string | null>(null);
  const [selectedTechs, setSelectedTechs] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  // Sync form state when warehouse changes
  useEffect(() => {
    if (warehouse) {
      setManagerId(warehouse.manager_id ?? null);
      setSelectedTechs(new Set(warehouse.technician_ids ?? []));
      setIsDirty(false);
    }
  }, [warehouse, isOpen]);

  // Fetch available team members
  const {
    data: team,
    isLoading: isLoadingTeam,
    isError: isErrorTeam,
  } = useQuery({
    queryKey: ["available-team"],
    queryFn: () => fetchTeam(),
    enabled: isOpen && !!warehouse,
    staleTime: 60_000,
  });

  // Mutation to save changes
  const { mutate: saveAssignments, isPending } = useMutation({
    mutationFn: async () => {
      if (!warehouse) return;
      const payload = {
        warehouseId: warehouse.id,
        managerId: managerId,
        technicianIds: Array.from(selectedTechs),
      };
      console.log("[saveAssignments] Sending payload:", payload);
      const result = await updateTeam({ data: payload });
      console.log("[saveAssignments] Result:", result);
      return result;
    },
    onSuccess: () => {
      toast.success("Warehouse team updated");
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["warehouses-with-team"] });
      onClose();
    },
    onError: (err) => {
      console.error("[saveAssignments] Error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update team");
    },
  });

  if (!warehouse || !isOpen) return null;

  // Handle manager selection
  const handleManagerChange = (newManagerId: string | null) => {
    setManagerId(newManagerId);
    setIsDirty(true);
  };

  // Handle technician multi-select
  const handleTechToggle = (techId: string) => {
    const updated = new Set(selectedTechs);
    if (updated.has(techId)) {
      updated.delete(techId);
    } else {
      updated.add(techId);
    }
    setSelectedTechs(updated);
    setIsDirty(true);
  };

  return (
    <LocalizedContent>
      <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden="true" />
      )}

      {/* Sidebar drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 overflow-y-auto ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Assign Team</h2>
            <p className="text-xs text-slate-500 mt-1">{warehouse.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoadingTeam ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading team members…
            </div>
          ) : isErrorTeam ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">Failed to load team members</p>
            </div>
          ) : !team || (team.managers.length === 0 && team.technicians.length === 0) ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">No managers or technicians available yet</p>
            </div>
          ) : (
            <>
              {/* Manager selection */}
              {team && team.managers.length > 0 && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 font-semibold text-sm text-slate-700">
                    <User className="w-4 h-4 text-slate-400" />
                    Manager
                  </label>
                  <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <button
                      onClick={() => handleManagerChange(null)}
                      className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                        managerId === null
                          ? "bg-white text-slate-900 border border-slate-300 font-medium"
                          : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      Unassigned
                    </button>
                    {team.managers.map((manager) => (
                      <button
                        key={manager.id}
                        onClick={() => handleManagerChange(manager.id)}
                        className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center gap-2 ${
                          managerId === manager.id
                            ? "bg-white text-slate-900 border border-slate-300 font-medium"
                            : "text-slate-600 hover:bg-white"
                        }`}
                      >
                        {managerId === manager.id && (
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                        {manager.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Technician multi-select */}
              {team && team.technicians.length > 0 && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 font-semibold text-sm text-slate-700">
                    <Wrench className="w-4 h-4 text-slate-400" />
                    Technicians
                  </label>
                  <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                    {team.technicians.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No technicians available</p>
                    ) : (
                      team.technicians.map((tech) => (
                        <label
                          key={tech.id}
                          className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTechs.has(tech.id)}
                            onChange={() => handleTechToggle(tech.id)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-500 cursor-pointer"
                          />
                          <span className="text-sm text-slate-700 flex-1">{tech.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with action buttons */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => saveAssignments()}
            disabled={!isDirty || isPending || isLoadingTeam}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Save
              </>
            )}
          </button>
        </div>
      </div>
      </>
    </LocalizedContent>
  );
}
