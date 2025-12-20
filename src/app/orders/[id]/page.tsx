"use client";

import { useAuth } from "@/lib/auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/Sidebar";
import { useQuery, useMutation } from "@apollo/client";
import { ORDER_DETAILS, ORDER_FULFILL, WAREHOUSES_LIST } from "@/lib/graphql";
import { gql } from "@apollo/client";
import Link from "next/link";
import {
    ArrowLeft,
    Package,
    Truck,
    User,
    MapPin,
    Phone,
    Mail,
    CheckCircle,
    Loader2,
    Clock,
    AlertTriangle,
    Play,
    Check,
} from "lucide-react";

// Delivery tracking queries
const ORDER_DELIVERY_TRACKING = gql`
  query OrderDeliveryTracking($orderId: ID!) {
    orderDeliveryTracking(orderId: $orderId) {
      id
      status
      statusUpdatedAt
      deliveryNotes
      assignedDriver {
        id
        firstName
        lastName
        email
      }
      processingStartedAt
      shippedAt
      deliveredAt
    }
  }
`;

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

// Delivery status options for shop manager
const DELIVERY_STATUSES = [
    { value: "placed", label: "Order Placed", color: "gray", icon: Clock },
    { value: "processing", label: "Processing", color: "blue", icon: Package },
    { value: "ready_for_pickup", label: "Ready for Pickup", color: "yellow", icon: Package },
    { value: "shipped", label: "Shipped", color: "indigo", icon: Truck },
    { value: "out_for_delivery", label: "Out for Delivery", color: "orange", icon: Truck },
    { value: "delivered", label: "Delivered", color: "green", icon: CheckCircle },
    { value: "failed", label: "Failed", color: "red", icon: AlertTriangle },
    { value: "cancelled", label: "Cancelled", color: "gray", icon: AlertTriangle },
];

// Timeline steps for progress visualization (only 5 main steps)
const TIMELINE_STEPS = [
    { value: "placed", label: "Placed" },
    { value: "processing", label: "Processing" },
    { value: "ready_for_pickup", label: "Ready" },
    { value: "out_for_delivery", label: "Out for Delivery" },
    { value: "delivered", label: "Delivered" },
];

// Map any status to timeline step index
const getTimelineIndex = (status: string): number => {
    const mapping: Record<string, number> = {
        "placed": 0,
        "processing": 1,
        "ready_for_pickup": 2,
        "shipped": 3, // Shipped maps to out_for_delivery in timeline
        "out_for_delivery": 3,
        "delivered": 4,
    };
    return mapping[status] ?? -1;
};

