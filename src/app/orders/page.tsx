"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/Sidebar";
import { useQuery } from "@apollo/client";
import { ORDERS_LIST } from "@/lib/graphql";
import Link from "next/link";
import {
    Search,
    Filter,
    Eye,
    Loader2,
    Package,
    Plus,
} from "lucide-react";

const statusOptions = [
    { value: "", label: "All Orders" },
    { value: "UNFULFILLED", label: "Unfulfilled" },
    { value: "PARTIALLY_FULFILLED", label: "Partially Fulfilled" },
    { value: "FULFILLED", label: "Fulfilled" },
    { value: "CANCELED", label: "Canceled" },
];

export default function OrdersPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [statusFilter, setStatusFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    const { data, loading } = useQuery(ORDERS_LIST, {
        variables: {
            first: 20,
            filter: statusFilter ? { status: [statusFilter] } : undefined,
        },
        skip: !isAuthenticated,
    });

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--secondary-50)' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-500)' }} />
            </div>
        );
    }

    const orders = data?.orders?.edges || [];
    const totalCount = data?.orders?.totalCount || 0;

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
                            className="input-field pl-10"
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
                </div>
            </div>

            {/* Orders Table */}
            <div className="card">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: 'var(--primary-500)' }} />
                        <p className="mt-2" style={{ color: 'var(--secondary-500)' }}>Loading orders...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="p-12 text-center">
                        <Package className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--secondary-300)' }} />
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--secondary-700)' }}>No orders found</h3>
                        <p className="mt-1" style={{ color: 'var(--secondary-500)' }}>
                            {statusFilter ? "Try changing the filter" : "Orders will appear here when customers place them"}
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
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((edge: any) => {
                                    const order = edge.node;
                                    return (
                                        <tr key={order.id}>
                                            <td>
                                                <span className="font-semibold" style={{ color: 'var(--secondary-900)' }}>#{order.number}</span>
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
                                                    <p className="font-medium" style={{ color: 'var(--secondary-900)' }}>
                                                        {order.shippingAddress?.firstName || order.user?.firstName || "Guest"}{" "}
                                                        {order.shippingAddress?.lastName || order.user?.lastName || ""}
                                                    </p>
                                                    <p className="text-sm" style={{ color: 'var(--secondary-500)' }}>{order.user?.email || "-"}</p>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={getStatusBadge(order.status)}>
                                                    {formatStatus(order.status)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={getPaymentBadge(order.paymentStatus)}>
                                                    {formatStatus(order.paymentStatus)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="font-semibold" style={{ color: 'var(--secondary-900)' }}>
                                                    Rs. {order.total?.gross?.amount?.toFixed(2) || "0.00"}
                                                </span>
                                            </td>
                                            <td>
                                                <Link
                                                    href={`/orders/${encodeURIComponent(order.id)}`}
                                                    className="btn-secondary text-sm py-2 px-3 inline-flex items-center gap-1.5"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    View
                                                </Link>
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
