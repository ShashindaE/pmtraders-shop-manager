"use client";

import { useAuth } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { MainLayout } from "@/components/layout/Sidebar";
import { useQuery, gql } from "@apollo/client";
import Link from "next/link";
import {
    Search,
    Filter,
    Loader2,
    Package,
    Plus,
    Truck,
    Clock,
    CheckCircle,
    AlertTriangle,
    Box,
    Building2,
} from "lucide-react";

// Order list with basic info
const ORDERS_LIST = gql`
  query OrdersList($first: Int!, $after: String, $filter: OrderFilterInput) {
    orders(first: $first, after: $after, filter: $filter) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          number
          created
          status
          paymentStatus
          total {
            gross {
              amount
              currency
            }
          }
          user {
            id
            email
            firstName
            lastName
            metadata {
              key
              value
            }
          }
          shippingAddress {
            firstName
            lastName
            phone
            streetAddress1
            city
          }
          metadata {
            key
            value
          }
        }
      }
    }
  }
`;

// Get all delivery trackings
const ALL_DELIVERY_TRACKINGS = gql`
  query AllDeliveryTrackings($first: Int) {
    pendingDeliveries(first: $first) {
      edges {
        node {
          id
          orderId
          status
          statusUpdatedAt
          assignedDriver {
            id
            firstName
            lastName
          }
        }
      }
    }
  }
`;

const statusOptions = [
    { value: "", label: "All Orders" },
    { value: "UNFULFILLED", label: "Unfulfilled" },
    { value: "PARTIALLY_FULFILLED", label: "Partially Fulfilled" },
    { value: "FULFILLED", label: "Fulfilled" },
    { value: "CANCELED", label: "Canceled" },
];

// Delivery status configuration with icons and colors
const DELIVERY_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
    "placed": { label: "Placed", color: "text-gray-600", bgColor: "bg-gray-100", icon: Clock },
    "processing": { label: "Processing", color: "text-blue-600", bgColor: "bg-blue-50", icon: Package },
    "ready_for_pickup": { label: "Ready for Pickup", color: "text-yellow-600", bgColor: "bg-yellow-50", icon: Box },
    "shipped": { label: "Shipped", color: "text-indigo-600", bgColor: "bg-indigo-50", icon: Truck },
    "out_for_delivery": { label: "Out for Delivery", color: "text-orange-600", bgColor: "bg-orange-50", icon: Truck },
    "delivered": { label: "Delivered", color: "text-green-600", bgColor: "bg-green-50", icon: CheckCircle },
    "failed": { label: "Failed", color: "text-red-600", bgColor: "bg-red-50", icon: AlertTriangle },
    "cancelled": { label: "Cancelled", color: "text-gray-500", bgColor: "bg-gray-100", icon: AlertTriangle },
};

