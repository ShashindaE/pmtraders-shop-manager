"use client";

import { useAuth } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { MainLayout } from "@/components/layout/Sidebar";
import { useQuery, useMutation, gql } from "@apollo/client";
import Link from "next/link";
import {
    Truck,
    Package,
    Loader2,
    User,
    MapPin,
    Phone,
    Clock,
    CheckCircle,
    AlertTriangle,
    Play,
    Eye,
} from "lucide-react";

// Query for orders ready for delivery (READY_FOR_PICKUP, SHIPPED, OUT_FOR_DELIVERY)
const ORDERS_FOR_DELIVERY = gql`
  query OrdersForDelivery($first: Int, $ids: [ID!]) {
    ordersReadyForDelivery(first: $first, ids: $ids) {
      totalCount
      edges {
        node {
          id
          orderId
          orderNumber
          status
          customerName
          customerPhone
          shippingAddress
          orderTotal
          itemsCount
          createdAt
          statusUpdatedAt
        }
      }
    }
  }
`;

// Mutation to update delivery status
const UPDATE_DELIVERY_STATUS = gql`
  mutation UpdateDeliveryStatus($input: UpdateDeliveryStatusInput!) {
    updateDeliveryStatus(input: $input) {
      tracking {
        id
        status
        statusUpdatedAt
      }
      errors {
        field
        message
      }
    }
  }
`;

// Status badge colors and labels (backend uses lowercase)
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    "placed": { label: "Order Placed", color: "text-gray-600", bgColor: "bg-gray-100" },
    "processing": { label: "Processing", color: "text-blue-600", bgColor: "bg-blue-100" },
    "ready_for_pickup": { label: "Ready for Pickup", color: "text-yellow-600", bgColor: "bg-yellow-100" },
    "shipped": { label: "Shipped", color: "text-indigo-600", bgColor: "bg-indigo-100" },
    "out_for_delivery": { label: "Out for Delivery", color: "text-orange-600", bgColor: "bg-orange-100" },
    "delivered": { label: "Delivered", color: "text-green-600", bgColor: "bg-green-100" },
    "failed": { label: "Failed", color: "text-red-600", bgColor: "bg-red-100" },
    "cancelled": { label: "Cancelled", color: "text-gray-500", bgColor: "bg-gray-100" },
};

// Get next status for a given status (lowercase)
const getNextStatus = (current: string): string | null => {
    const transitions: Record<string, string> = {
        "placed": "processing",
        "processing": "ready_for_pickup",
        "ready_for_pickup": "shipped",
        "shipped": "out_for_delivery",
        "out_for_delivery": "delivered",
    };
    return transitions[(current || "").toLowerCase()] || null;
};

