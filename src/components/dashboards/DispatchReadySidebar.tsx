import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDispatchReadyBatches } from "@/lib/dispatch-ready-batches.functions";
import {
  X,
  Clock,
  User,
  Beaker,
  Droplets,
  Package,
  Truck,
  CheckCircle,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DispatchReadySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DispatchReadySidebar({ isOpen, onClose }: DispatchReadySidebarProps) {
  const getDispatchReadyBatchesFn = useServerFn(getDispatchReadyBatches);
  const { data, isLoading, error } = useQuery({
    queryKey: ["dispatch-ready-batches"],
    queryFn: () => getDispatchReadyBatchesFn(),
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
      ready: "bg-green-100 text-green-800",
      stored: "bg-blue-100 text-blue-800",
      qc_passed: "bg-emerald-100 text-emerald-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getDispatchStatusIcon = (status: string) => {
    switch (status) {
      case "ready":
        return <Truck className="h-4 w-4 text-green-500" />;
      case "stored":
        return <Package className="h-4 w-4 text-blue-500" />;
      case "qc_passed":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      default:
        return <Truck className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatCurrency = (pricePerKg: number, quantityKg: number) => {
    const totalValue = pricePerKg * quantityKg;
    return totalValue.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
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
        <div className="flex items-center justify-between p-4 border-b bg-green-50 dark:bg-green-900/20">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-600" />
              Ready to Dispatch
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {batches.length} batches ready for shipment
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-red-600">
              <p>Error loading dispatch ready batches</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <p>No batches ready for dispatch found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {batches.map((batch: any) => (
                <div
                  key={batch.id}
                  className="bg-card dark:bg-gray-800 rounded-lg p-4 border-gray-200 dark:border-gray-700"
                >
                  {/* Batch Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        {getDispatchStatusIcon(batch.status)}
                        {batch.batch_id}
                      </h3>
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(batch.status)}`}
                      >
                        {formatStatus(batch.status)}
                      </span>
                    </div>
                    {batch.purchase_price_per_kg && (
                      <div className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(batch.purchase_price_per_kg, batch.quantity_kg)}
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
                        <p className="text-gray-600 dark:text-gray-400">Technician</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {batch.assigned_technician?.name ||
                            batch.assigned_technician?.email ||
                            "Unassigned"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dispatch-Specific Details */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-3 gap-3 text-sm mb-2">
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
                          <CheckCircle className="h-3 w-3 text-green-400" />
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Protein</p>
                            <p className="text-xs font-medium">{batch.protein_content}%</p>
                          </div>
                        </div>
                      )}
                      {batch.purchase_price_per_kg && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-yellow-500" />
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Price/kg</p>
                            <p className="text-xs font-medium">
                              ${batch.purchase_price_per_kg.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      {batch.silos && (
                        <span className="text-gray-600 dark:text-gray-400">
                          Silo:{" "}
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {batch.silos.name}
                          </span>
                        </span>
                      )}
                      {batch.intake_date && (
                        <span className="text-xs text-gray-500">
                          Intake: {formatDate(batch.intake_date)}
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
  );
}
