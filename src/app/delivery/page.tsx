"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  query OrdersForDelivery($first: Int) {
    ordersReadyForDelivery(first: $first) {
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

// Status badge colors and labels
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    "PLACED": { label: "Order Placed", color: "text-gray-600", bgColor: "bg-gray-100" },
    "PROCESSING": { label: "Processing", color: "text-blue-600", bgColor: "bg-blue-100" },
    "READY_FOR_PICKUP": { label: "Ready for Pickup", color: "text-yellow-600", bgColor: "bg-yellow-100" },
    "SHIPPED": { label: "Shipped", color: "text-indigo-600", bgColor: "bg-indigo-100" },
    "OUT_FOR_DELIVERY": { label: "Out for Delivery", color: "text-orange-600", bgColor: "bg-orange-100" },
    "DELIVERED": { label: "Delivered", color: "text-green-600", bgColor: "bg-green-100" },
    "FAILED": { label: "Failed", color: "text-red-600", bgColor: "bg-red-100" },
    "CANCELLED": { label: "Cancelled", color: "text-gray-500", bgColor: "bg-gray-100" },
};

// Get next status for a given status
const getNextStatus = (current: string): string | null => {
    const transitions: Record<string, string> = {
        "READY_FOR_PICKUP": "OUT_FOR_DELIVERY",
        "SHIPPED": "OUT_FOR_DELIVERY",
        "OUT_FOR_DELIVERY": "DELIVERED",
    };
    return transitions[current] || null;
};

export default function DeliveryPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    const { data: deliveriesData, loading: loadingDeliveries, refetch } = useQuery(ORDERS_FOR_DELIVERY, {
        variables: { first: 100 },
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

    // Deduplicate by orderId (in case there are multiple tracking records for the same order)
    const seenOrderIds = new Set<string>();
    const allDeliveries = rawDeliveries.filter((edge: any) => {
        const orderId = edge.node.orderId;
        if (seenOrderIds.has(orderId)) {
            return false; // Skip duplicate
        }
        seenOrderIds.add(orderId);
        return true;
    });

    // Filter deliveries by status
    const deliveries = statusFilter === "all"
        ? allDeliveries
        : allDeliveries.filter((e: any) => e.node.status === statusFilter);

    // Count by status
    const statusCounts = allDeliveries.reduce((acc: Record<string, number>, edge: any) => {
        const status = edge.node.status;
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
                    className={`stat-card cursor-pointer transition-all ${statusFilter === 'READY_FOR_PICKUP' ? 'ring-2 ring-primary-500' : ''}`}
                    onClick={() => setStatusFilter('READY_FOR_PICKUP')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-label">Ready for Pickup</p>
                            <p className="stat-value text-yellow-600">{statusCounts['READY_FOR_PICKUP'] || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>
                </div>

                <div
                    className={`stat-card cursor-pointer transition-all ${statusFilter === 'OUT_FOR_DELIVERY' ? 'ring-2 ring-primary-500' : ''}`}
                    onClick={() => setStatusFilter('OUT_FOR_DELIVERY')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-label">Out for Delivery</p>
                            <p className="stat-value text-orange-600">{statusCounts['OUT_FOR_DELIVERY'] || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                            <Truck className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </div>

                <div
                    className={`stat-card cursor-pointer transition-all ${statusFilter === 'DELIVERED' ? 'ring-2 ring-primary-500' : ''}`}
                    onClick={() => setStatusFilter('DELIVERED')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-label">Delivered Today</p>
                            <p className="stat-value text-green-600">{statusCounts['DELIVERED'] || 0}</p>
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
                            const statusConfig = STATUS_CONFIG[delivery.status] || STATUS_CONFIG['PLACED'];

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
                                                    Rs. {delivery.orderTotal?.toFixed(2) || '0.00'}
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
