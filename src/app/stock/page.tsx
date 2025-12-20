"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/Sidebar";
import { useQuery, useMutation } from "@apollo/client";
import { PRODUCTS_LIST, STOCK_UPDATE, STOCK_CREATE, WAREHOUSES_LIST } from "@/lib/graphql";
import Link from "next/link";
import {
    Search,
    Package,
    Loader2,
    AlertTriangle,
    Save,
    Warehouse,
    Box,
    Plus,
    X,
    Edit2,
    Check,
} from "lucide-react";

export default function StockPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [editingStock, setEditingStock] = useState<{ variantId: string; warehouseId: string } | null>(null);
    const [editQuantity, setEditQuantity] = useState("");
    const [addingStock, setAddingStock] = useState<string | null>(null);
    const [newWarehouse, setNewWarehouse] = useState("");
    const [newQuantity, setNewQuantity] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    // Fetch products with stock info
    const { data: productsData, loading: loadingProducts, refetch } = useQuery(PRODUCTS_LIST, {
        variables: { first: 100, channel: "lk" },
        skip: !isAuthenticated,
        fetchPolicy: "network-only",
    });

    const { data: warehouseData } = useQuery(WAREHOUSES_LIST, {
        skip: !isAuthenticated,
    });

    const [updateStock, { loading: updating }] = useMutation(STOCK_UPDATE, {
        onCompleted: () => {
            setEditingStock(null);
            setEditQuantity("");
            setSuccessMessage("Stock updated successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
            refetch();
        },
    });

    const [createStock, { loading: creating }] = useMutation(STOCK_CREATE, {
        onCompleted: () => {
            setAddingStock(null);
            setNewWarehouse("");
            setNewQuantity("");
            setSuccessMessage("Stock added successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
            refetch();
        },
    });

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--secondary-50)' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-500)' }} />
            </div>
        );
    }

    const products = productsData?.products?.edges || [];
    const warehouses = warehouseData?.warehouses?.edges || [];

    // Filter products by search
    const filteredProducts = products.filter((edge: any) => {
        const p = edge.node;
        const searchLower = searchQuery.toLowerCase();
        return (
            p.name?.toLowerCase().includes(searchLower) ||
            p.variants?.some((v: any) =>
                v.name?.toLowerCase().includes(searchLower) ||
                v.sku?.toLowerCase().includes(searchLower)
            )
        );
    });

    // Calculate stats
    const stats = {
        totalProducts: products.length,
        lowStockProducts: products.filter((edge: any) => {
            const totalStock = edge.node.variants?.reduce((sum: number, v: any) => {
                return sum + (v.stocks?.reduce((s: number, st: any) => s + st.quantity, 0) || 0);
            }, 0) || 0;
            return totalStock > 0 && totalStock < 10;
        }).length,
        outOfStock: products.filter((edge: any) => {
            const totalStock = edge.node.variants?.reduce((sum: number, v: any) => {
                return sum + (v.stocks?.reduce((s: number, st: any) => s + st.quantity, 0) || 0);
            }, 0) || 0;
            return totalStock === 0;
        }).length,
    };

    const handleSaveStock = () => {
        if (!editingStock) return;
        const qty = parseInt(editQuantity);
        if (isNaN(qty) || qty < 0) return;

        updateStock({
            variables: {
                variantId: editingStock.variantId,
                warehouseId: editingStock.warehouseId,
                quantity: qty,
            },
        });
    };

    const handleAddStock = (variantId: string) => {
        if (!newWarehouse || !newQuantity) return;
        const qty = parseInt(newQuantity);
        if (isNaN(qty) || qty < 0) return;

        createStock({
            variables: {
                variantId,
                warehouseId: newWarehouse,
                quantity: qty,
            },
        });
    };

    // Get available warehouses for a variant (warehouses not yet assigned)
    const getAvailableWarehouses = (variant: any) => {
        const existingWarehouseIds = variant.stocks?.map((s: any) => s.warehouse.id) || [];
        return warehouses.filter((w: any) => !existingWarehouseIds.includes(w.node.id));
    };

    return (
        <MainLayout>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Stock Management</h1>
                    <p style={{ color: 'var(--secondary-500)' }} className="mt-1">
                        Manage inventory levels for your products
                    </p>
                </div>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-lg border border-green-100 flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    {successMessage}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-label">Total Products</p>
                            <p className="stat-value">{loadingProducts ? "..." : stats.totalProducts}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-label">Low Stock</p>
                            <p className="stat-value text-yellow-600">{loadingProducts ? "..." : stats.lowStockProducts}</p>
                        </div>
                        <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-label">Out of Stock</p>
                            <p className="stat-value text-red-600">{loadingProducts ? "..." : stats.outOfStock}</p>
                        </div>
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                            <Box className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="card p-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--secondary-400)' }} />
                    <input
                        type="text"
                        placeholder="Search by product name, variant, or SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field pl-10"
                    />
                </div>
            </div>

            {/* Products with Stock */}
            {loadingProducts ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-500)' }} />
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="card p-12 text-center">
                    <Package className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--secondary-300)' }} />
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--secondary-700)' }}>No products found</h3>
                    <p className="mt-1" style={{ color: 'var(--secondary-500)' }}>
                        {searchQuery ? "Try a different search term" : "Add products to manage their stock"}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredProducts.map((edge: any) => {
                        const product = edge.node;
                        const variants = product.variants || [];
                        const totalStock = variants.reduce((sum: number, v: any) => {
                            return sum + (v.stocks?.reduce((s: number, st: any) => s + st.quantity, 0) || 0);
                        }, 0);
                        const isLowStock = totalStock > 0 && totalStock < 10;
                        const isOutOfStock = totalStock === 0;

                        return (
                            <div key={product.id} className="card">
                                {/* Product Header */}
                                <div className="p-4 flex items-center gap-4" style={{ borderBottom: '1px solid var(--secondary-100)' }}>
                                    {product.thumbnail?.url ? (
                                        <img
                                            src={product.thumbnail.url}
                                            alt={product.name}
                                            className="w-14 h-14 object-cover rounded-lg"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--secondary-100)' }}>
                                            <Package className="w-7 h-7" style={{ color: 'var(--secondary-400)' }} />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <Link
                                            href={`/products/${product.id}`}
                                            className="font-semibold hover:opacity-80"
                                            style={{ color: 'var(--secondary-900)' }}
                                        >
                                            {product.name}
                                        </Link>
                                        <p className="text-sm" style={{ color: 'var(--secondary-500)' }}>
                                            {product.category?.name || "Uncategorized"} • {variants.length} variant{variants.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isOutOfStock ? (
                                            <span className="badge-danger">Out of Stock</span>
                                        ) : isLowStock ? (
                                            <span className="badge-warning">Low Stock</span>
                                        ) : (
                                            <span className="badge-success">In Stock</span>
                                        )}
                                        <span className="font-semibold" style={{ color: 'var(--secondary-900)' }}>
                                            {totalStock} total
                                        </span>
                                    </div>
                                </div>

                                {/* Variants */}
                                {variants.map((variant: any) => {
                                    const stocks = variant.stocks || [];
                                    const availableWarehouses = getAvailableWarehouses(variant);
                                    const isAddingToVariant = addingStock === variant.id;
                                    const variantTotalStock = stocks.reduce((sum: number, s: any) => sum + s.quantity, 0);

                                    return (
                                        <div key={variant.id}>
                                            {/* Variant Header */}
                                            <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--secondary-50)', borderBottom: '1px solid var(--secondary-100)' }}>
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        <span className="font-medium" style={{ color: 'var(--secondary-900)' }}>
                                                            {variant.name || "Default Variant"}
                                                        </span>
                                                        {variant.sku && (
                                                            <span className="text-sm ml-2" style={{ color: 'var(--secondary-500)' }}>
                                                                SKU: {variant.sku}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`badge ${variantTotalStock > 10 ? 'badge-success' : variantTotalStock > 0 ? 'badge-warning' : 'badge-danger'}`}>
                                                        {variantTotalStock} in stock
                                                    </span>
                                                </div>
                                                {/* Add Stock Button - always show if there are available warehouses */}
                                                {availableWarehouses.length > 0 && !isAddingToVariant && (
                                                    <button
                                                        onClick={() => {
                                                            setAddingStock(variant.id);
                                                            setNewWarehouse("");
                                                            setNewQuantity("");
                                                        }}
                                                        className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Add to Warehouse
                                                    </button>
                                                )}
                                            </div>

                                            {/* Add Stock Form */}
                                            {isAddingToVariant && (
                                                <div className="p-4" style={{ backgroundColor: 'var(--primary-50)', borderBottom: '1px solid var(--secondary-100)' }}>
                                                    <div className="flex flex-wrap items-end gap-3">
                                                        <div>
                                                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--secondary-700)' }}>
                                                                Warehouse
                                                            </label>
                                                            <select
                                                                value={newWarehouse}
                                                                onChange={(e) => setNewWarehouse(e.target.value)}
                                                                className="select-field w-48"
                                                            >
                                                                <option value="">Select warehouse...</option>
                                                                {availableWarehouses.map((w: any) => (
                                                                    <option key={w.node.id} value={w.node.id}>{w.node.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--secondary-700)' }}>
                                                                Quantity
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={newQuantity}
                                                                onChange={(e) => setNewQuantity(e.target.value)}
                                                                className="input-field w-24 text-center"
                                                                min="0"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => handleAddStock(variant.id)}
                                                            disabled={creating || !newWarehouse || !newQuantity}
                                                            className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
                                                        >
                                                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                            Add Stock
                                                        </button>
                                                        <button
                                                            onClick={() => { setAddingStock(null); setNewWarehouse(""); setNewQuantity(""); }}
                                                            className="btn-secondary text-sm py-2 px-4"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Stock Table */}
                                            {stocks.length > 0 ? (
                                                <div className="table-container">
                                                    <table className="table">
                                                        <thead>
                                                            <tr>
                                                                <th>Warehouse</th>
                                                                <th>Quantity</th>
                                                                <th>Allocated</th>
                                                                <th>Available</th>
                                                                <th>Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {stocks.map((stock: any) => {
                                                                const isEditing = editingStock?.variantId === variant.id && editingStock?.warehouseId === stock.warehouse.id;
                                                                const available = stock.quantity - (stock.quantityAllocated || 0);
                                                                const isLow = stock.quantity > 0 && stock.quantity < 10;

                                                                return (
                                                                    <tr key={stock.warehouse.id}>
                                                                        <td>
                                                                            <div className="flex items-center gap-2">
                                                                                <Warehouse className="w-4 h-4" style={{ color: 'var(--secondary-400)' }} />
                                                                                <span style={{ color: 'var(--secondary-900)' }}>{stock.warehouse.name}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            {isEditing ? (
                                                                                <input
                                                                                    type="number"
                                                                                    value={editQuantity}
                                                                                    onChange={(e) => setEditQuantity(e.target.value)}
                                                                                    className="input-field w-20 text-center py-1"
                                                                                    min="0"
                                                                                    autoFocus
                                                                                />
                                                                            ) : (
                                                                                <span
                                                                                    className={`font-semibold ${isLow ? 'text-yellow-600' : ''}`}
                                                                                    style={{ color: isLow ? undefined : 'var(--secondary-900)' }}
                                                                                >
                                                                                    {stock.quantity}
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td style={{ color: 'var(--secondary-500)' }}>
                                                                            {stock.quantityAllocated || 0}
                                                                        </td>
                                                                        <td>
                                                                            <span className={`font-medium ${available === 0 ? 'text-red-600' : available < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                                                                                {available}
                                                                            </span>
                                                                        </td>
                                                                        <td>
                                                                            {isEditing ? (
                                                                                <div className="flex items-center gap-2">
                                                                                    <button
                                                                                        onClick={handleSaveStock}
                                                                                        disabled={updating}
                                                                                        className="btn-primary text-sm py-1.5 px-3"
                                                                                    >
                                                                                        {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => { setEditingStock(null); setEditQuantity(""); }}
                                                                                        className="btn-secondary text-sm py-1.5 px-3"
                                                                                    >
                                                                                        <X className="w-4 h-4" />
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setEditingStock({ variantId: variant.id, warehouseId: stock.warehouse.id });
                                                                                        setEditQuantity(stock.quantity.toString());
                                                                                    }}
                                                                                    className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"
                                                                                >
                                                                                    <Edit2 className="w-4 h-4" />
                                                                                    Edit
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="p-6 text-center">
                                                    <Box className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--secondary-300)' }} />
                                                    <p style={{ color: 'var(--secondary-500)' }}>No stock in any warehouse</p>
                                                    {availableWarehouses.length > 0 && !isAddingToVariant && (
                                                        <button
                                                            onClick={() => {
                                                                setAddingStock(variant.id);
                                                                setNewWarehouse("");
                                                                setNewQuantity("");
                                                            }}
                                                            className="btn-primary text-sm py-1.5 px-3 mt-3 inline-flex items-center gap-1"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                            Add Stock
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Warehouse List */}
            {warehouses.length > 0 && (
                <div className="mt-6 card p-4">
                    <h3 className="font-medium mb-3" style={{ color: 'var(--secondary-900)' }}>Available Warehouses</h3>
                    <div className="flex flex-wrap gap-2">
                        {warehouses.map((w: any) => (
                            <span key={w.node.id} className="badge-secondary flex items-center gap-1">
                                <Warehouse className="w-3 h-3" />
                                {w.node.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
