"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/Sidebar";
import { useQuery, useMutation } from "@apollo/client";
import { PRODUCTS_LIST, PRODUCTS_SEARCH, PRODUCT_DELETE } from "@/lib/graphql";
import Link from "next/link";
import {
    Search,
    Plus,
    Edit,
    Trash2,
    Package,
    Loader2,
    Eye,
    EyeOff,
    Box,
    AlertTriangle,
} from "lucide-react";

export default function ProductsPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    // Use different query depending on search
    const { data, loading, refetch } = useQuery(
        debouncedSearch ? PRODUCTS_SEARCH : PRODUCTS_LIST,
        {
            variables: debouncedSearch
                ? { first: 50, search: debouncedSearch, channel: "lk" }
                : { first: 50, channel: "lk" },
            skip: !isAuthenticated,
            fetchPolicy: "network-only",
        }
    );

    const [deleteProduct, { loading: deleting }] = useMutation(PRODUCT_DELETE, {
        onCompleted: () => {
            setDeleteId(null);
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

    const products = data?.products?.edges || [];
    const totalCount = data?.products?.totalCount || 0;

    const handleDelete = (id: string) => {
        deleteProduct({ variables: { id } });
    };

    // Calculate total stock for a product
    const getTotalStock = (variants: any[]) => {
        if (!variants) return 0;
        return variants.reduce((total, variant) => {
            const variantStock = variant.stocks?.reduce((sum: number, stock: any) => sum + stock.quantity, 0) || 0;
            return total + variantStock;
        }, 0);
    };

    // Check if any variant is low stock
    const hasLowStock = (variants: any[]) => {
        if (!variants) return false;
        return variants.some(variant => {
            const stock = variant.stocks?.reduce((sum: number, s: any) => sum + s.quantity, 0) || 0;
            return stock > 0 && stock < 10;
        });
    };

    const isOutOfStock = (variants: any[]) => {
        if (!variants) return true;
        return getTotalStock(variants) === 0;
    };

    return (
        <MainLayout>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Products</h1>
                    <p style={{ color: 'var(--secondary-500)' }} className="mt-1">{totalCount} products in catalog</p>
                </div>
                <Link href="/products/new" className="btn-primary flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Product
                </Link>
            </div>

            {/* Search */}
            <div className="card p-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--secondary-400)' }} />
                    <input
                        type="text"
                        placeholder="Search products by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field pl-10"
                    />
                </div>
            </div>

            {/* Products Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-500)' }} />
                </div>
            ) : products.length === 0 ? (
                <div className="card p-12 text-center">
                    <Package className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--secondary-300)' }} />
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--secondary-700)' }}>No products found</h3>
                    <p className="mt-1 mb-4" style={{ color: 'var(--secondary-500)' }}>
                        {searchQuery ? "Try a different search term" : "Add your first product to get started"}
                    </p>
                    <Link href="/products/new" className="btn-primary inline-flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Add Product
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {products.map((edge: any) => {
                        const product = edge.node;
                        const price = product.pricing?.priceRange?.start?.gross;
                        const isPublished = product.channelListings?.some((cl: any) => cl.isPublished);
                        const totalStock = getTotalStock(product.variants);
                        const lowStock = hasLowStock(product.variants);
                        const outOfStock = isOutOfStock(product.variants);
                        const variantCount = product.variants?.length || 0;

                        return (
                            <div key={product.id} className="card hover:shadow-md transition-shadow">
                                {/* Image */}
                                <div className="aspect-square relative" style={{ backgroundColor: 'var(--secondary-100)' }}>
                                    {product.thumbnail?.url ? (
                                        <img
                                            src={product.thumbnail.url}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Package className="w-12 h-12" style={{ color: 'var(--secondary-300)' }} />
                                        </div>
                                    )}

                                    {/* Status Badges */}
                                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                                        {isPublished ? (
                                            <span className="badge-success flex items-center gap-1">
                                                <Eye className="w-3 h-3" />
                                                Published
                                            </span>
                                        ) : (
                                            <span className="badge-secondary flex items-center gap-1">
                                                <EyeOff className="w-3 h-3" />
                                                Draft
                                            </span>
                                        )}
                                    </div>

                                    {/* Stock Alert */}
                                    {outOfStock && (
                                        <div className="absolute bottom-2 left-2">
                                            <span className="badge-danger flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Out of Stock
                                            </span>
                                        </div>
                                    )}
                                    {!outOfStock && lowStock && (
                                        <div className="absolute bottom-2 left-2">
                                            <span className="badge-warning flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Low Stock
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <h3 className="font-semibold truncate" style={{ color: 'var(--secondary-900)' }}>{product.name}</h3>
                                    <p className="text-sm truncate" style={{ color: 'var(--secondary-500)' }}>
                                        {product.category?.name || "Uncategorized"}
                                    </p>

                                    {/* Price & Stock */}
                                    <div className="flex items-center justify-between mt-2">
                                        <p className="text-lg font-bold" style={{ color: 'var(--primary-600)' }}>
                                            {price ? `Rs. ${price.amount.toFixed(2)}` : "No price"}
                                        </p>
                                        <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--secondary-600)' }}>
                                            <Box className="w-4 h-4" />
                                            <span>{totalStock} in stock</span>
                                        </div>
                                    </div>

                                    {/* Variants Count */}
                                    {variantCount > 1 && (
                                        <p className="text-xs mt-1" style={{ color: 'var(--secondary-400)' }}>
                                            {variantCount} variants
                                        </p>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 mt-4">
                                        <Link
                                            href={`/products/${product.id}`}
                                            className="btn-secondary flex-1 text-center text-sm py-2"
                                        >
                                            <Edit className="w-4 h-4 inline mr-1" />
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => setDeleteId(product.id)}
                                            className="btn-danger text-sm py-2 px-3"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="card w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--secondary-900)' }}>Delete Product?</h2>
                        <p className="mb-6" style={{ color: 'var(--secondary-600)' }}>
                            This action cannot be undone. The product and all its variants will be permanently removed from your catalog.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="btn-secondary flex-1"
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteId)}
                                className="btn-danger flex-1 flex items-center justify-center gap-2"
                                disabled={deleting}
                            >
                                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
