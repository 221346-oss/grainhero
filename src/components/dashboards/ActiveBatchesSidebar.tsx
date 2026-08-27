import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActiveBatches } from "@/lib/active-batches.functions";
import { X, Clock, User, Beaker, Droplets, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocalizedContent } from "@/i18n";

interface ActiveBatchesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActiveBatchesSidebar({ isOpen, onClose }: ActiveBatchesSidebarProps) {
  const getActiveBatchesFn = useServerFn(getActiveBatches);
  const { data, isLoading, error } = useQuery({
    queryKey: ["active-batches"],
    queryFn: () => getActiveBatchesFn(),
    enabled: isOpen,
    refetchInterval: 30_000, // Refetch every 30 seconds when open
  });

  const batches = data?.batches || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      intake: "bg-blue-100 text-blue-800",
      processing: "bg-amber-100 text-amber-800",
      treatment: "bg-purple-100 text-purple-800",
      pending_qc: "bg-orange-100 text-orange-800",
      qc_submitted: "bg-green-100 text-green-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <LocalizedContent>
      <>
      {/* Backdrop - only render when open (no shadow) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity duration-300 ease-in-out"
          onClick={onClose}
          style={{
            opacity: isOpen ? 1 : 0,
          }}
        />
      )}

      {/* Sliding Container - always render for smooth animation */}
      <div
        className={`
        fixed top-0 right-0 h-full w-[500px] bg-white dark:bg-gray-900 z-50 
        transform transition-all duration-300 ease-in-out border-l
        border-gray-200 dark:border-gray-700
        ${isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
        style={{
          visibility: isOpen ? "visible" : "hidden",
          transitionDelay: isOpen ? "0ms" : "300ms",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 dark:bg-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Active Batches
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {batches.length} batches currently in observation
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-red-600">
              <p>Error loading active batches</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <p>No stored batches found in grain batches section</p>
            </div>
          ) : (
            <div className="space-y-4">
              {batches.map((batch: any) => (
                <div
                  key={batch.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                >
                  {/* Batch Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {batch.batch_id}
                      </h3>
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(batch.status)}`}
                      >
                        {formatStatus(batch.status)}
                      </span>
                    </div>
                    {batch.risk_score && (
                      <div
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          batch.risk_score >= 70
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        Risk: {batch.risk_score}%
                      </div>
                    )}
                  </div>

                  {/* Main Batch Details - Focused on requested information */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {/* Grain Type */}
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Grain Type</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {batch.grain_type}
                        </p>
                        {batch.variety && <p className="text-xs text-gray-500">{batch.variety}</p>}
                      </div>
                    </div>

                    {/* Assigned Technician */}
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Technician</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {batch.assigned_technician?.name ||
                            batch.assigned_technician?.email ||
                            "Unassigned"}
                        </p>
                      </div>
                    </div>

                    {/* Intake Kg */}
                    <div className="flex items-center gap-2">
                      <Beaker className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Intake Kg</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {batch.intake_kg
                            ? `${Math.round(batch.intake_kg / 1000).toLocaleString()}t`
                            : batch.quantity_kg
                              ? `${Math.round(batch.quantity_kg / 1000).toLocaleString()}t`
                              : "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Intake Date */}
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Intake Date</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {batch.intake_date
                            ? formatDate(batch.intake_date)
                            : formatDate(batch.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Silo Information - Prominent display */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Silo Information
                      </span>
                    </div>
                    {batch.silos ? (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                          {batch.silos.name}
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                          ID: {batch.silos.silo_id}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400">No silo assigned</p>
                      </div>
                    )}
                  </div>

                  {/* Additional Details */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        {batch.moisture_content && (
                          <div className="flex items-center gap-1">
                            <Droplets className="h-3 w-3 text-blue-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              {batch.moisture_content}% moisture
                            </span>
                          </div>
                        )}
                        {batch.farmer_name && (
                          <span className="text-gray-600 dark:text-gray-400">
                            Farmer:{" "}
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {batch.farmer_name}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </>
    </LocalizedContent>
  );
}