function DeliveryContent() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Parse specific deep-link IDs if provided
    const requestedIds = searchParams.get("ids")?.split(",") || null;

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    const { data: deliveriesData, loading: loadingDeliveries, refetch } = useQuery(ORDERS_FOR_DELIVERY, {
        variables: {
            first: requestedIds ? 100 : 50,
            ...(requestedIds ? { ids: requestedIds } : {})
        },

        skip: !isAuthenticated,
        fetchPolicy: 'network-only', // Always fetch fresh data
        pollInterval: 30000, // Auto-refresh every 30 seconds
    });

    const [updateStatus, { loading: updating }] = useMutation(UPDATE_DELIVERY_STATUS, {
        onCompleted: (data) => {
            if (data.updateDeliveryStatus?.errors?.length > 0) {
                console.error("Status update errors:", data.updateDeliveryStatus.errors);
            }
            setUpdatingId(null);
            refetch();
        },
        onError: (error) => {
            console.error("Status update failed:", error);
            setUpdatingId(null);
        },
    });

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--secondary-50)' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-500)' }} />
            </div>
        );
    }

    const rawDeliveries = deliveriesData?.ordersReadyForDelivery?.edges || [];

    // Active = orders that still need action. Delivered/failed/cancelled are excluded from counts.
    const ACTIVE_STATUSES = ["placed", "processing", "ready_for_pickup", "shipped", "out_for_delivery"];
    const allDeliveries = rawDeliveries.filter(
        (edge: any) => ACTIVE_STATUSES.includes((edge.node.status || "").toLowerCase())
    );

    // "Delivered Today" computed separately from raw data (before the active filter)
    const todayStr = new Date().toDateString();
    const deliveredTodayCount = rawDeliveries.filter((edge: any) => {
        const status = (edge.node.status || "").toLowerCase();
        if (status !== "delivered") return false;
        const updatedAt = edge.node.statusUpdatedAt;
        if (!updatedAt) return false;
        return new Date(updatedAt).toDateString() === todayStr;
    }).length;

    // Filter deliveries by status (compare lowercase)
    const deliveries = statusFilter === "all"
        ? allDeliveries
        : allDeliveries.filter((e: any) => (e.node.status || "").toLowerCase() === statusFilter.toLowerCase());

    // Count by status (backend returns lowercase statuses)
    const statusCounts = allDeliveries.reduce((acc: Record<string, number>, edge: any) => {
        const status = (edge.node.status || "").toLowerCase();
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});


    const handleStatusUpdate = async (orderId: string, currentStatus: string) => {
        const nextStatus = getNextStatus(currentStatus);
        if (!nextStatus) return;

        setUpdatingId(orderId);
        try {
            await updateStatus({
                variables: {
                    input: {
                        orderId,
                        status: nextStatus,
                    },
                },
            });
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    };

    const getNextStatusLabel = (currentStatus: string): string | null => {
        const next = getNextStatus(currentStatus);
        if (!next) return null;
        return STATUS_CONFIG[next]?.label || next;
    };

    return (
        <MainLayout>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Delivery Queue</h1>
                    <p style={{ color: 'var(--secondary-500)' }} className="mt-1">
                        Manage orders ready for delivery
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="btn-secondary flex items-center gap-2"
                    disabled={loadingDeliveries}
                >
                    {loadingDeliveries ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Clock className="w-5 h-5" />
                    )}
                    Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div
                    className={`stat-card cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-primary-500' : ''}`}
                    onClick={() => setStatusFilter('all')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-label">All Orders</p>
                            <p className="stat-value">{loadingDeliveries ? "..." : allDeliveries.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div
                    className={`stat-card cursor-pointer transition-all ${statusFilter === 'ready_for_pickup' ? 'ring-2 ring-primary-500' : ''}`}
                    onClick={() => setStatusFilter('ready_for_pickup')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-label">Ready for Pickup</p>
                            <p className="stat-value text-yellow-600">{statusCounts['ready_for_pickup'] || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>
                </div>

                <div
                    className={`stat-card cursor-pointer transition-all ${statusFilter === 'out_for_delivery' ? 'ring-2 ring-primary-500' : ''}`}
                    onClick={() => setStatusFilter('out_for_delivery')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-label">Out for Delivery</p>
                            <p className="stat-value text-orange-600">{statusCounts['out_for_delivery'] || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                            <Truck className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </div>

                <div
                    className={`stat-card cursor-pointer transition-all ${statusFilter === 'delivered' ? 'ring-2 ring-primary-500' : ''}`}
                    onClick={() => setStatusFilter('delivered')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-label">Delivered Today</p>
                            <p className="stat-value text-green-600">{deliveredTodayCount}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Delivery Queue */}
            <div className="card">
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--secondary-100)' }}>
                    <h2 className="font-semibold" style={{ color: 'var(--secondary-900)' }}>
                        {statusFilter === 'all' ? 'All Orders' : STATUS_CONFIG[statusFilter]?.label || statusFilter}
                    </h2>
                    <span className="text-sm" style={{ color: 'var(--secondary-500)' }}>
                        {deliveries.length} order{deliveries.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {loadingDeliveries ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: 'var(--primary-500)' }} />
                    </div>
                ) : deliveries.length === 0 ? (
                    <div className="p-12 text-center">
                        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-300" />
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--secondary-700)' }}>
                            {statusFilter === 'all' ? 'No orders in queue' : `No ${STATUS_CONFIG[statusFilter]?.label || statusFilter} orders`}
                        </h3>
                        <p className="mt-1" style={{ color: 'var(--secondary-500)' }}>
                            Orders will appear here when ready for delivery
                        </p>
                    </div>
                ) : (
                    <div>
                        {deliveries.map((edge: any, index: number) => {
                            const delivery = edge.node;
                            const isUpdating = updatingId === delivery.orderId;
                            const nextStatusLabel = getNextStatusLabel(delivery.status);
                            const statusConfig = STATUS_CONFIG[(delivery.status || '').toLowerCase()] ?? { label: delivery.status || 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-100' };


                            return (
                                <div key={`${delivery.orderId}-${index}`} className="p-6" style={{ borderBottom: '1px solid var(--secondary-100)' }}>
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                        {/* Order Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="font-semibold" style={{ color: 'var(--secondary-900)' }}>
                                                    Order #{delivery.orderNumber}
                                                </span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                                                    {statusConfig.label}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm" style={{ color: 'var(--secondary-600)' }}>
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4" style={{ color: 'var(--secondary-400)' }} />
                                                    <span>{delivery.customerName || 'Guest'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4" style={{ color: 'var(--secondary-400)' }} />
                                                    <span>{delivery.customerPhone || '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 sm:col-span-2">
                                                    <MapPin className="w-4 h-4" style={{ color: 'var(--secondary-400)' }} />
                                                    <span>{delivery.shippingAddress || '-'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 mt-3 text-sm">
                                                <span style={{ color: 'var(--secondary-500)' }}>
                                                    <Package className="w-4 h-4 inline mr-1" />
                                                    {delivery.itemsCount} items
                                                </span>
                                                <span className="font-semibold" style={{ color: 'var(--primary-600)' }}>
                                                    Rs. {delivery.orderTotal?.toFixed(0) || '0.00'}
                                                </span>
                                                <span style={{ color: 'var(--secondary-400)' }}>
                                                    <Clock className="w-4 h-4 inline mr-1" />
                                                    {new Date(delivery.statusUpdatedAt || delivery.createdAt).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={`/orders/${delivery.orderId}`}
                                                className="btn-secondary flex items-center gap-2 text-sm py-2"
                                            >
                                                <Eye className="w-4 h-4" />
                                                View
                                            </Link>

                                            {nextStatusLabel && (
                                                <button
                                                    onClick={() => handleStatusUpdate(delivery.orderId, delivery.status)}
                                                    disabled={isUpdating}
                                                    className="btn-primary flex items-center gap-2 text-sm py-2"
                                                >
                                                    {isUpdating ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Play className="w-4 h-4" />
                                                    )}
                                                    {nextStatusLabel}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </MainLayout>
    );
}

export default function DeliveryWrapper() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
            <DeliveryContent />
        </Suspense>
    );
}