export default function OrderDetailsPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const orderId = params.id as string;
    const [fulfilling, setFulfilling] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
    const [fulfillError, setFulfillError] = useState<string | null>(null);
    const [autoFulfillAttempted, setAutoFulfillAttempted] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    const { data, loading, refetch } = useQuery(ORDER_DETAILS, {
        variables: { id: orderId },
        skip: !isAuthenticated || !orderId,
    });

    const { data: trackingData, refetch: refetchTracking } = useQuery(ORDER_DELIVERY_TRACKING, {
        variables: { orderId },
        skip: !isAuthenticated || !orderId,
    });

    const { data: warehouseData } = useQuery(WAREHOUSES_LIST, {
        skip: !isAuthenticated,
    });

    const [fulfillOrder] = useMutation(ORDER_FULFILL);
    const [updateDeliveryStatus] = useMutation(UPDATE_DELIVERY_STATUS);

    // Auto-select first warehouse
    useEffect(() => {
        if (warehouseData?.warehouses?.edges?.length > 0 && !selectedWarehouse) {
            setSelectedWarehouse(warehouseData.warehouses.edges[0].node.id);
        }
    }, [warehouseData, selectedWarehouse]);

    // Auto-fulfill when order is delivered but not fulfilled
    useEffect(() => {
        const autoFulfillDeliveredOrder = async () => {
            const order = data?.order;
            const tracking = trackingData?.orderDeliveryTracking;

            // Check conditions:
            // 1. Order exists
            // 2. Tracking exists and status is DELIVERED
            // 3. Order is not already fulfilled
            // 4. We haven't already attempted auto-fulfill
            // 5. Warehouse is available
            const isDelivered = tracking?.status?.toLowerCase() === 'delivered';
            const isUnfulfilled = order?.status === 'UNFULFILLED';
            const warehouseId = selectedWarehouse || warehouseData?.warehouses?.edges?.[0]?.node?.id;

            if (order && isDelivered && isUnfulfilled && !autoFulfillAttempted && warehouseId && !fulfilling) {
                console.log("Auto-fulfilling delivered order...");
                setAutoFulfillAttempted(true);
                setFulfilling(true);

                try {
                    const lines = order.lines.map((line: any) => ({
                        orderLineId: line.id,
                        stocks: [{ quantity: line.quantity, warehouse: warehouseId }],
                    }));

                    const result = await fulfillOrder({
                        variables: {
                            order: order.id,
                            input: {
                                lines,
                                notifyCustomer: true,
                            },
                        },
                    });

                    if (result.data?.orderFulfill?.errors?.length > 0) {
                        console.error("Auto-fulfill errors:", result.data.orderFulfill.errors);
                    } else {
                        console.log("Order auto-fulfilled successfully!");
                        refetch(); // Refetch to update the status
                    }
                } catch (error) {
                    console.error("Auto-fulfill error:", error);
                }

                setFulfilling(false);
            }
        };

        autoFulfillDeliveredOrder();
    }, [data, trackingData, selectedWarehouse, warehouseData, autoFulfillAttempted, fulfilling, fulfillOrder, refetch]);

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--secondary-50)' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-500)' }} />
            </div>
        );
    }

    const order = data?.order;
    const tracking = trackingData?.orderDeliveryTracking;
    const warehouses = warehouseData?.warehouses?.edges || [];

    const handleFulfill = async () => {
        if (!order || !selectedWarehouse) {
            setFulfillError("Please select a warehouse first");
            return;
        }

        setFulfilling(true);
        setFulfillError(null);

        try {
            const lines = order.lines.map((line: any) => ({
                orderLineId: line.id,
                stocks: [{ quantity: line.quantity, warehouse: selectedWarehouse }],
            }));

            const result = await fulfillOrder({
                variables: {
                    order: order.id,
                    input: {
                        lines,
                        notifyCustomer: true,
                    },
                },
            });

            if (result.data?.orderFulfill?.errors?.length > 0) {
                setFulfillError(result.data.orderFulfill.errors[0].message);
            } else {
                refetch();
            }
        } catch (error: any) {
            console.error("Fulfillment error:", error);
            setFulfillError(error.message || "Failed to fulfill order");
        }
        setFulfilling(false);
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!order) return;

        setUpdatingStatus(true);
        const statusValue = newStatus.toUpperCase();
        console.log("Attempting status update with:", { orderId: order.id, status: statusValue });
        try {
            const result = await updateDeliveryStatus({
                variables: {
                    input: {
                        orderId: order.id,
                        status: statusValue,
                    },
                },
            });
            console.log("Update result:", result);
            if (result.data?.updateDeliveryStatus?.errors?.length > 0) {
                console.error("GraphQL mutation errors:", result.data.updateDeliveryStatus.errors);
            }
            if (result.errors) {
                console.error("GraphQL base errors:", result.errors);
            }

            // Auto-fulfill the order when marked as DELIVERED
            if (statusValue === 'DELIVERED' && !result.errors && !result.data?.updateDeliveryStatus?.errors?.length) {
                console.log("Order delivered - auto-fulfilling...");
                // Get warehouse if not selected
                let warehouseId = selectedWarehouse;
                if (!warehouseId && warehouseData?.warehouses?.edges?.[0]?.node?.id) {
                    warehouseId = warehouseData.warehouses.edges[0].node.id;
                }

                if (warehouseId) {
                    try {
                        // Auto-fulfill the order
                        const lines = order.lines.map((line: any) => ({
                            orderLineId: line.id,
                            stocks: [{ quantity: line.quantity, warehouse: warehouseId }],
                        }));

                        await fulfillOrder({
                            variables: {
                                order: order.id,
                                input: {
                                    lines,
                                    notifyCustomer: true,
                                },
                            },
                        });
                        console.log("Order auto-fulfilled successfully");
                    } catch (fulfillError) {
                        console.error("Auto-fulfill error:", fulfillError);
                    }
                }
            }

            refetchTracking();
            refetch(); // Refetch order details to update fulfillment status
        } catch (error: any) {
            console.error("Status update catch error:", error);
            console.error("Error message:", error.message);
            if (error.networkError?.result) {
                console.error("Network error result:", JSON.stringify(error.networkError.result, null, 2));
            }
            if (error.graphQLErrors) {
                console.error("GraphQL errors:", JSON.stringify(error.graphQLErrors, null, 2));
            }
        }
        setUpdatingStatus(false);
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-500)' }} />
                </div>
            </MainLayout>
        );
    }

    if (!order) {
        return (
            <MainLayout>
                <div className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--secondary-300)' }} />
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--secondary-700)' }}>Order not found</h2>
                    <Link href="/orders" className="btn-primary mt-4 inline-block">
                        Back to Orders
                    </Link>
                </div>
            </MainLayout>
        );
    }

    const canFulfill = order.status === "UNFULFILLED" || order.status === "PARTIALLY_FULFILLED";
    // Normalize status to lowercase (GraphQL returns uppercase enum names like "PLACED", 
    // but DELIVERY_STATUSES uses lowercase values like "placed")
    const currentStatus = (tracking?.status || "PLACED").toLowerCase();
    const currentStatusInfo = DELIVERY_STATUSES.find(s => s.value === currentStatus) || DELIVERY_STATUSES[0];

    // Get next allowed statuses for shop manager
    const getNextStatuses = (current: string) => {
        const transitions: Record<string, string[]> = {
            placed: ["processing", "cancelled"],
            processing: ["ready_for_pickup", "cancelled"],
            ready_for_pickup: ["shipped", "cancelled"],
        };
        return transitions[current] || [];
    };

    const nextStatuses = getNextStatuses(currentStatus);


    return (
        <MainLayout>
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/orders"
                    className="inline-flex items-center gap-2 mb-4 hover:opacity-80"
                    style={{ color: 'var(--secondary-600)' }}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Orders
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--secondary-900)' }}>
                            Order #{order.number}
                        </h1>
                        <p className="mt-1" style={{ color: 'var(--secondary-500)' }}>
                            Placed on {new Date(order.created).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className={`${getStatusBadge(order.status)} text-sm px-3 py-1`}>
                            {formatStatus(order.status)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column - Order Items & Tracking */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Delivery Tracking Status */}
                    <div className="card">
                        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--secondary-100)' }}>
                            <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--secondary-900)' }}>
                                <Truck className="w-5 h-5" style={{ color: 'var(--secondary-500)' }} />
                                Delivery Status
                            </h2>
                        </div>
                        <div className="p-6">
                            {/* Current Status */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getDeliveryStatusBg(currentStatus)}`}>
                                    <currentStatusInfo.icon className={`w-6 h-6 ${getDeliveryStatusColor(currentStatus)}`} />
                                </div>
                                <div>
                                    <p className="font-semibold text-lg" style={{ color: 'var(--secondary-900)' }}>
                                        {currentStatusInfo.label}
                                    </p>
                                    {tracking?.statusUpdatedAt && (
                                        <p className="text-sm" style={{ color: 'var(--secondary-500)' }}>
                                            Updated {new Date(tracking.statusUpdatedAt).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Status Timeline - 5 Steps */}
                            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                                {TIMELINE_STEPS.map((step, index) => {
                                    const currentIndex = getTimelineIndex(currentStatus);
                                    const isActive = index === currentIndex;
                                    const isPast = currentIndex > index;
                                    const isComplete = currentStatus === 'delivered' && index <= currentIndex;
                                    return (
                                        <div key={step.value} className="flex items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                                                ${isComplete || isPast ? 'bg-green-100 text-green-600' :
                                                    isActive ? 'bg-blue-100 text-blue-600' :
                                                        'bg-gray-100 text-gray-400'}`}>
                                                {isComplete || isPast ? <Check className="w-4 h-4" /> : index + 1}
                                            </div>
                                            {index < TIMELINE_STEPS.length - 1 && (
                                                <div className={`w-8 h-1 ${isComplete || isPast ? 'bg-green-200' : 'bg-gray-200'}`} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Update Status Buttons */}
                            {nextStatuses.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {nextStatuses.map(status => {
                                        const statusInfo = DELIVERY_STATUSES.find(s => s.value === status);
                                        if (!statusInfo) return null;
                                        return (
                                            <button
                                                key={status}
                                                onClick={() => handleStatusUpdate(status)}
                                                disabled={updatingStatus}
                                                className={`btn-secondary flex items-center gap-2 ${status === 'cancelled' ? 'hover:bg-red-50 hover:text-red-600' : ''
                                                    }`}
                                            >
                                                {updatingStatus ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Play className="w-4 h-4" />
                                                )}
                                                Move to {statusInfo.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Assigned Driver */}
                            {tracking?.assignedDriver && (
                                <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--secondary-50)' }}>
                                    <p className="text-sm font-medium mb-2" style={{ color: 'var(--secondary-600)' }}>
                                        Assigned Driver
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary-100)' }}>
                                            <User className="w-5 h-5" style={{ color: 'var(--primary-600)' }} />
                                        </div>
                                        <div>
                                            <p className="font-semibold" style={{ color: 'var(--secondary-900)' }}>
                                                {tracking.assignedDriver.firstName} {tracking.assignedDriver.lastName}
                                            </p>
                                            <p className="text-sm" style={{ color: 'var(--secondary-500)' }}>
                                                {tracking.assignedDriver.email}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="card">
                        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--secondary-100)' }}>
                            <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--secondary-900)' }}>
                                <Package className="w-5 h-5" style={{ color: 'var(--secondary-500)' }} />
                                Order Items ({order.lines.length})
                            </h2>
                        </div>
                        <div className="divide-y" style={{ borderColor: 'var(--secondary-100)' }}>
                            {order.lines.map((line: any) => (
                                <div key={line.id} className="p-4 flex items-center gap-4">
                                    {line.thumbnail?.url ? (
                                        <img
                                            src={line.thumbnail.url}
                                            alt={line.productName}
                                            className="w-16 h-16 object-cover rounded-lg"
                                            style={{ backgroundColor: 'var(--secondary-100)' }}
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--secondary-100)' }}>
                                            <Package className="w-6 h-6" style={{ color: 'var(--secondary-400)' }} />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <h3 className="font-medium" style={{ color: 'var(--secondary-900)' }}>{line.productName}</h3>
                                        {line.variantName && (
                                            <p className="text-sm" style={{ color: 'var(--secondary-500)' }}>{line.variantName}</p>
                                        )}
                                        <p className="text-sm mt-1" style={{ color: 'var(--secondary-600)' }}>
                                            Qty: {line.quantity} × Rs. {line.unitPrice?.gross?.amount?.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold" style={{ color: 'var(--secondary-900)' }}>
                                            Rs. {line.totalPrice?.gross?.amount?.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Totals */}
                        <div className="px-6 py-4 space-y-2" style={{ backgroundColor: 'var(--secondary-50)' }}>
                            <div className="flex justify-between" style={{ color: 'var(--secondary-600)' }}>
                                <span>Subtotal</span>
                                <span>Rs. {order.subtotal?.gross?.amount?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between" style={{ color: 'var(--secondary-600)' }}>
                                <span>Shipping</span>
                                <span>Rs. {order.shippingPrice?.gross?.amount?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-lg pt-2" style={{ color: 'var(--secondary-900)', borderTop: '1px solid var(--secondary-200)' }}>
                                <span>Total</span>
                                <span>Rs. {order.total?.gross?.amount?.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Fulfillment Section */}
                    {canFulfill && (
                        <div className="card">
                            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--secondary-100)' }}>
                                <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--secondary-900)' }}>
                                    <CheckCircle className="w-5 h-5" style={{ color: 'var(--secondary-500)' }} />
                                    Fulfill Order
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--secondary-700)' }}>
                                        Select Warehouse
                                    </label>
                                    <select
                                        value={selectedWarehouse}
                                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                                        className="select-field w-full max-w-xs"
                                    >
                                        <option value="">Select warehouse...</option>
                                        {warehouses.map((w: any) => (
                                            <option key={w.node.id} value={w.node.id}>{w.node.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {fulfillError && (
                                    <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        {fulfillError}
                                    </div>
                                )}

                                <button
                                    onClick={handleFulfill}
                                    disabled={fulfilling || !selectedWarehouse}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    {fulfilling ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4" />
                                    )}
                                    Mark as Fulfilled
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Existing Fulfillments */}
                    {order.fulfillments?.length > 0 && (
                        <div className="card">
                            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--secondary-100)' }}>
                                <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--secondary-900)' }}>
                                    <Truck className="w-5 h-5" style={{ color: 'var(--secondary-500)' }} />
                                    Fulfillments
                                </h2>
                            </div>
                            <div className="p-6 space-y-4">
                                {order.fulfillments.map((fulfillment: any) => (
                                    <div key={fulfillment.id} className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                        <div>
                                            <p className="font-medium text-green-800">
                                                Fulfilled on {new Date(fulfillment.created).toLocaleDateString()}
                                            </p>
                                            <p className="text-sm text-green-600">
                                                {fulfillment.lines.length} item(s)
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Customer */}
                    <div className="card p-6">
                        <h2 className="font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--secondary-900)' }}>
                            <User className="w-5 h-5" style={{ color: 'var(--secondary-500)' }} />
                            Customer
                        </h2>
                        {order.user ? (
                            <div className="space-y-3">
                                <p className="font-medium" style={{ color: 'var(--secondary-900)' }}>
                                    {order.user.firstName} {order.user.lastName}
                                </p>
                                <div className="flex items-center gap-2" style={{ color: 'var(--secondary-600)' }}>
                                    <Mail className="w-4 h-4" />
                                    <span className="text-sm">{order.user.email}</span>
                                </div>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--secondary-500)' }}>Guest checkout</p>
                        )}
                    </div>

                    {/* Shipping Address */}
                    {order.shippingAddress && (
                        <div className="card p-6">
                            <h2 className="font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--secondary-900)' }}>
                                <MapPin className="w-5 h-5" style={{ color: 'var(--secondary-500)' }} />
                                Shipping Address
                            </h2>
                            <div className="space-y-2" style={{ color: 'var(--secondary-600)' }}>
                                <p className="font-medium" style={{ color: 'var(--secondary-900)' }}>
                                    {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                                </p>
                                <p>{order.shippingAddress.streetAddress1}</p>
                                {order.shippingAddress.streetAddress2 && (
                                    <p>{order.shippingAddress.streetAddress2}</p>
                                )}
                                <p>
                                    {order.shippingAddress.city}
                                    {order.shippingAddress.postalCode && `, ${order.shippingAddress.postalCode}`}
                                </p>
                                {order.shippingAddress.phone && (
                                    <div className="flex items-center gap-2 pt-2">
                                        <Phone className="w-4 h-4" />
                                        <span>{order.shippingAddress.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Payment Status */}
                    <div className="card p-6">
                        <h2 className="font-semibold mb-4" style={{ color: 'var(--secondary-900)' }}>Payment</h2>
                        <span className={getPaymentBadge(order.paymentStatus)}>
                            {formatStatus(order.paymentStatus)}
                        </span>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

function getStatusBadge(status: string) {
    switch (status) {
        case "FULFILLED":
            return "badge-success";
        case "PARTIALLY_FULFILLED":
            return "badge-info";
        case "UNFULFILLED":
            return "badge-warning";
        case "CANCELED":
            return "badge-danger";
        default:
            return "badge-secondary";
    }
}

function getPaymentBadge(status: string) {
    switch (status) {
        case "FULLY_CHARGED":
        case "FULLY_REFUNDED":
            return "badge-success";
        case "PENDING":
        case "NOT_CHARGED":
            return "badge-warning";
        default:
            return "badge-secondary";
    }
}

function formatStatus(status: string) {
    if (!status) return "-";
    return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

function getDeliveryStatusBg(status: string) {
    switch (status) {
        case "placed": return "bg-gray-100";
        case "processing": return "bg-blue-100";
        case "ready_for_pickup": return "bg-yellow-100";
        case "shipped": return "bg-indigo-100";
        case "out_for_delivery": return "bg-orange-100";
        case "delivered": return "bg-green-100";
        case "failed":
        case "cancelled": return "bg-red-100";
        default: return "bg-gray-100";
    }
}

function getDeliveryStatusColor(status: string) {
    switch (status) {
        case "placed": return "text-gray-600";
        case "processing": return "text-blue-600";
        case "ready_for_pickup": return "text-yellow-600";
        case "shipped": return "text-indigo-600";
        case "out_for_delivery": return "text-orange-600";
        case "delivered": return "text-green-600";
        case "failed":
        case "cancelled": return "text-red-600";
        default: return "text-gray-600";
    }
}
