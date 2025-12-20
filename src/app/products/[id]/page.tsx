"use client";

import { useAuth } from "@/lib/auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { MainLayout } from "@/components/layout/Sidebar";
import { useQuery, useMutation } from "@apollo/client";
import { PRODUCT_DETAILS, PRODUCT_UPDATE, CATEGORIES_LIST, STOCK_UPDATE, STOCK_CREATE, WAREHOUSES_LIST, PRODUCT_MEDIA_DELETE } from "@/lib/graphql";
import { uploadProductImage } from "@/lib/apollo-client";
import { gql } from "@apollo/client";
import Link from "next/link";
import {
    ArrowLeft,
    Save,
    Loader2,
    Package,
    Eye,
    EyeOff,
    DollarSign,
    Warehouse,
    Plus,
    X,
    Edit2,
    Check,
    AlertTriangle,
    Tag,
    FileText,
    Settings,
    Box,
    Upload,
    Trash2,
    Image as ImageIcon,
} from "lucide-react";

// Variant price update mutation
const VARIANT_PRICE_UPDATE = gql`
  mutation VariantPriceUpdate($id: ID!, $input: ProductVariantInput!) {
    productVariantUpdate(id: $id, input: $input) {
      productVariant {
        id
        name
        sku
      }
      errors {
        field
        message
      }
    }
  }
`;

