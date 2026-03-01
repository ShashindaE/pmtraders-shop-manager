"use client";

import { useAuth } from "@/lib/auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/Sidebar";
import { DeliveryScheduleCard } from "@/components/DeliveryScheduleCard";
import { useQuery, useMutation } from "@apollo/client";
import { ORDER_DETAILS, ORDER_FULFILL, WAREHOUSES_LIST, DRIVERS_LIST } from "@/lib/graphql";
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
    Printer,
    Building2,
    CreditCard,
    DollarSign,
    FileText,
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

const ASSIGN_DELIVERY_DRIVER = gql`
  mutation AssignDeliveryDriver($input: AssignDeliveryDriverInput!) {
    assignDeliveryDriver(input: $input) {
      tracking {
        id
        status
        assignedDriver {
          id
          firstName
          lastName
          email
        }
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

// Helper function to get metadata value
const getMetadataValue = (metadata: any[], key: string): string | null => {
    if (!metadata) return null;
    const item = metadata.find((m: any) => m.key === key);
    return item?.value || null;
};

// Record Payment Modal
function RecordPaymentModal({
    isOpen,
    onClose,
    orderId,
    orderNumber,
    outstandingBalance,
    onSuccess,
}: {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    orderNumber: string;
    outstandingBalance: number;
    onSuccess: () => void;
}) {
    const [amount, setAmount] = useState(outstandingBalance.toString());
    const [method, setMethod] = useState("cash");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setAmount(outstandingBalance.toString());
    }, [outstandingBalance]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            const accessToken = localStorage.getItem("saleor_token");
            if (!accessToken) throw new Error("Not authenticated");

            const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api-production-9c55.up.railway.app";
            const response = await fetch(`${API_URL}/api/wholesale/payments/`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    order_id: orderId,
                    amount,
                    method,
                    note,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to record payment");
            }

            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to record payment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--secondary-900)' }}>
                    Record Payment - Order #{orderNumber}
                </h3>

                <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--secondary-50)' }}>
                    <div className="flex justify-between text-sm">
                        <span style={{ color: 'var(--secondary-600)' }}>Outstanding Balance:</span>
                        <span className="font-medium text-red-600">Rs. {outstandingBalance.toLocaleString()}</span>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--secondary-700)' }}>
                            Amount (Rs.)
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            max={outstandingBalance}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                            style={{ borderColor: 'var(--secondary-200)' }}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--secondary-700)' }}>
                            Payment Method
                        </label>
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                            style={{ borderColor: 'var(--secondary-200)' }}
                        >
                            <option value="cash">Cash</option>
                            <option value="bank">Bank Transfer</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--secondary-700)' }}>
                            Note (optional)
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                            style={{ borderColor: 'var(--secondary-200)' }}
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border rounded-lg font-medium"
                        style={{ borderColor: 'var(--secondary-200)', color: 'var(--secondary-700)' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !amount || parseFloat(amount) <= 0}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Record Payment
                    </button>
                </div>
            </div>
        </div>
    );
}

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
    const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<string>("");

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

    const { data: driversData } = useQuery(DRIVERS_LIST, {
        variables: { first: 100 },
        skip: !isAuthenticated,
    });

    const [fulfillOrder] = useMutation(ORDER_FULFILL);
    const [updateDeliveryStatus] = useMutation(UPDATE_DELIVERY_STATUS);
    const [assignDriver, { loading: assigningDriver }] = useMutation(ASSIGN_DELIVERY_DRIVER);

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

    const handleAssignDriver = async () => {
        if (!order || !selectedDriver) return;
        try {
            const result = await assignDriver({
                variables: {
                    input: {
                        orderId: order.id,
                        driverId: selectedDriver
                    }
                }
            });

            if (!result.data?.assignDeliveryDriver?.errors?.length) {
                refetchTracking();
                setSelectedDriver("");
            } else {
                alert(result.data.assignDeliveryDriver.errors[0].message);
            }
        } catch (e: any) {
            console.error("Assign driver error:", e);
            alert(`Failed to assign driver: ${e?.message || JSON.stringify(e)}`);
        }
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

    // Print Receipt Function
    const handlePrintReceipt = (orderData: any) => {
        const receiptWindow = window.open('', '_blank', 'width=400,height=600');
        if (!receiptWindow) {
            alert('Please allow popups to print receipts');
            return;
        }

        const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Receipt - Order #${orderData.number}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Courier New', monospace; 
            width: 80mm; 
            padding: 5mm;
            font-size: 12px;
        }
        .header { text-align: center; margin-bottom: 10px; }
        .header h1 { font-size: 16px; font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; }
        .item { margin: 6px 0; }
        .item-name { font-weight: bold; }
        .item-details { font-size: 11px; color: #555; }
        .item-price { text-align: right; }
        .total { font-size: 14px; font-weight: bold; margin-top: 10px; }
        .footer { text-align: center; margin-top: 15px; font-size: 10px; }
        @media print {
            body { width: 80mm; }
            @page { margin: 0; size: 80mm auto; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>PM TRADERS</h1>
        <p>Order Receipt</p>
    </div>
    <div class="divider"></div>
    <div class="row">
        <span>Order #:</span>
        <span>${orderData.number}</span>
    </div>
    <div class="row">
        <span>Date:</span>
        <span>${new Date(orderData.created).toLocaleDateString()}</span>
    </div>
    <div class="row">
        <span>Status:</span>
        <span>${orderData.status}</span>
    </div>
    <div class="divider"></div>
    <div class="items">
        ${orderData.lines.map((line: any) => {
            const isWeighted = line.variant?.product?.productType?.measurementType === "WEIGHTED";
            const grams = line.quantity * 25;
            const qtyDisplay = isWeighted
                ? (grams >= 1000 ? (grams / 1000).toFixed(2).replace(/\.?0+$/, '') + 'kg' : grams + 'g')
                : line.quantity.toString();
            const suffix = (!isWeighted && line.variantName) ? ' - ' + line.variantName : '';

            const unitPrice = line.unitPrice?.gross?.amount || 0;
            let displayUnitPrice = unitPrice.toFixed(0);
            let unitPriceLabel = '';
            if (isWeighted) {
                // Read price_display_unit metadata (e.g. '500g', '1kg', '250g')
                const displayUnitMeta = line.variant?.product?.metadata?.find((m: any) => m.key === 'price_display_unit')?.value || 'kg';
                let displayGrams = 1000; // default 1kg
                const lower = displayUnitMeta.toLowerCase();
                if (lower === 'kg' || lower === '1kg' || lower === '1000') {
                    displayGrams = 1000;
                } else if (lower.endsWith('g')) {
                    const parsed = parseInt(lower.replace('g', ''), 10);
                    if (!isNaN(parsed) && parsed > 0) displayGrams = parsed;
                }
                const displayMultiplier = displayGrams / 25; // how many base units in the display unit
                displayUnitPrice = (unitPrice * displayMultiplier).toFixed(0);
                unitPriceLabel = ' /' + (displayGrams === 1000 ? 'kg' : displayUnitMeta.toLowerCase());
            }

            return '<div class="item"><div class="item-name">' + line.productName + suffix + '</div><div class="row"><span class="item-details">' + qtyDisplay + ' × Rs. ' + displayUnitPrice + unitPriceLabel + '</span><span class="item-price">Rs. ' + (line.totalPrice?.gross?.amount?.toFixed(0) || '0.00') + '</span></div></div>';
        }).join('')}
    </div>
    <div class="divider"></div>
    <div class="row">
        <span>Subtotal:</span>
        <span>Rs. ${orderData.subtotal?.gross?.amount?.toFixed(0)}</span>
    </div>
    <div class="row">
        <span>Shipping:</span>
        <span>Rs. ${orderData.shippingPrice?.gross?.amount?.toFixed(0)}</span>
    </div>
    <div class="divider"></div>
    <div class="row total">
        <span>TOTAL:</span>
        <span>Rs. ${orderData.total?.gross?.amount?.toFixed(0)}</span>
    </div>
    <div class="divider"></div>
    <div class="footer">
        <p>Thank you for your order!</p>
        <p>Contact: info@pmtraders.lk</p>
    </div>
</body>
</html>
        `;

        receiptWindow.document.write(receiptHTML);
        receiptWindow.document.close();
        receiptWindow.focus();
        setTimeout(() => {
            receiptWindow.print();
        }, 250);
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
                        <button
                            onClick={() => handlePrintReceipt(order)}
                            className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-lg"
                            style={{ backgroundColor: 'var(--secondary-100)', color: 'var(--secondary-700)' }}
                        >
                            <Printer className="w-4 h-4" />
                            Print Receipt
                        </button>
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
                            {tracking?.assignedDriver ? (
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
                            ) : (
                                <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--secondary-50)' }}>
                                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--secondary-600)' }}>
                                        Assign Driver
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <select
                                            value={selectedDriver}
                                            onChange={(e) => setSelectedDriver(e.target.value)}
                                            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 flex-1 outline-none"
                                            disabled={assigningDriver}
                                        >
                                            <option value="">Skip driver assignment (Anyone can accept)</option>
                                            {driversData?.allDrivers?.edges?.filter((d: any) => d.node.isActive).map((d: any) => (
                                                <option key={d.node.id} value={d.node.user.id}>
                                                    {d.node.user.firstName} {d.node.user.lastName} ({d.node.isOnline ? 'Online' : 'Offline'})
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleAssignDriver}
                                            disabled={!selectedDriver || assigningDriver}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {assigningDriver ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                                            Assign
                                        </button>
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
                                            {/* Format quantity: show weight for weighted items */}
                                            {(() => {
                                                const isWeighted = line.variant?.product?.productType?.measurementType === "WEIGHTED";

                                                if (isWeighted) {
                                                    // Convert base units (25g each) to weight display
                                                    const grams = line.quantity * 25;
                                                    const weightStr = grams >= 1000
                                                        ? `${(grams / 1000).toFixed(2).replace(/\.?0+$/, "")}kg`
                                                        : `${grams}g`;
                                                    // Use price_display_unit metadata (same as storefront)
                                                    const displayUnitMeta = line.variant?.product?.metadata?.find((m: any) => m.key === 'price_display_unit')?.value || 'kg';
                                                    let displayGrams = 1000;
                                                    const lower = displayUnitMeta.toLowerCase();
                                                    if (lower.endsWith('g')) {
                                                        const parsed = parseInt(lower.replace('g', ''), 10);
                                                        if (!isNaN(parsed) && parsed > 0) displayGrams = parsed;
                                                    }
                                                    const perUnitAmount = (line.unitPrice?.gross?.amount || 0) * (displayGrams / 25);
                                                    const unitLabel = displayGrams === 1000 ? 'kg' : lower;
                                                    return `${weightStr} × Rs. ${perUnitAmount.toFixed(0)} /${unitLabel}`;
                                                }
                                                // Regular item quantity
                                                return `Qty: ${line.quantity} × Rs. ${line.unitPrice?.gross?.amount?.toFixed(0)}`;
                                            })()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold" style={{ color: 'var(--secondary-900)' }}>
                                            Rs. {line.totalPrice?.gross?.amount?.toFixed(0)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Totals */}
                        <div className="px-6 py-4 space-y-2" style={{ backgroundColor: 'var(--secondary-50)' }}>
                            <div className="flex justify-between" style={{ color: 'var(--secondary-600)' }}>
                                <span>Subtotal</span>
                                <span>Rs. {order.subtotal?.gross?.amount?.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between" style={{ color: 'var(--secondary-600)' }}>
                                <span>Shipping</span>
                                <span>Rs. {order.shippingPrice?.gross?.amount?.toFixed(0) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-lg pt-2" style={{ color: 'var(--secondary-900)', borderTop: '1px solid var(--secondary-200)' }}>
                                <span>Total</span>
                                <span>Rs. {order.total?.gross?.amount?.toFixed(0)}</span>
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

                    {/* Delivery Schedule */}
                    <DeliveryScheduleCard metadata={order.metadata} />

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
                        <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--secondary-900)' }}>
                            <CreditCard className="w-5 h-5" style={{ color: 'var(--secondary-500)' }} />
                            Payment
                        </h2>
                        <span className={getPaymentBadge(order.paymentStatus)}>
                            {formatStatus(order.paymentStatus)}
                        </span>

                        {/* Payment Breakdown Section */}
                        {(() => {
                            const customerType = getMetadataValue(order.metadata, "customer_type");
                            const isWholesale = customerType === "wholesale";
                            const orderTotal = order.total?.gross?.amount || 0;

                            if (!isWholesale) {
                                // For retail orders, strictly use Saleor's native payment tracking fields matching the dashboard
                                const preauthorized = order.totalAuthorized?.amount || 0;
                                const captured = order.totalCaptured?.amount || 0;
                                const outstanding = order.totalBalance?.amount || 0;

                                return (
                                    <div className="mt-4 pt-4 space-y-2 text-sm" style={{ borderTop: '1px solid var(--secondary-100)' }}>
                                        {preauthorized > 0 && (
                                            <div className="flex justify-between">
                                                <span style={{ color: 'var(--secondary-600)' }}>Preauthorized amount:</span>
                                                <span className="font-medium text-blue-600">Rs. {preauthorized.toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span style={{ color: 'var(--secondary-600)' }}>Captured amount:</span>
                                            <span className="font-medium text-green-600">Rs. {captured.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between pt-1" style={{ borderTop: '1px dashed var(--secondary-200)' }}>
                                            <span style={{ color: 'var(--secondary-600)' }}>Outstanding Balance:</span>
                                            <span className={`font-semibold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                Rs. {outstanding.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                );
                            }

                            // Wholesale specific logic utilizing backend metadata overrides
                            const stripeCaptured = parseFloat(getMetadataValue(order.metadata, "stripe_captured_amount") || "0");
                            const agreedCodAmount = parseFloat(getMetadataValue(order.metadata, "partial_payment_amount") || "0");

                            // Native saleor tracking is always the ultimate source of truth for total paid (handles refunds)
                            const nativeCaptured = order.totalCaptured?.amount || 0;
                            // If native capture is higher than what metadata says was explicitly striped/cod, trust native (e.g. manual offline payment added later)
                            const totalPaid = Math.max(nativeCaptured, (stripeCaptured + agreedCodAmount));

                            // Outstanding is mathematically Total - Paid instead of relying on stale metadata
                            const outstanding = Math.max(0, orderTotal - totalPaid);
                            const paymentStatus = outstanding <= 0 ? 'fully_paid' : (totalPaid > 0 ? 'partially_paid' : 'outstanding');

                            return (
                                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--secondary-100)' }}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Building2 className="w-4 h-4" style={{ color: 'var(--primary-600)' }} />
                                        <span className="text-sm font-medium" style={{ color: 'var(--primary-700)' }}>
                                            Wholesale Credit Order
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span style={{ color: 'var(--secondary-600)' }}>Order Total:</span>
                                            <span className="font-medium">Rs. {orderTotal.toLocaleString()}</span>
                                        </div>
                                        {stripeCaptured > 0 && (
                                            <div className="flex justify-between">
                                                <span style={{ color: 'var(--secondary-600)' }}>💳 Card pre-authorized:</span>
                                                <span className="font-medium text-blue-600">Rs. {stripeCaptured.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {agreedCodAmount > 0 && (
                                            <div className="flex justify-between">
                                                <span style={{ color: 'var(--secondary-600)' }}>🚚 Agreed COD:</span>
                                                <span className="font-medium text-blue-600">Rs. {agreedCodAmount.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {totalPaid > 0 && (
                                            <div className="flex justify-between">
                                                <span style={{ color: 'var(--secondary-600)' }}>Total paid:</span>
                                                <span className="font-medium text-green-600">Rs. {totalPaid.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {/* <div className="flex justify-between pt-1" style={{ borderTop: '1px dashed var(--secondary-200)' }}>
                                            <span style={{ color: 'var(--secondary-600)' }}>Outstanding:</span>
                                            <span className={`font-semibold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                Rs. {outstanding.toLocaleString()}
                                            </span>
                                        </div> */}
                                        <div className="flex justify-between items-center">
                                            <span style={{ color: 'var(--secondary-600)' }}>Status:</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${paymentStatus === 'fully_paid'
                                                ? 'bg-green-100 text-green-700'
                                                : paymentStatus === 'partially_paid'
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-red-100 text-red-700'
                                                }`}>
                                                {paymentStatus === 'fully_paid' ? '✅ Fully Paid' :
                                                    paymentStatus === 'partially_paid' ? '⚠️ Partially Paid' : '🔴 Outstanding'}
                                            </span>
                                        </div>
                                    </div>

                                    {
                                        outstanding > 0 && (
                                            <button
                                                onClick={() => setShowRecordPaymentModal(true)}
                                                className="mt-4 w-full py-2 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                                            >
                                                <DollarSign className="w-4 h-4" />
                                                Record Payment
                                            </button>
                                        )
                                    }
                                </div>
                            );
                        })()}
                    </div>

                    {/* Transactions History Section */}
                    {(order.transactions?.length > 0 || order.payments?.length > 0) && (
                        <div className="card p-6">
                            <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--secondary-900)' }}>
                                <FileText className="w-5 h-5" style={{ color: 'var(--secondary-500)' }} />
                                Transactions
                            </h2>
                            <div className="space-y-4">
                                {order.transactions?.map((tx: any, i: number) => {
                                    // Sometimes name is empty, fallback to the gateway or type
                                    const gatewayName = tx.name || 'Payment';
                                    const charged = tx.chargedAmount?.amount || 0;
                                    const currency = tx.chargedAmount?.currency || 'LKR';

                                    // Calculate total refunded from events
                                    const refunded = tx.events?.filter((ev: any) => ev.type === 'REFUND_SUCCESS').reduce((sum: number, ev: any) => sum + (ev.amount?.amount || 0), 0) || 0;


                                    return (
                                        <div key={tx.id} className="border rounded-lg p-4" style={{ borderColor: 'var(--secondary-200)', backgroundColor: 'var(--secondary-50)' }}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="font-medium flex items-center gap-2" style={{ color: 'var(--secondary-900)' }}>
                                                        Transaction #{order.transactions.length - i}
                                                        <span className="text-xs font-normal" style={{ color: 'var(--secondary-500)' }}>
                                                            on {new Date(tx.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs mt-0.5" style={{ color: 'var(--secondary-500)' }}>
                                                        {gatewayName}
                                                    </div>
                                                </div>
                                                <div className="flex gap-4 text-right">
                                                    {refunded > 0 && (
                                                        <div>
                                                            <div className="text-xs font-medium" style={{ color: 'var(--secondary-500)' }}>Refunded</div>
                                                            <div className="font-semibold text-red-600">
                                                                {currency} {refunded.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="text-xs font-medium" style={{ color: 'var(--secondary-500)' }}>Charged</div>
                                                        <div className="font-semibold" style={{ color: 'var(--secondary-900)' }}>
                                                            {currency} {charged.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Transaction Events */}
                                            {tx.events && tx.events.length > 0 && (
                                                <div className="mt-4 pt-2 space-y-2" style={{ borderTop: '1px solid var(--secondary-200)' }}>
                                                    {tx.events.map((ev: any, j: number) => <div key={ev.id || j} className="flex flex-col xl:flex-row justify-between items-start xl:items-center text-sm py-2 gap-2 xl:gap-0" style={{ borderBottom: j === tx.events.length - 1 ? 'none' : '1px dashed var(--secondary-200)' }}>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ev.type?.includes('REFUND') ? 'bg-gray-100 text-gray-700' :
                                                                ev.type?.includes('FAIL') ? 'bg-red-100 text-red-700' :
                                                                    'bg-green-100 text-green-700'
                                                                }`}>
                                                                {ev.type?.includes('SUCCESS') ? 'SUCCESS' : ev.type?.includes('FAIL') ? 'FAILED' : 'PENDING'}
                                                            </span>
                                                            {ev.amount?.amount > 0 && (
                                                                <span className="font-medium text-gray-700 whitespace-nowrap">
                                                                    {ev.amount.currency} {ev.amount.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </span>
                                                            )}
                                                            <span className="text-gray-900 font-medium ml-1 flex items-center gap-1 flex-wrap break-all sm:break-normal">
                                                                {ev.type?.split('_')[0] || "Event"}
                                                                {ev.message && <span className="font-normal text-xs text-gray-500 ml-1">({ev.message})</span>}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs flex flex-wrap items-center gap-2 sm:gap-4" style={{ color: 'var(--secondary-500)' }}>
                                                            {ev.pspReference && (
                                                                <span className="px-1.5 py-0.5 rounded font-mono break-all" style={{ backgroundColor: 'var(--secondary-100)', color: 'var(--secondary-700)' }}>
                                                                    {ev.pspReference}
                                                                </span>
                                                            )}
                                                            <span className="whitespace-nowrap">
                                                                {new Date(ev.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Legacy Payments Block (some payments might be initialized via old API) */}
                                {order.payments?.map((payment: any) => (
                                    <div key={payment.id} className="border rounded-lg p-4" style={{ borderColor: 'var(--secondary-200)', backgroundColor: 'var(--secondary-50)' }}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="font-medium flex items-center gap-2" style={{ color: 'var(--secondary-900)' }}>
                                                    Payment Record
                                                    <span className="text-xs font-normal" style={{ color: 'var(--secondary-500)' }}>
                                                        on {new Date(payment.created).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </span>
                                                </div>
                                                <div className="text-xs mt-0.5" style={{ color: 'var(--secondary-500)' }}>
                                                    {payment.gateway}
                                                </div>
                                            </div>
                                            <div className="flex gap-4 text-right">
                                                {(() => {
                                                    const total = payment.total?.amount || 0;
                                                    const captured = payment.capturedAmount?.amount || 0;
                                                    const authorized = payment.availableCaptureAmount?.amount || 0;
                                                    const refunded = total - captured - authorized;
                                                    const currency = payment.total?.currency || 'LKR';

                                                    // Determine the main display block.
                                                    // If a refund occurred, we show the Captured as "Charged". Otherwise, if they just captured strictly what was auth'd, show Charged. If neither, fallback to 'Total'.
                                                    const mainLabel = captured > 0 ? 'Charged' : !!payment.transactions?.length ? 'Total Auth' : 'Total';
                                                    const mainAmount = captured > 0 ? captured : total;

                                                    // Workaround: Hide the Refund text for all COD payments because COD refunds in Saleor are always just virtual voided authorizations
                                                    const isCodRefundWorkaround = payment.gateway === 'pmtraders.payments.cash-on-delivery';

                                                    return (
                                                        <>
                                                            {refunded > 0 && !isCodRefundWorkaround && (
                                                                <div>
                                                                    <div className="text-xs font-medium" style={{ color: 'var(--secondary-500)' }}>Refunded</div>
                                                                    <div className="font-semibold text-red-600">
                                                                        {currency} {refunded.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="text-xs font-medium" style={{ color: 'var(--secondary-500)' }}>{mainLabel}</div>
                                                                <div className="font-semibold" style={{ color: 'var(--secondary-900)' }}>
                                                                    {currency} {mainAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </div>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {payment.transactions && payment.transactions.length > 0 && (
                                            <div className="mt-4 pt-2 space-y-2" style={{ borderTop: '1px solid var(--secondary-200)' }}>
                                                {payment.transactions.map((ptx: any, j: number) => (
                                                    <div key={ptx.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm py-2 gap-2 sm:gap-0" style={{ borderBottom: j === payment.transactions.length - 1 ? 'none' : '1px dashed var(--secondary-200)' }}>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ptx.isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {ptx.isSuccess ? 'SUCCESS' : 'FAILED'}
                                                            </span>
                                                            <span className="text-gray-900 font-medium ml-1 break-all sm:break-normal">
                                                                {ptx.kind}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs flex items-center gap-4" style={{ color: 'var(--secondary-500)' }}>
                                                            {ptx.error && <span className="text-red-500">{ptx.error}</span>}
                                                            <span>
                                                                {new Date(ptx.created).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Record Payment Modal */}
                    {(() => {
                        const outstanding = parseFloat(getMetadataValue(order.metadata, "wholesale_outstanding") || "0");
                        return (
                            <RecordPaymentModal
                                isOpen={showRecordPaymentModal}
                                onClose={() => setShowRecordPaymentModal(false)}
                                orderId={order.id}
                                orderNumber={order.number}
                                outstandingBalance={outstanding}
                                onSuccess={() => refetch()}
                            />
                        );
                    })()}
                </div>
            </div>
        </MainLayout >
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
