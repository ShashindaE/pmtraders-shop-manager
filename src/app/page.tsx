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
    variables: { first: 100 },
    skip: !isAuthenticated,
  });

  const { data: productsData, loading: productsLoading } = useQuery(PRODUCTS_LIST, {
    variables: { first: 100, channel: "lk" },
    skip: !isAuthenticated,
    fetchPolicy: "network-only",
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
  const pendingOrdersCount = ordersData?.orders?.edges?.filter(
    (e: any) => e.node.status === "UNFULFILLED"
  ).length || 0;

  const productCount = productsData?.products?.totalCount || 0;
  const driverCount = driversData?.allDrivers?.totalCount || 0;
  const onlineDrivers = driversData?.allDrivers?.edges?.filter(
    (e: any) => e.node.isOnline
  ).length || 0;

  const recentOrders = ordersData?.orders?.edges?.slice(0, 5) || [];

  // Order pipeline breakdown — derived from the working orders query (no CORS issues)
  const allOrderEdges = ordersData?.orders?.edges || [];
  const todayStr2 = new Date().toDateString();
  const orderPipeline = {
    pending: allOrderEdges.filter((e: any) => e.node.status === "UNFULFILLED").length,
    processing: allOrderEdges.filter((e: any) => ["PARTIALLY_FULFILLED", "READY_TO_FULFILL"].includes(e.node.status)).length,
    fulfilledToday: allOrderEdges.filter((e: any) => {
      if (e.node.status !== "FULFILLED") return false;
      const d = e.node.created;
      return d && new Date(d).toDateString() === todayStr2;
    }).length,
    cancelled: allOrderEdges.filter((e: any) => e.node.status === "CANCELED").length,
  };

  // Stock stats — using available quantity (total - allocated)
  const allProducts = productsData?.products?.edges || [];
  const getProductAvailableStockDash = (product: any): number => {
    const variants = product.variants || [];
    return variants.reduce((sum: number, v: any) => {
      const stocks = v.stocks || [];
      if (stocks.length > 0) {
        return sum + stocks.reduce((s: number, st: any) =>
          s + Math.max(0, (st.quantity || 0) - (st.quantityAllocated || 0)), 0);
      }
      return sum + (v.quantityAvailable || 0);
    }, 0);
  };
  const isWeightedProduct = (product: any) => product.productType?.measurementType === "WEIGHTED";
  const lowStockCount = allProducts.filter((edge: any) => {
    const product = edge.node;
    const avail = getProductAvailableStockDash(product);
    const threshold = isWeightedProduct(product) ? 400 : 10;
    return avail > 0 && avail < threshold;
  }).length;
  const outOfStockCount = allProducts.filter((edge: any) => {
    const product = edge.node;
    const variants = product.variants || [];
    if (variants.length === 0) return true;
    return getProductAvailableStockDash(product) === 0;
  }).length;


  // ── Today's Sales Breakdown ──────────────────────────────────────────────
  const todayDateStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  const todaysOrders = ordersData?.orders?.edges?.filter((e: any) => {
    const created = e.node.created;
    return created && created.startsWith(todayDateStr);
  }) || [];

  const todaySales = todaysOrders.reduce(
    (acc: { card: number; cash: number; credit: number; total: number }, e: any) => {
      const order = e.node;
      // Skip cancelled / unpaid
      if (["CANCELED", "UNCONFIRMED"].includes(order.status)) return acc;
      const amount = order.total?.gross?.amount || 0;
      const metadata: Record<string, string> = {};
      (order.metadata || []).forEach((m: any) => { metadata[m.key] = m.value; });

      const method = (metadata["actual_payment_method"] || "").toLowerCase();
      const isWholesale = (metadata["customer_type"] || "").toLowerCase() === "wholesale";

      if (isWholesale) {
        acc.credit += amount;
      } else if (method === "card" || method === "stripe") {
        acc.card += amount;
      } else {
        // COD or unspecified = cash
        acc.cash += amount;
      }
      acc.total += amount;
      return acc;
    },
    { card: 0, cash: 0, credit: 0, total: 0 }
  );

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
        <Link href="/orders">
          <div className="stat-card hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="stat-label">Total Orders</p>
                <p className="stat-value">{ordersLoading ? "..." : orderCount}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </Link>

        {/* Pending Orders */}
        <Link href="/orders?status=UNFULFILLED">
          <div className="stat-card hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="stat-label">Pending Orders</p>
                <p className="stat-value text-yellow-600">{ordersLoading ? "..." : pendingOrdersCount}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </Link>

        {/* Products */}
        <Link href="/products">
          <div className="stat-card hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="stat-label">Products</p>
                <p className="stat-value">{productsLoading ? "..." : productCount}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </Link>

        {/* Drivers */}
        <Link href="/drivers">
          <div className="stat-card hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="flex items-center justify-between h-full">
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
        </Link>
      </div>

      {/* Today's Sales Breakdown */}
      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--secondary-900)' }}>📊 Today&apos;s Sales</h2>
            <p className="text-sm" style={{ color: 'var(--secondary-500)' }}>
              {todaysOrders.length} orders · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <Link href="/orders" className="text-sm flex items-center gap-1" style={{ color: 'var(--primary-600)' }}>
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {ordersLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--primary-500)' }} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--secondary-50)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--secondary-500)' }}>Total Revenue</p>
              <p className="text-xl font-bold" style={{ color: 'var(--secondary-900)' }}>
                Rs. {todaySales.total.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="rounded-xl p-4 bg-blue-50">
              <p className="text-xs font-medium mb-1 text-blue-600">💳 Card</p>
              <p className="text-xl font-bold text-blue-700">
                Rs. {todaySales.card.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="rounded-xl p-4 bg-green-50">
              <p className="text-xs font-medium mb-1 text-green-600">💵 Cash (COD)</p>
              <p className="text-xl font-bold text-green-700">
                Rs. {todaySales.cash.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="rounded-xl p-4 bg-purple-50">
              <p className="text-xs font-medium mb-1 text-purple-600">🏷️ Credit</p>
              <p className="text-xl font-bold text-purple-700">
                Rs. {todaySales.credit.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        )}
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

      {/* Delivery Queue + Stock Management Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Order Pipeline — uses the working orders query, no CORS issues */}
        <div className="card p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--secondary-900)' }}>
              <ShoppingCart className="w-5 h-5" style={{ color: 'var(--secondary-500)' }} />
              Order Pipeline
            </h2>
            <Link href="/orders" className="text-xs" style={{ color: 'var(--secondary-400)' }}>View all ↗</Link>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--secondary-500)' }}>Live order status breakdown</p>
          {ordersLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--primary-500)' }} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link href="/orders?status=UNFULFILLED">
                <div className="text-center p-3 rounded-xl bg-yellow-50 cursor-pointer hover:bg-yellow-100 transition-colors">
                  <p className="text-2xl font-bold text-yellow-700">{orderPipeline.pending}</p>
                  <p className="text-xs mt-1 text-yellow-600">🕐 Pending</p>
                </div>
              </Link>
              <div className="text-center p-3 rounded-xl bg-blue-50">
                <p className="text-2xl font-bold text-blue-700">{orderPipeline.processing}</p>
                <p className="text-xs mt-1 text-blue-600">⚙️ Processing</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-green-50">
                <p className="text-2xl font-bold text-green-700">{orderPipeline.fulfilledToday}</p>
                <p className="text-xs mt-1 text-green-600">✅ Done Today</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-red-50">
                <p className="text-2xl font-bold text-red-700">{orderPipeline.cancelled}</p>
                <p className="text-xs mt-1 text-red-600">❌ Cancelled</p>
              </div>
            </div>
          )}
        </div>

        {/* Stock Management Summary */}
        <Link href="/stock">
          <div className="card p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--secondary-900)' }}>
                <Package className="w-5 h-5" style={{ color: 'var(--secondary-500)' }} />
                Stock Management
              </h2>
              <span className="text-xs" style={{ color: 'var(--secondary-400)' }}>Live ↗</span>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--secondary-500)' }}>Manage inventory levels for your products</p>
            {productsLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--primary-500)' }} />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl" style={{ backgroundColor: 'var(--secondary-50)' }}>
                  <p className="text-2xl font-bold" style={{ color: 'var(--secondary-900)' }}>{allProducts.length}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--secondary-500)' }}>Total Products</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-yellow-50">
                  <p className="text-2xl font-bold text-yellow-700">{lowStockCount}</p>
                  <p className="text-xs mt-1 text-yellow-600">Low Stock</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-red-50">
                  <p className="text-2xl font-bold text-red-700">{outOfStockCount}</p>
                  <p className="text-xs mt-1 text-red-600">Out of Stock</p>
                </div>
              </div>
            )}
          </div>
        </Link>
      </div>

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
                        Rs. {order.total?.gross?.amount?.toFixed(0) || "0.00"}
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