// Channel listing update mutation
const CHANNEL_LISTING_UPDATE = gql`
  mutation ProductChannelListingUpdate($id: ID!, $input: ProductChannelListingUpdateInput!) {
    productChannelListingUpdate(id: $id, input: $input) {
      product {
        id
        channelListings {
          isPublished
          isAvailableForPurchase
          channel {
            slug
          }
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

export default function EditProductPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const productId = decodeURIComponent(params.id as string);

    // Form states
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [seoTitle, setSeoTitle] = useState("");
    const [seoDescription, setSeoDescription] = useState("");

    // UI states
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [activeTab, setActiveTab] = useState<"general" | "stock" | "seo">("general");

    // Stock editing
    const [editingStock, setEditingStock] = useState<string | null>(null);
    const [stockValue, setStockValue] = useState("");

    // Add stock modal
    const [addingStockVariant, setAddingStockVariant] = useState<string | null>(null);
    const [newWarehouseId, setNewWarehouseId] = useState("");
    const [newStockQty, setNewStockQty] = useState("");

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    const { data, loading, refetch } = useQuery(PRODUCT_DETAILS, {
        variables: { id: productId, channel: "lk" },
        skip: !isAuthenticated || !productId,
        onCompleted: (data) => {
            if (data?.product) {
                setName(data.product.name || "");
                setDescription(parseDescription(data.product.description));
                setCategoryId(data.product.category?.id || "");
                setSeoTitle(data.product.seoTitle || "");
                setSeoDescription(data.product.seoDescription || "");
            }
        },
    });

    const { data: categoriesData } = useQuery(CATEGORIES_LIST, {
        skip: !isAuthenticated,
    });

    const { data: warehouseData } = useQuery(WAREHOUSES_LIST, {
        skip: !isAuthenticated,
    });

    const [updateProduct, { loading: updating }] = useMutation(PRODUCT_UPDATE, {
        onCompleted: (data) => {
            if (data?.productUpdate?.errors?.length > 0) {
                setError(data.productUpdate.errors[0].message);
            } else {
                setSuccess("Product updated successfully!");
                setTimeout(() => setSuccess(""), 3000);
                refetch();
            }
        },
        onError: (err) => setError(err.message),
    });

    const [updateStock, { loading: updatingStock }] = useMutation(STOCK_UPDATE, {
        onCompleted: (result) => {
            if (result?.productVariantStocksUpdate?.errors?.length > 0) {
                setError(result.productVariantStocksUpdate.errors[0].message);
            } else {
                setEditingStock(null);
                setStockValue("");
                refetch();
            }
        },
        onError: (err) => setError(err.message),
    });

    const [createStock, { loading: creatingStock }] = useMutation(STOCK_CREATE, {
        onCompleted: (result) => {
            if (result?.productVariantStocksCreate?.errors?.length > 0) {
                setError(result.productVariantStocksCreate.errors[0].message);
            } else {
                setAddingStockVariant(null);
                setNewWarehouseId("");
                setNewStockQty("");
                setSuccess("Stock added successfully!");
                setTimeout(() => setSuccess(""), 3000);
                refetch();
            }
        },
        onError: (err) => setError(err.message),
    });

    const [updateChannelListing] = useMutation(CHANNEL_LISTING_UPDATE, {
        onCompleted: (data) => {
            if (data?.productChannelListingUpdate?.errors?.length > 0) {
                setError(data.productChannelListingUpdate.errors[0].message);
            } else {
                setSuccess("Product visibility updated!");
                setTimeout(() => setSuccess(""), 3000);
                refetch();
            }
        },
        onError: (err) => setError(err.message),
    });

    // Image upload
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [deleteImage, { loading: deletingImage }] = useMutation(PRODUCT_MEDIA_DELETE, {
        onCompleted: (data) => {
            if (data?.productMediaDelete?.errors?.length > 0) {
                setError(data.productMediaDelete.errors[0].message);
            } else {
                setSuccess("Image deleted successfully!");
                setTimeout(() => setSuccess(""), 3000);
                refetch();
            }
        },
        onError: (err) => setError(err.message),
    });

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError("Please select a valid image file");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError("Image size must be less than 5MB");
            return;
        }

        setUploadingImage(true);
        setError("");

        try {
            const result = await uploadProductImage(productId, file, name || "Product image");

            if (result.success) {
                setSuccess("Image uploaded successfully!");
                setTimeout(() => setSuccess(""), 3000);
                refetch();
            } else {
                setError(result.error || "Failed to upload image");
            }
        } catch (err: any) {
            console.error("Upload error:", err);
            setError(err.message || "Failed to upload image");
        } finally {
            setUploadingImage(false);
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleDeleteImage = async (mediaId: string) => {
        if (!confirm("Are you sure you want to delete this image?")) return;

        await deleteImage({
            variables: { id: mediaId },
        });
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--secondary-50)' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-500)' }} />
            </div>
        );
    }

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-500)' }} />
                </div>
            </MainLayout>
        );
    }

    const product = data?.product;
    const categories = categoriesData?.categories?.edges || [];
    const warehouses = warehouseData?.warehouses?.edges || [];

    if (!product) {
        return (
            <MainLayout>
                <div className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--secondary-300)' }} />
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--secondary-700)' }}>Product not found</h2>
                    <p className="mt-2 mb-4" style={{ color: 'var(--secondary-500)' }}>
                        The product may have been deleted or the ID is invalid.
                    </p>
                    <Link href="/products" className="btn-primary mt-4 inline-block">
                        Back to Products
                    </Link>
                </div>
            </MainLayout>
        );
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        await updateProduct({
            variables: {
                id: productId,
                input: {
                    name: name.trim(),
                    description: description ? JSON.stringify({ blocks: [{ type: "paragraph", data: { text: description } }] }) : undefined,
                    category: categoryId || undefined,
                    seo: {
                        title: seoTitle || undefined,
                        description: seoDescription || undefined,
                    },
                },
            },
        });
    };

    const handleStockSave = (variantId: string, warehouseId: string) => {
        const qty = parseInt(stockValue);
        if (isNaN(qty) || qty < 0) return;

        updateStock({
            variables: {
                variantId,
                warehouseId,
                quantity: qty,
            },
        });
    };

    const handleAddStock = () => {
        if (!addingStockVariant || !newWarehouseId || !newStockQty) return;
        const qty = parseInt(newStockQty);
        if (isNaN(qty) || qty < 0) return;

        createStock({
            variables: {
                variantId: addingStockVariant,
                warehouseId: newWarehouseId,
                quantity: qty,
            },
        });
    };

    const handlePublishToggle = (publish: boolean) => {
        updateChannelListing({
            variables: {
                id: productId,
                input: {
                    updateChannels: [{
                        channelId: product.channelListings?.[0]?.channel?.id,
                        isPublished: publish,
                    }],
                },
            },
        });
    };

    const isPublished = product.channelListings?.some((cl: any) => cl.isPublished);
    const channelListing = product.channelListings?.find((cl: any) => cl.channel?.slug === "lk");
    const pricing = channelListing?.pricing?.priceRange?.start?.gross;

    // Get available warehouses for a variant (excluding ones already with stock)
    const getAvailableWarehouses = (variant: any) => {
        const existingWarehouseIds = variant.stocks?.map((s: any) => s.warehouse.id) || [];
        return warehouses.filter((w: any) => !existingWarehouseIds.includes(w.node.id));
    };

    // Calculate total stock
    const getTotalStock = () => {
        return product.variants?.reduce((total: number, v: any) => {
            return total + (v.stocks?.reduce((sum: number, s: any) => sum + s.quantity, 0) || 0);
        }, 0) || 0;
    };

    return (
        <MainLayout>
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/products"
                    className="inline-flex items-center gap-2 mb-4 hover:opacity-80"
                    style={{ color: 'var(--secondary-600)' }}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Products
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-4">
                        {product.thumbnail?.url ? (
                            <img
                                src={product.thumbnail.url}
                                alt={product.name}
                                className="w-16 h-16 object-cover rounded-lg"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--secondary-100)' }}>
                                <Package className="w-8 h-8" style={{ color: 'var(--secondary-300)' }} />
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold" style={{ color: 'var(--secondary-900)' }}>{product.name}</h1>
                            <p className="mt-1" style={{ color: 'var(--secondary-500)' }}>
                                {product.category?.name || "Uncategorized"} • {product.variants?.length || 0} variant(s)
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {isPublished ? (
                            <button
                                onClick={() => handlePublishToggle(false)}
                                className="badge-success flex items-center gap-1 cursor-pointer hover:opacity-80"
                            >
                                <Eye className="w-3 h-3" />
                                Published (Click to Unpublish)
                            </button>
                        ) : (
                            <button
                                onClick={() => handlePublishToggle(true)}
                                className="badge-warning flex items-center gap-1 cursor-pointer hover:opacity-80"
                            >
                                <EyeOff className="w-3 h-3" />
                                Draft (Click to Publish)
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Success/Error Messages */}
            {success && (
                <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-lg border border-green-100 flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    {success}
                </div>
            )}
            {error && (
                <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {error}
                    <button onClick={() => setError("")} className="ml-auto">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="mb-6">
                <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--secondary-100)' }}>
                    <button
                        onClick={() => setActiveTab("general")}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2
                            ${activeTab === "general"
                                ? "bg-white shadow-sm"
                                : "hover:bg-white/50"}`}
                        style={{ color: activeTab === "general" ? 'var(--secondary-900)' : 'var(--secondary-600)' }}
                    >
                        <FileText className="w-4 h-4" />
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab("stock")}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2
                            ${activeTab === "stock"
                                ? "bg-white shadow-sm"
                                : "hover:bg-white/50"}`}
                        style={{ color: activeTab === "stock" ? 'var(--secondary-900)' : 'var(--secondary-600)' }}
                    >
                        <Box className="w-4 h-4" />
                        Stock ({getTotalStock()})
                    </button>
                    <button
                        onClick={() => setActiveTab("seo")}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2
                            ${activeTab === "seo"
                                ? "bg-white shadow-sm"
                                : "hover:bg-white/50"}`}
                        style={{ color: activeTab === "seo" ? 'var(--secondary-900)' : 'var(--secondary-600)' }}
                    >
                        <Settings className="w-4 h-4" />
                        SEO
                    </button>
                </div>
            </div>

            {/* General Tab */}
            {activeTab === "general" && (
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <form onSubmit={handleSave}>
                            <div className="card p-6">
                                <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--secondary-900)' }}>
                                    <Tag className="w-5 h-5" style={{ color: 'var(--secondary-500)' }} />
                                    Basic Information
                                </h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--secondary-700)' }}>
                                            Product Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="input-field"
                                            required
                                            placeholder="Enter product name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--secondary-700)' }}>
                                            Description
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="input-field min-h-[150px]"
                                            placeholder="Describe your product..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--secondary-700)' }}>
                                            Category
                                        </label>
                                        <select
                                            value={categoryId}
                                            onChange={(e) => setCategoryId(e.target.value)}
                                            className="select-field"
                                        >
                                            <option value="">Select a category</option>
                                            {categories.map((edge: any) => (
                                                <option key={edge.node.id} value={edge.node.id}>
                                                    {edge.node.parent ? `${edge.node.parent.name} > ` : ""}{edge.node.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={updating}
                                        className="btn-primary flex items-center gap-2"
                                    >
                                        {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Product Images */}
                        <div className="card p-6">
                            <h2 className="font-semibold mb-4 flex items-center justify-between" style={{ color: 'var(--secondary-900)' }}>
                                <span className="flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5" style={{ color: 'var(--secondary-500)' }} />
                                    Product Images
                                </span>
                                <span className="text-xs font-normal" style={{ color: 'var(--secondary-400)' }}>
                                    {product.media?.length || 0} image(s)
                                </span>
                            </h2>

                            {/* Current Images */}
                            {product.media && product.media.length > 0 ? (
                                <div className="space-y-3 mb-4">
                                    {product.media.map((media: any, index: number) => (
                                        <div key={media.id} className="relative group">
                                            <img
                                                src={media.url}
                                                alt={media.alt || product.name}
                                                className="w-full aspect-square object-cover rounded-lg"
                                            />
                                            {index === 0 && (
                                                <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                                                    Thumbnail
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteImage(media.id)}
                                                disabled={deletingImage}
                                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                title="Delete image"
                                            >
                                                {deletingImage ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="w-full aspect-square rounded-lg flex flex-col items-center justify-center mb-4" style={{ backgroundColor: 'var(--secondary-100)' }}>
                                    <Package className="w-16 h-16 mb-2" style={{ color: 'var(--secondary-300)' }} />
                                    <p className="text-sm" style={{ color: 'var(--secondary-400)' }}>No images yet</p>
                                </div>
                            )}

                            {/* Upload Button */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                                disabled={uploadingImage}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingImage}
                                className="w-full btn-secondary flex items-center justify-center gap-2"
                            >
                                {uploadingImage ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Upload Image
                                    </>
                                )}
                            </button>
                            <p className="text-xs mt-2 text-center" style={{ color: 'var(--secondary-400)' }}>
                                JPG, PNG up to 5MB. First image is thumbnail.
                            </p>
                        </div>

                        {/* Pricing Info */}
                        <div className="card p-6">
                            <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--secondary-900)' }}>
                                <DollarSign className="w-5 h-5" style={{ color: 'var(--secondary-500)' }} />
                                Pricing
                            </h2>
                            {pricing ? (
                                <div>
                                    <p className="text-3xl font-bold" style={{ color: 'var(--primary-600)' }}>
                                        Rs. {pricing.amount.toFixed(2)}
                                    </p>
                                    <p className="text-sm mt-1" style={{ color: 'var(--secondary-500)' }}>
                                        {pricing.currency}
                                    </p>
                                </div>
                            ) : (
                                <p style={{ color: 'var(--secondary-500)' }}>No price set</p>
                            )}
                            <p className="text-sm mt-3" style={{ color: 'var(--secondary-400)' }}>
                                Prices are managed in the Admin Dashboard
                            </p>
                        </div>

                        {/* Quick Info */}
                        <div className="card p-6">
                            <h2 className="font-semibold mb-4" style={{ color: 'var(--secondary-900)' }}>Info</h2>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--secondary-500)' }}>Product Type</span>
                                    <span style={{ color: 'var(--secondary-900)' }}>{product.productType?.name || "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--secondary-500)' }}>Variants</span>
                                    <span style={{ color: 'var(--secondary-900)' }}>{product.variants?.length || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--secondary-500)' }}>Total Stock</span>
                                    <span style={{ color: 'var(--secondary-900)' }}>{getTotalStock()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--secondary-500)' }}>Slug</span>
                                    <span className="truncate max-w-[150px]" style={{ color: 'var(--secondary-900)' }}>{product.slug}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stock Tab */}
            {activeTab === "stock" && (
                <div className="space-y-4">
                    {product.variants?.map((variant: any) => {
                        const stocks = variant.stocks || [];
                        const totalStock = stocks.reduce((sum: number, s: any) => sum + s.quantity, 0);
                        const availableWarehouses = getAvailableWarehouses(variant);
                        const isAddingStock = addingStockVariant === variant.id;

                        return (
                            <div key={variant.id} className="card">
                                {/* Variant Header */}
                                <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--secondary-100)' }}>
                                    <div>
                                        <h3 className="font-semibold" style={{ color: 'var(--secondary-900)' }}>
                                            {variant.name || "Default Variant"}
                                        </h3>
                                        <p className="text-sm" style={{ color: 'var(--secondary-500)' }}>
                                            SKU: {variant.sku || "-"}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`badge ${totalStock > 10 ? 'badge-success' : totalStock > 0 ? 'badge-warning' : 'badge-danger'}`}>
                                            {totalStock > 0 ? `${totalStock} in stock` : 'Out of Stock'}
                                        </span>
                                        {availableWarehouses.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    setAddingStockVariant(variant.id);
                                                    setNewWarehouseId("");
                                                    setNewStockQty("");
                                                }}
                                                className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Add Stock
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Add Stock Form */}
                                {isAddingStock && (
                                    <div className="p-4" style={{ backgroundColor: 'var(--primary-50)', borderBottom: '1px solid var(--secondary-100)' }}>
                                        <div className="flex flex-wrap items-end gap-3">
                                            <div>
                                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--secondary-700)' }}>
                                                    Warehouse
                                                </label>
                                                <select
                                                    value={newWarehouseId}
                                                    onChange={(e) => setNewWarehouseId(e.target.value)}
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
                                                    value={newStockQty}
                                                    onChange={(e) => setNewStockQty(e.target.value)}
                                                    className="input-field w-24 text-center"
                                                    min="0"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <button
                                                onClick={handleAddStock}
                                                disabled={creatingStock || !newWarehouseId || !newStockQty}
                                                className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
                                            >
                                                {creatingStock ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                Add
                                            </button>
                                            <button
                                                onClick={() => { setAddingStockVariant(null); setNewWarehouseId(""); setNewStockQty(""); }}
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
                                                    const key = `${variant.id}-${stock.warehouse.id}`;
                                                    const isEditing = editingStock === key;
                                                    const available = stock.quantity - (stock.quantityAllocated || 0);

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
                                                                        value={stockValue}
                                                                        onChange={(e) => setStockValue(e.target.value)}
                                                                        className="input-field w-20 text-center py-1"
                                                                        min="0"
                                                                        autoFocus
                                                                    />
                                                                ) : (
                                                                    <span className={`font-semibold ${stock.quantity < 10 ? 'text-yellow-600' : ''}`} style={{ color: stock.quantity >= 10 ? 'var(--secondary-900)' : undefined }}>
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
                                                                            onClick={() => handleStockSave(variant.id, stock.warehouse.id)}
                                                                            disabled={updatingStock}
                                                                            className="btn-primary text-sm py-1.5 px-3"
                                                                        >
                                                                            {updatingStock ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => { setEditingStock(null); setStockValue(""); }}
                                                                            className="btn-secondary text-sm py-1.5 px-3"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => { setEditingStock(key); setStockValue(stock.quantity.toString()); }}
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
                                    <div className="p-8 text-center">
                                        <Box className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--secondary-300)' }} />
                                        <p style={{ color: 'var(--secondary-500)' }}>No stock in any warehouse</p>
                                        <p className="text-sm mt-1" style={{ color: 'var(--secondary-400)' }}>
                                            Click "Add Stock" to add inventory
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* SEO Tab */}
            {activeTab === "seo" && (
                <div className="lg:max-w-2xl">
                    <form onSubmit={handleSave}>
                        <div className="card p-6">
                            <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--secondary-900)' }}>
                                <Settings className="w-5 h-5" style={{ color: 'var(--secondary-500)' }} />
                                Search Engine Optimization
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--secondary-700)' }}>
                                        SEO Title
                                    </label>
                                    <input
                                        type="text"
                                        value={seoTitle}
                                        onChange={(e) => setSeoTitle(e.target.value)}
                                        className="input-field"
                                        placeholder={name || "Enter SEO title"}
                                    />
                                    <p className="text-xs mt-1" style={{ color: 'var(--secondary-400)' }}>
                                        {seoTitle.length}/70 characters (recommended)
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--secondary-700)' }}>
                                        SEO Description
                                    </label>
                                    <textarea
                                        value={seoDescription}
                                        onChange={(e) => setSeoDescription(e.target.value)}
                                        className="input-field min-h-[100px]"
                                        placeholder="Enter meta description for search engines..."
                                    />
                                    <p className="text-xs mt-1" style={{ color: 'var(--secondary-400)' }}>
                                        {seoDescription.length}/160 characters (recommended)
                                    </p>
                                </div>

                                {/* Preview */}
                                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--secondary-50)' }}>
                                    <p className="text-xs font-medium mb-2" style={{ color: 'var(--secondary-500)' }}>
                                        SEARCH PREVIEW
                                    </p>
                                    <p className="text-lg text-blue-600 hover:underline cursor-pointer">
                                        {seoTitle || name || "Product Title"}
                                    </p>
                                    <p className="text-sm text-green-700">
                                        https://pmtraders.lk/lk/products/{product.slug}
                                    </p>
                                    <p className="text-sm mt-1" style={{ color: 'var(--secondary-600)' }}>
                                        {seoDescription || description?.slice(0, 160) || "Product description will appear here..."}
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Save SEO Settings
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* All Warehouses Quick View (only on Stock tab) */}
            {activeTab === "stock" && warehouses.length > 0 && (
                <div className="mt-6 card p-4">
                    <h3 className="font-medium mb-3" style={{ color: 'var(--secondary-900)' }}>Available Warehouses</h3>
                    <div className="flex flex-wrap gap-2">
                        {warehouses.map((w: any) => (
                            <span key={w.node.id} className="badge-secondary">
                                <Warehouse className="w-3 h-3 mr-1" />
                                {w.node.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </MainLayout>
    );
}

function parseDescription(desc: string | null): string {
    if (!desc) return "";
    try {
        const parsed = JSON.parse(desc);
        if (parsed.blocks) {
            return parsed.blocks.map((b: any) => b.data?.text || "").join("\n");
        }
        return desc;
    } catch {
        return desc;
    }
}