function OrdersContent() {
    // ... existing Logic

    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
    const [searchQuery, setSearchQuery] = useState("");
    const [wholesaleOnly, setWholesaleOnly] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    // Update filter if URL param changes
    useEffect(() => {
        const status = searchParams.get("status");
        if (status) {
            setStatusFilter(status);
        }
    }, [searchParams]);

    // Parse specific deep-link IDs if provided
    const requestedIds = searchParams.get("ids")?.split(",") || null;

    // Fetch orders
    const { data: ordersData, loading: ordersLoading } = useQuery(ORDERS_LIST, {
        variables: {
            first: requestedIds ? 100 : 50, // Get more if filtering specific ones
            filter: {
                ...(statusFilter ? { status: [statusFilter] } : {}),
                ...(requestedIds ? { ids: requestedIds } : {})
            },
        },
        skip: !isAuthenticated,
    });

    // Fetch all delivery trackings
    const { data: trackingsData, loading: trackingsLoading } = useQuery(ALL_DELIVERY_TRACKINGS, {
        variables: { first: 100 },
        skip: !isAuthenticated,
    });

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--secondary-50)' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-500)' }} />
            </div>
        );
    }

    const orders = ordersData?.orders?.edges || [];
    const totalCount = ordersData?.orders?.totalCount || 0;
    const loading = ordersLoading || trackingsLoading;

    // Build tracking map by orderId
    const trackingMap = new Map<string, any>();
    trackingsData?.pendingDeliveries?.edges?.forEach((edge: any) => {
        if (edge.node.orderId) {
            trackingMap.set(edge.node.orderId, edge.node);
        }
    });

    // Helper function to get metadata value
    const getMetadataValue = (metadata: any[], key: string): string | null => {
        if (!metadata) return null;
        const item = metadata.find((m: any) => m.key === key);
        return item?.value || null;
    };

    // Check if customer is wholesale
    const isWholesaleCustomer = (user: any): boolean => {
        if (!user || !user.metadata) return false;
        const type = getMetadataValue(user.metadata, "customer_type");
        const status = getMetadataValue(user.metadata, "wholesale_status");
        return type === "wholesale" && status === "approved";
    };

    // Filter orders if wholesale filter is active
    const filteredOrders = wholesaleOnly
        ? orders.filter((edge: any) => isWholesaleCustomer(edge.node.user))
        : orders;

    // Get delivery status for an order
    const getDeliveryStatus = (orderId: string, saleorStatus: string): { status: string; config: typeof DELIVERY_STATUS_CONFIG[string] } => {
        const tracking = trackingMap.get(orderId);

        if (tracking) {
            const status = tracking.status?.toLowerCase() || "placed";
            return {
                status,
                config: DELIVERY_STATUS_CONFIG[status] || DELIVERY_STATUS_CONFIG["placed"],
            };
        }

        // Fallback based on Saleor status
        if (saleorStatus === "FULFILLED") {
            return { status: "delivered", config: DELIVERY_STATUS_CONFIG["delivered"] };
        }
        if (saleorStatus === "CANCELED") {
            return { status: "cancelled", config: DELIVERY_STATUS_CONFIG["cancelled"] };
        }
        return { status: "placed", config: DELIVERY_STATUS_CONFIG["placed"] };
    };

    // Navigate to order details
    const handleRowClick = (orderId: string) => {
        router.push(`/orders/${encodeURIComponent(orderId)}`);
    };

    return (
        <MainLayout>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Orders</h1>
                    <p style={{ color: 'var(--secondary-500)' }} className="mt-1">{totalCount} total orders</p>
                </div>
                <Link href="/orders/new" className="btn-primary flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Create Order
                </Link>
            </div>

            {/* Filters */}
            <div className="card p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--secondary-400)' }} />
                        <input
                            type="text"
                            placeholder="Search by order number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-field !pl-12"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5" style={{ color: 'var(--secondary-400)' }} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="select-field min-w-[180px]"
                        >
                            {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Wholesale Filter */}
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-gray-50" style={{ borderColor: wholesaleOnly ? 'var(--primary-500)' : 'var(--secondary-200)', backgroundColor: wholesaleOnly ? 'var(--primary-50)' : 'transparent' }}>
                        <input
                            type="checkbox"
                            checked={wholesaleOnly}
                            onChange={(e) => setWholesaleOnly(e.target.checked)}
                            className="w-4 h-4 rounded"
                        />
                        <Building2 className="w-4 h-4" style={{ color: wholesaleOnly ? 'var(--primary-600)' : 'var(--secondary-500)' }} />
                        <span className="text-sm font-medium" style={{ color: wholesaleOnly ? 'var(--primary-700)' : 'var(--secondary-700)' }}>Wholesale Only</span>
                    </label>
                </div>
            </div>

            {/* Orders Table */}
            <div className="card">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: 'var(--primary-500)' }} />
                        <p className="mt-2" style={{ color: 'var(--secondary-500)' }}>Loading orders...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="p-12 text-center">
                        <Package className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--secondary-300)' }} />
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--secondary-700)' }}>No orders found</h3>
                        <p className="mt-1" style={{ color: 'var(--secondary-500)' }}>
                            {statusFilter || wholesaleOnly ? "Try changing the filter" : "Orders will appear here when customers place them"}
                        </p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Status</th>
                                    <th>Payment</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((edge: any) => {
                                    const order = edge.node;
                                    const { status: deliveryStatus, config: statusConfig } = getDeliveryStatus(order.id, order.status);
                                    const StatusIcon = statusConfig.icon;
                                    const isWholesale = isWholesaleCustomer(order.user);
                                    const outstandingBalance = isWholesale ? parseFloat(getMetadataValue(order.metadata, "wholesale_outstanding") || "0") : 0;

                                    return (
                                        <tr
                                            key={order.id}
                                            onClick={() => handleRowClick(order.id)}
                                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                                        >
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold" style={{ color: 'var(--secondary-900)' }}>#{order.number}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ color: 'var(--secondary-600)' }}>
                                                    {new Date(order.created).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                            </td>
                                            <td>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium" style={{ color: 'var(--secondary-900)' }}>
                                                            {order.shippingAddress?.firstName || order.user?.firstName || "Guest"}{" "}
                                                            {order.shippingAddress?.lastName || order.user?.lastName || ""}
                                                        </p>
                                                        {isWholesale && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                                                <Building2 className="w-3 h-3" />
                                                                Wholesale
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm" style={{ color: 'var(--secondary-500)' }}>{order.user?.email || "-"}</p>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                    {statusConfig.label}
                                                </span>
                                            </td>
                                            <td>
                                                <div>
                                                    <span className={getPaymentBadge(order.paymentStatus)}>
                                                        {formatStatus(order.paymentStatus)}
                                                    </span>
                                                    {/* {isWholesale && outstandingBalance > 0 && (
                                                        <p className="text-xs text-red-600 font-medium mt-0.5">
                                                            Outstanding: Rs. {outstandingBalance.toLocaleString()}
                                                        </p>
                                                    )} */}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="font-semibold" style={{ color: 'var(--secondary-900)' }}>
                                                    Rs. {order.total?.gross?.amount?.toFixed(0) || "0.00"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}

function getPaymentBadge(status: string) {
    switch (status) {
        case "FULLY_CHARGED":
        case "FULLY_REFUNDED":
            return "badge-success";
        case "PENDING":
        case "NOT_CHARGED":
            return "badge-warning";
        case "PARTIALLY_CHARGED":
            return "badge-info";
        default:
            return "badge-secondary";
    }
}

function formatStatus(status: string) {
    if (!status) return "-";
    return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function OrdersPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        }>
            <OrdersContent />
        </Suspense>
    );
}
