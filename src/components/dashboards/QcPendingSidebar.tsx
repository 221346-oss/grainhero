import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getQcPendingBatches } from "@/lib/qc-pending-batches.functions";
import { X, Clock, User, Beaker, Droplets, Package, TestTube, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocalizedContent } from "@/i18n";

interface QcPendingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QcPendingSidebar({ isOpen, onClose }: QcPendingSidebarProps) {
  const getQcPendingBatchesFn = useServerFn(getQcPendingBatches);
  const { data, isLoading, error } = useQuery({
    queryKey: ["qc-pending-batches"],
    queryFn: () => getQcPendingBatchesFn(),
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
      pending_qc: "bg-orange-100 text-orange-800",
      qc_submitted: "bg-blue-100 text-blue-800",
      qc_failed: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getQcStatusIcon = (status: string) => {
    switch (status) {
      case "pending_qc":
        return <TestTube className="h-4 w-4 text-orange-500" />;
      case "qc_submitted":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "qc_failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <TestTube className="h-4 w-4 text-gray-400" />;
    }
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
        <div className="flex items-center justify-between p-4 border-b bg-orange-50 dark:bg-orange-900/20">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <TestTube className="h-5 w-5 text-orange-600" />
              QC Pending Batches
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {batches.length} batches awaiting quality control
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-red-600">
              <p>Error loading QC pending batches</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <p>No batches pending QC found</p>
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
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        {getQcStatusIcon(batch.status)}
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

                  {/* Batch Details Grid */}
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

                    {/* Quantity */}
                    <div className="flex items-center gap-2">
                      <Beaker className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Quantity</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {Math.round(batch.quantity_kg / 1000).toLocaleString()}t
                        </p>
                      </div>
                    </div>

                    {/* Created Date */}
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Created</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {formatDate(batch.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Assigned Technician */}
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">QC Technician</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {batch.assigned_technician?.name ||
                            batch.assigned_technician?.email ||
                            "Unassigned"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* QC-Specific Details */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      {batch.moisture_content && (
                        <div className="flex items-center gap-1">
                          <Droplets className="h-3 w-3 text-blue-400" />
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Moisture</p>
                            <p className="text-xs font-medium">{batch.moisture_content}%</p>
                          </div>
                        </div>
                      )}
                      {batch.protein_content && (
                        <div className="flex items-center gap-1">
                          <TestTube className="h-3 w-3 text-green-400" />
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Protein</p>
                            <p className="text-xs font-medium">{batch.protein_content}%</p>
                          </div>
                        </div>
                      )}
                      {batch.fat_content && (
                        <div className="flex items-center gap-1">
                          <Beaker className="h-3 w-3 text-yellow-400" />
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Fat</p>
                            <p className="text-xs font-medium">{batch.fat_content}%</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      {batch.silos && (
                        <span className="text-gray-600 dark:text-gray-400">
                          Silo:{" "}
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {batch.silos.name}
                          </span>
                        </span>
                      )}
                    </div>
                    {batch.farmer_name && (
                      <p className="text-xs text-gray-500 mt-1">Farmer: {batch.farmer_name}</p>
                    )}
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
