import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOpenOrders } from "@/lib/open-orders.functions";
import { X, Clock, User, Package, DollarSign, Calendar, Building2, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OpenOrdersSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OpenOrdersSidebar({ isOpen, onClose }: OpenOrdersSidebarProps) {
  const getOpenOrdersFn = useServerFn(getOpenOrders);
  const { data, isLoading, error } = useQuery({
    queryKey: ["open-orders"],
    queryFn: () => getOpenOrdersFn(),
    enabled: isOpen,
    refetchInterval: 30_000, // Refetch every 30 seconds when open
  });

  const orders = data?.orders || [];

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

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      year: "numeric",
      month: "short", 
      day: "numeric"
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      in_progress: "bg-green-100 text-green-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-US", { 
      style: "currency", 
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    });
  };

  const getDeadlineStatus = (deadlineString: string | null) => {
    if (!deadlineString) return null;
    
    const deadline = new Date(deadlineString);
    const now = new Date();
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'overdue', text: `${Math.abs(diffDays)} days overdue`, color: 'text-red-600' };
    } else if (diffDays <= 3) {
      return { status: 'urgent', text: `${diffDays} days left`, color: 'text-orange-600' };
    } else if (diffDays <= 7) {
      return { status: 'soon', text: `${diffDays} days left`, color: 'text-yellow-600' };
    }
    return { status: 'normal', text: `${diffDays} days left`, color: 'text-green-600' };
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
        <div className="flex items-center justify-between p-4 border-b bg-blue-50 dark:bg-blue-900/20">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Open Orders
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {orders.length} active buyer orders
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-red-600">
              <p>Error loading open orders</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <p>No open orders found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order: any) => {
                const deadlineStatus = getDeadlineStatus(order.delivery_deadline);
                return (
                  <div
                    key={order.id}
                    className="bg-card dark:bg-gray-800 rounded-lg p-4 border-gray-200 dark:border-gray-700"
                  >
                    {/* Order Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <Package className="h-4 w-4 text-blue-500" />
                          {order.order_number}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {formatStatus(order.status)}
                          </span>
                          {deadlineStatus && (
                            <span className={`text-xs font-medium ${deadlineStatus.color}`}>
                              {deadlineStatus.text}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">
                          {formatCurrency(order.total_amount)}
                        </div>
                        <div className="text-xs text-gray-500">Total Value</div>
                      </div>
                    </div>

                    {/* Order Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      {/* Grain Type */}
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Grain Type</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {order.grain_type || 'Not specified'}
                          </p>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Quantity</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {order.quantity_kg ? `${Math.round(order.quantity_kg / 1000).toLocaleString()}t` : 'TBD'}
                          </p>
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Created</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Price per kg */}
                      {order.price_per_kg && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Price/kg</p>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              ${order.price_per_kg.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Delivery Deadline */}
                    {order.delivery_deadline && (
                      <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Delivery Deadline:</span>
                          <span className={`text-sm font-medium ${deadlineStatus?.color || 'text-gray-900 dark:text-gray-100'}`}>
                            {formatDateOnly(order.delivery_deadline)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Buyer Information */}
                    {order.buyers && (
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Buyer Details</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {order.buyers.company_name || order.buyers.name}
                            </span>
                          </div>
                          {order.buyers.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-400">{order.buyers.email}</span>
                            </div>
                          )}
                          {order.buyers.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-400">{order.buyers.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {order.notes && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Notes:</span> {order.notes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}