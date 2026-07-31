import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOpenAlerts } from "@/lib/open-alerts.functions";
import { X, Clock, User, AlertTriangle, AlertCircle, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OpenAlertsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OpenAlertsSidebar({ isOpen, onClose }: OpenAlertsSidebarProps) {
  const getOpenAlertsFn = useServerFn(getOpenAlerts);
  const { data, isLoading, error } = useQuery({
    queryKey: ["open-alerts"],
    queryFn: () => getOpenAlertsFn(),
    enabled: isOpen,
    refetchInterval: 30_000, // Refetch every 30 seconds when open
  });

  const alerts = data?.alerts || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      year: "numeric",
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-100 text-red-800 border-red-200",
      high: "bg-orange-100 text-orange-800 border-orange-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-blue-100 text-blue-800 border-blue-200"
    };
    return colors[priority] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-red-100 text-red-800",
      acknowledged: "bg-yellow-100 text-yellow-800",
      escalated: "bg-orange-100 text-orange-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Shield className="h-4 w-4 text-yellow-500" />;
      case 'low': return <Zap className="h-4 w-4 text-blue-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatPriority = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  return (
    <>
      {/* Backdrop - only render when open (no shadow) */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 transition-opacity duration-300 ease-in-out"
          onClick={onClose}
          style={{
            opacity: isOpen ? 1 : 0
          }}
        />
      )}
      
      {/* Sliding Container - always render for smooth animation */}
      <div className={`
        fixed top-0 right-0 h-full w-[500px] bg-white dark:bg-gray-900 z-50 
        transform transition-all duration-300 ease-in-out border-l
        border-gray-200 dark:border-gray-700
        ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      style={{
        visibility: isOpen ? 'visible' : 'hidden',
        transitionDelay: isOpen ? '0ms' : '300ms'
      }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-red-50 dark:bg-red-900/20">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Open Alerts
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {alerts.length} active alerts requiring attention
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-red-600">
              <p>Error loading open alerts</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <p>No open alerts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert: any) => (
                <div
                  key={alert.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 ${
                    alert.priority === 'critical' ? 'border-l-red-500' : 
                    alert.priority === 'high' ? 'border-l-orange-500' :
                    alert.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
                  } border border-gray-200 dark:border-gray-700`}
                >
                  {/* Alert Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        {getPriorityIcon(alert.priority)}
                        {alert.title || alert.alert_id}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(alert.priority)}`}>
                          {formatPriority(alert.priority)}
                        </span>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                          {formatStatus(alert.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Alert Description */}
                  {alert.description && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      {alert.description}
                    </p>
                  )}

                  {/* Alert Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {/* Alert Type */}
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Type</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {alert.alert_type || 'General'}
                        </p>
                      </div>
                    </div>

                    {/* Triggered Date */}
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Triggered</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {formatDate(alert.triggered_at)}
                        </p>
                      </div>
                    </div>

                    {/* Assigned User */}
                    {alert.assigned_user && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Assigned To</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {alert.assigned_user.name || alert.assigned_user.email}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Silo Info */}
                    {alert.silos && (
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Silo</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {alert.silos.name}
                          </p>
                          <p className="text-xs text-gray-500">{alert.silos.silo_id}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional Details */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-600 dark:text-gray-400 text-xs">
                          Alert ID: <span className="font-mono">{alert.alert_id}</span>
                        </span>
                        {alert.batch_id && (
                          <span className="text-gray-600 dark:text-gray-400 text-xs">
                            Batch: <span className="font-mono">{alert.batch_id}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    {alert.acknowledged_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Acknowledged: {formatDate(alert.acknowledged_at)}
                      </p>
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