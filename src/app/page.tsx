"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MainLayout } from "@/components/layout/Sidebar";
import { useQuery } from "@apollo/client";
import { ORDERS_LIST, PRODUCTS_LIST, DRIVERS_LIST } from "@/lib/graphql";
import Link from "next/link";
import {
  ShoppingCart,
  Package,
  Truck,
  Users,
  AlertTriangle,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch data
  const { data: ordersData, loading: ordersLoading } = useQuery(ORDERS_LIST, {
    variables: { first: 10 },
    skip: !isAuthenticated,
  });

  const { data: productsData, loading: productsLoading } = useQuery(PRODUCTS_LIST, {
    variables: { first: 1, channel: "lk" },
    skip: !isAuthenticated,
  });

  const { data: driversData, loading: driversLoading } = useQuery(DRIVERS_LIST, {
    variables: { first: 50 },
    skip: !isAuthenticated,
  });

  // Loading state
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--secondary-50)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-500)' }} />
      </div>
    );
  }

  const orderCount = ordersData?.orders?.totalCount || 0;
  const pendingOrders = ordersData?.orders?.edges?.filter(
    (e: any) => e.node.status === "UNFULFILLED" || e.node.status === "UNCONFIRMED"
  ).length || 0;
  const productCount = productsData?.products?.totalCount || 0;
  const driverCount = driversData?.allDrivers?.totalCount || 0;
  const onlineDrivers = driversData?.allDrivers?.edges?.filter(
    (e: any) => e.node.isOnline
  ).length || 0;

  const recentOrders = ordersData?.orders?.edges?.slice(0, 5) || [];

  return (
    <MainLayout>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--secondary-900)' }}>
          Welcome back, {user?.firstName || "Manager"}! 👋
        </h1>
        <p className="mt-1" style={{ color: 'var(--secondary-600)' }}>
          Here's what's happening with your store today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Orders */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Orders</p>
              <p className="stat-value">{ordersLoading ? "..." : orderCount}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Pending Orders</p>
              <p className="stat-value text-yellow-600">{ordersLoading ? "..." : pendingOrders}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Products</p>
              <p className="stat-value">{productsLoading ? "..." : productCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Drivers */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Drivers Online</p>
              <p className="stat-value text-green-600">
                {driversLoading ? "..." : `${onlineDrivers}/${driverCount}`}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--secondary-900)' }}>Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            href="/orders"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group"
          >
            <ShoppingCart className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium" style={{ color: 'var(--secondary-700)' }}>View Orders</span>
          </Link>
          <Link
            href="/products/new"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors group"
          >
            <Package className="w-8 h-8 text-purple-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium" style={{ color: 'var(--secondary-700)' }}>Add Product</span>
          </Link>
          <Link
            href="/stock"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors group"
          >
            <AlertTriangle className="w-8 h-8 text-orange-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium" style={{ color: 'var(--secondary-700)' }}>Check Stock</span>
          </Link>
          <Link
            href="/delivery"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors group"
          >
            <Truck className="w-8 h-8 text-green-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium" style={{ color: 'var(--secondary-700)' }}>Deliveries</span>
          </Link>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--secondary-100)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--secondary-900)' }}>Recent Orders</h2>
          <Link
            href="/orders"
            className="text-sm font-medium flex items-center gap-1 hover:opacity-80"
            style={{ color: 'var(--primary-600)' }}
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {ordersLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: 'var(--primary-500)' }} />
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--secondary-500)' }}>
            No orders yet
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((edge: any) => {
                  const order = edge.node;
                  return (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/orders/${order.id}`} className="font-medium hover:opacity-80" style={{ color: 'var(--primary-600)' }}>
                          #{order.number}
                        </Link>
                      </td>
                      <td>
                        {order.user?.firstName || order.user?.email || "Guest"}
                      </td>
                      <td>
                        <span className={getStatusBadge(order.status)}>
                          {formatStatus(order.status)}
                        </span>
                      </td>
                      <td className="font-medium">
                        Rs. {order.total?.gross?.amount?.toFixed(2) || "0.00"}
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

function formatStatus(status: string) {
  return status?.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || "";
}
