"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { MainLayout } from "@/components/layout/Sidebar";
import { useQuery, useMutation } from "@apollo/client";
import {
    CATEGORIES_LIST,
    PRODUCT_CREATE,
    PRODUCT_TYPES_LIST,
    PRODUCT_CHANNEL_LISTING_UPDATE,
    PRODUCT_VARIANT_CREATE,
    PRODUCT_VARIANT_CHANNEL_LISTING_UPDATE,
    CHANNELS_LIST,
    UPDATE_PRODUCT_METADATA,
    STOCK_CREATE,
    WAREHOUSES_LIST
} from "@/lib/graphql";
import { uploadProductImage } from "@/lib/apollo-client";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Package, Check, AlertTriangle, Upload, Image as ImageIcon, Warehouse, X } from "lucide-react";

// Hardcoded channel slug for PMTraders
const DEFAULT_CHANNEL_SLUG = "lk";

export default function NewProductPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [productTypeId, setProductTypeId] = useState("");
    const [price, setPrice] = useState("");
    const [priceUnit, setPriceUnit] = useState("kg"); // Display price unit
    const [displayUnit, setDisplayUnit] = useState("kg"); // Storefront display unit
    const [error, setError] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [creationStep, setCreationStep] = useState("");

    // Image upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Stock state
    const [stockQty, setStockQty] = useState("");
    const [stockUnit, setStockUnit] = useState("kg"); // kg or g for weighted products
    const [warehouseId, setWarehouseId] = useState("");

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    const { data: categoriesData } = useQuery(CATEGORIES_LIST, {
        skip: !isAuthenticated,
    });

    const { data: productTypesData } = useQuery(PRODUCT_TYPES_LIST, {
        skip: !isAuthenticated,
    });

    const { data: channelsData } = useQuery(CHANNELS_LIST, {
        skip: !isAuthenticated,
    });

    const { data: warehousesData } = useQuery(WAREHOUSES_LIST, {
        skip: !isAuthenticated,
    });

    const [createProduct] = useMutation(PRODUCT_CREATE);
    const [updateChannelListing] = useMutation(PRODUCT_CHANNEL_LISTING_UPDATE);
    const [createVariant] = useMutation(PRODUCT_VARIANT_CREATE);
    const [updateVariantChannelListing] = useMutation(PRODUCT_VARIANT_CHANNEL_LISTING_UPDATE);
    const [updateMetadata] = useMutation(UPDATE_PRODUCT_METADATA);
    const [createStock] = useMutation(STOCK_CREATE);

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary-50">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    const categories = categoriesData?.categories?.edges || [];
    const productTypes = productTypesData?.productTypes?.edges || [];

    // Get the LK channel ID
    const lkChannel = channelsData?.channels?.find((c: any) => c.slug === DEFAULT_CHANNEL_SLUG);

    // Get first warehouse
    const warehouses = warehousesData?.warehouses?.edges || [];
    const defaultWarehouse = warehouses[0]?.node;

    // Weighted product types - these get weight-based pricing (per 25g, 100g, kg)
    // Non-weighted (like "Packaged Items") get simple item pricing
    const WEIGHTED_PRODUCT_TYPES = ["Fresh Fruits", "Fresh Vegetables"];

    // Check if selected product type is weighted
    const selectedProductType = productTypes.find((pt: any) => pt.node.id === productTypeId)?.node;
    const isWeightedProduct = selectedProductType ? WEIGHTED_PRODUCT_TYPES.includes(selectedProductType.name) : true;

    // Handle image file selection
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!name.trim()) {
            setError("Product name is required");
            return;
        }

        if (!productTypeId) {
            setError("Product type is required");
            return;
        }

        if (!lkChannel) {
            setError("Channel 'lk' not found. Please contact support.");
            return;
        }

        const displayPriceValue = parseFloat(price);
        if (!price || isNaN(displayPriceValue) || displayPriceValue <= 0) {
            setError("Please enter a valid price");
            return;
        }

        // Calculate variant price based on product type
        let variantPrice: number;
        if (isWeightedProduct) {
            // Weighted products: calculate per 25g from display price
            const multipliers: Record<string, number> = {
                "25g": 1,
                "100g": 4,
                "250g": 10,
                "500g": 20,
                "kg": 40,
            };
            const mult = multipliers[priceUnit] || 40;
            variantPrice = displayPriceValue / mult;
        } else {
            // Non-weighted products (e.g., Packaged Items): use direct price
            variantPrice = displayPriceValue;
        }

        setIsCreating(true);

        try {
            // Step 1: Create the product
            setCreationStep("Creating product...");
            const slug = name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")
                + "-" + Date.now(); // Add timestamp to ensure unique slug

            console.log("Step 1: Creating product with input:", {
                name: name.trim(),
                slug,
                description: description ? "has description" : "no description",
                category: categoryId || "none",
                productType: productTypeId,
            });

            const productResult = await createProduct({
                variables: {
                    input: {
                        name: name.trim(),
                        slug,
                        description: description ? JSON.stringify({ blocks: [{ type: "paragraph", data: { text: description } }] }) : undefined,
                        category: categoryId || undefined,
                        productType: productTypeId,
                    },
                },
            });

            console.log("Step 1 result:", productResult);

            if (productResult.data?.productCreate?.errors?.length > 0) {
                console.error("Product create errors:", productResult.data.productCreate.errors);
                throw new Error(productResult.data.productCreate.errors[0].message);
            }

            const productId = productResult.data?.productCreate?.product?.id;
            if (!productId) {
                throw new Error("Failed to create product - no ID returned");
            }

            // Step 2: Assign to channel and publish
            setCreationStep("Assigning to channel...");
            const channelResult = await updateChannelListing({
                variables: {
                    id: productId,
                    input: {
                        updateChannels: [{
                            channelId: lkChannel.id,
                            isPublished: true,
                            isAvailableForPurchase: true,
                            visibleInListings: true,
                        }],
                    },
                },
            });

            if (channelResult.data?.productChannelListingUpdate?.errors?.length > 0) {
                console.warn("Channel listing warning:", channelResult.data.productChannelListingUpdate.errors);
            }

            // Step 3: Create a default variant
            setCreationStep("Creating variant...");
            const sku = `${name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

            const variantResult = await createVariant({
                variables: {
                    input: {
                        product: productId,
                        name: name.trim(),
                        sku: sku,
                        attributes: [], // Required field - empty array for no attributes
                    },
                },
            });

            if (variantResult.data?.productVariantCreate?.errors?.length > 0) {
                throw new Error(variantResult.data.productVariantCreate.errors[0].message);
            }

            const variantId = variantResult.data?.productVariantCreate?.productVariant?.id;
            if (!variantId) {
                throw new Error("Failed to create variant - no ID returned");
            }

            // Step 4: Set variant price in channel
            setCreationStep("Setting price...");
            const variantChannelResult = await updateVariantChannelListing({
                variables: {
                    id: variantId,
                    input: [{
                        channelId: lkChannel.id,
                        price: variantPrice.toFixed(2),
                    }],
                },
            });

            if (variantChannelResult.data?.productVariantChannelListingUpdate?.errors?.length > 0) {
                console.warn("Variant channel listing warning:", variantChannelResult.data.productVariantChannelListingUpdate.errors);
            }

            // Step 5: Save display unit metadata
            setCreationStep("Saving display unit...");
            await updateMetadata({
                variables: {
                    id: productId,
                    input: [{ key: "price_display_unit", value: displayUnit }],
                },
            });

            // Step 6: Upload image if provided
            if (imageFile) {
                setCreationStep("Uploading image...");
                const uploadResult = await uploadProductImage(productId, imageFile, name.trim());
                if (!uploadResult.success) {
                    console.warn("Image upload warning:", uploadResult.error);
                }
            }

            // Step 7: Create stock if quantity provided
            if (stockQty && parseFloat(stockQty) > 0 && defaultWarehouse) {
                setCreationStep("Setting stock...");

                // Calculate stock quantity in base units
                let stockQuantity: number;
                if (isWeightedProduct) {
                    // Convert kg/g to base units (1 base unit = 25g)
                    if (stockUnit === "kg") {
                        stockQuantity = Math.round(parseFloat(stockQty) * 40); // 1kg = 40 units
                    } else {
                        stockQuantity = Math.round(parseFloat(stockQty) / 25); // grams / 25
                    }
                } else {
                    // Non-weighted: use direct quantity
                    stockQuantity = parseInt(stockQty);
                }

                const stockResult = await createStock({
                    variables: {
                        variantId: variantId,
                        warehouseId: defaultWarehouse.id,
                        quantity: stockQuantity,
                    },
                });
                if (stockResult.data?.productVariantStocksCreate?.errors?.length > 0) {
                    console.warn("Stock creation warning:", stockResult.data.productVariantStocksCreate.errors);
                }
            }

            // Success! Redirect to the product edit page
            setCreationStep("Done!");
            router.push(`/products/${encodeURIComponent(productId)}`);

        } catch (err: any) {
            console.error("Product creation error:", err);
            console.error("Error details:", JSON.stringify(err, null, 2));

            // Try to extract more detailed error message
            let errorMessage = "Failed to create product";
            if (err.graphQLErrors && err.graphQLErrors.length > 0) {
                errorMessage = err.graphQLErrors.map((e: any) => e.message).join(", ");
            } else if (err.networkError) {
                errorMessage = `Network error: ${err.networkError.message || err.networkError.statusCode}`;
                if (err.networkError.result?.errors) {
                    errorMessage += " - " + err.networkError.result.errors.map((e: any) => e.message).join(", ");
                }
            } else if (err.message) {
                errorMessage = err.message;
            }

            setError(errorMessage);
            setIsCreating(false);
            setCreationStep("");
        }
    };

    return (
        <MainLayout>
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/products"
                    className="inline-flex items-center gap-2 text-secondary-600 hover:text-secondary-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Products
                </Link>

                <h1 className="text-2xl font-bold text-secondary-900">Add New Product</h1>
                <p className="text-secondary-500 mt-1">
                    Create a new product in your catalog
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="card p-6">
                            <h2 className="font-semibold text-secondary-900 mb-4">Basic Information</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                                        Product Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="input-field"
                                        placeholder="e.g., Fresh Tomatoes"
                                        required
                                        disabled={isCreating}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                                        Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="input-field min-h-[120px]"
                                        placeholder="Describe your product..."
                                        disabled={isCreating}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                                            Category
                                        </label>
                                        <select
                                            value={categoryId}
                                            onChange={(e) => setCategoryId(e.target.value)}
                                            className="select-field"
                                            disabled={isCreating}
                                        >
                                            <option value="">Select a category</option>
                                            {categories.map((edge: any) => (
                                                <option key={edge.node.id} value={edge.node.id}>
                                                    {edge.node.parent ? `${edge.node.parent.name} > ` : ""}{edge.node.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                                            Product Type *
                                        </label>
                                        <select
                                            value={productTypeId}
                                            onChange={(e) => setProductTypeId(e.target.value)}
                                            className="select-field"
                                            required
                                            disabled={isCreating}
                                        >
                                            <option value="">Select a product type</option>
                                            {productTypes.map((edge: any) => (
                                                <option key={edge.node.id} value={edge.node.id}>
                                                    {edge.node.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Pricing Section - Conditional based on product type */}
                                <div className="p-4 rounded-lg border border-primary-200 bg-primary-50">
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                                        💰 Price Settings *
                                    </label>

                                    {isWeightedProduct ? (
                                        /* Weight-based pricing for Fresh Fruits, Fresh Vegetables */
                                        <>
                                            {/* Price Input with Unit Selector */}
                                            <div className="flex gap-2 mb-2">
                                                <input
                                                    type="number"
                                                    value={price}
                                                    onChange={(e) => setPrice(e.target.value)}
                                                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
                                                    placeholder="e.g., 4800"
                                                    min="0"
                                                    step="0.01"
                                                    required
                                                    disabled={isCreating}
                                                />
                                                <select
                                                    value={priceUnit}
                                                    onChange={(e) => setPriceUnit(e.target.value)}
                                                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
                                                    disabled={isCreating}
                                                >
                                                    <option value="25g">per 25g</option>
                                                    <option value="100g">per 100g</option>
                                                    <option value="250g">per 250g</option>
                                                    <option value="500g">per 500g</option>
                                                    <option value="kg">per 1kg</option>
                                                </select>
                                            </div>

                                            {/* Auto-calculated variant price */}
                                            {price && (
                                                <p className="text-sm text-green-700 bg-green-50 px-2 py-1 rounded mb-3">
                                                    ✅ Variant price: Rs.{(parseFloat(price) / (priceUnit === "25g" ? 1 : priceUnit === "100g" ? 4 : priceUnit === "250g" ? 10 : priceUnit === "500g" ? 20 : 40)).toFixed(2)} / 25g
                                                </p>
                                            )}

                                            {/* Storefront Display Unit */}
                                            <label className="block text-xs font-medium text-secondary-600 mb-2 mt-3">
                                                📊 Storefront Display Unit
                                            </label>
                                            <div className="flex flex-wrap gap-1">
                                                {[
                                                    { value: "25g", label: "25g" },
                                                    { value: "100g", label: "100g" },
                                                    { value: "250g", label: "250g" },
                                                    { value: "500g", label: "500g" },
                                                    { value: "kg", label: "1kg" },
                                                ].map((unit) => (
                                                    <button
                                                        key={unit.value}
                                                        type="button"
                                                        onClick={() => setDisplayUnit(unit.value)}
                                                        disabled={isCreating}
                                                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${displayUnit === unit.value
                                                            ? "bg-primary-500 text-white border-primary-500"
                                                            : "bg-white border-secondary-300 hover:border-primary-400"
                                                            }`}
                                                    >
                                                        {unit.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-xs text-secondary-400 mt-2">
                                                Storefront will show: Rs.{price ? (parseFloat(price) * (displayUnit === priceUnit ? 1 : ((displayUnit === "25g" ? 1 : displayUnit === "100g" ? 4 : displayUnit === "250g" ? 10 : displayUnit === "500g" ? 20 : 40) / (priceUnit === "25g" ? 1 : priceUnit === "100g" ? 4 : priceUnit === "250g" ? 10 : priceUnit === "500g" ? 20 : 40)))).toFixed(2) : "0"} / {displayUnit === "kg" ? "1kg" : displayUnit}
                                            </p>
                                        </>
                                    ) : (
                                        /* Simple item pricing for Packaged Items */
                                        <>
                                            <div className="mb-2">
                                                <input
                                                    type="number"
                                                    value={price}
                                                    onChange={(e) => setPrice(e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
                                                    placeholder="e.g., 150"
                                                    min="0"
                                                    step="0.01"
                                                    required
                                                    disabled={isCreating}
                                                />
                                            </div>
                                            <p className="text-sm text-secondary-500 mb-2">
                                                Price per item/piece
                                            </p>
                                            {price && (
                                                <p className="text-sm text-green-700 bg-green-50 px-2 py-1 rounded">
                                                    ✅ Item price: Rs.{parseFloat(price).toFixed(0)}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Image Upload Section */}
                        <div className="card p-6">
                            <h2 className="font-semibold text-secondary-900 mb-4 flex items-center gap-2">
                                <ImageIcon className="w-5 h-5" />
                                Product Image
                            </h2>

                            {imagePreview ? (
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full h-48 object-cover rounded-lg"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        disabled={isCreating}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 disabled:opacity-50"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => !isCreating && fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-secondary-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 transition-colors"
                                >
                                    <Upload className="w-10 h-10 mx-auto mb-2 text-secondary-400" />
                                    <p className="text-secondary-600">Click to upload an image</p>
                                    <p className="text-xs text-secondary-400 mt-1">JPG, PNG up to 5MB</p>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                accept="image/*"
                                className="hidden"
                                disabled={isCreating}
                            />
                        </div>

                        {/* Stock Section */}
                        <div className="card p-6">
                            <h2 className="font-semibold text-secondary-900 mb-4 flex items-center gap-2">
                                <Warehouse className="w-5 h-5" />
                                Initial Stock
                            </h2>

                            {defaultWarehouse ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                                            Warehouse
                                        </label>
                                        <div className="flex items-center gap-2 px-3 py-2 bg-secondary-50 rounded-lg">
                                            <Warehouse className="w-4 h-4 text-secondary-500" />
                                            <span className="text-secondary-700">{defaultWarehouse.name}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                                            {isWeightedProduct ? "Stock Amount" : "Stock Quantity"}
                                        </label>
                                        {isWeightedProduct ? (
                                            /* Weighted products: kg/g input */
                                            <>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        value={stockQty}
                                                        onChange={(e) => setStockQty(e.target.value)}
                                                        className="input-field flex-1"
                                                        placeholder="e.g., 5"
                                                        min="0"
                                                        step="0.1"
                                                        disabled={isCreating}
                                                    />
                                                    <select
                                                        value={stockUnit}
                                                        onChange={(e) => setStockUnit(e.target.value)}
                                                        className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
                                                        disabled={isCreating}
                                                    >
                                                        <option value="kg">kg</option>
                                                        <option value="g">grams</option>
                                                    </select>
                                                </div>
                                                {stockQty && (
                                                    <p className="text-xs text-green-600 mt-1">
                                                        = {stockUnit === "kg"
                                                            ? (parseFloat(stockQty) * 40).toFixed(0)
                                                            : (parseFloat(stockQty) / 25).toFixed(0)
                                                        } base units (25g each)
                                                    </p>
                                                )}
                                                <p className="text-xs text-secondary-400 mt-1">
                                                    Enter stock in {stockUnit === "kg" ? "kilograms" : "grams"} - auto-converted to base units
                                                </p>
                                            </>
                                        ) : (
                                            /* Non-weighted products: simple item count */
                                            <>
                                                <input
                                                    type="number"
                                                    value={stockQty}
                                                    onChange={(e) => setStockQty(e.target.value)}
                                                    className="input-field"
                                                    placeholder="e.g., 100"
                                                    min="0"
                                                    disabled={isCreating}
                                                />
                                                <p className="text-xs text-secondary-400 mt-1">
                                                    Number of items/pieces in stock
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-secondary-500 text-sm">No warehouse available</p>
                            )}
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="card p-6">
                            <h2 className="font-semibold text-secondary-900 mb-4">Actions</h2>
                            <button
                                type="submit"
                                disabled={isCreating}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {creationStep}
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Create Product
                                    </>
                                )}
                            </button>
                            <p className="text-sm text-secondary-500 mt-3 text-center">
                                Product will be published and available for purchase automatically
                            </p>
                        </div>

                        <div className="card p-6">
                            <h3 className="font-medium text-secondary-700 mb-3">What happens when you create:</h3>
                            <ul className="space-y-2 text-sm text-secondary-600">
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-500" />
                                    Product created with details
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-500" />
                                    Assigned to LK channel
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-500" />
                                    Published automatically
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-500" />
                                    Available for purchase
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-500" />
                                    Price set in LKR
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-500" />
                                    Image uploaded (if provided)
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-500" />
                                    Stock set (if provided)
                                </li>
                            </ul>
                        </div>

                        <div className="card p-6 bg-primary-50 border-primary-200">
                            <div className="flex items-center gap-3 text-primary-700">
                                <Package className="w-10 h-10" />
                                <div>
                                    <p className="font-medium">Complete Setup</p>
                                    <p className="text-sm text-primary-600">
                                        Add image and stock above to fully set up your product!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </MainLayout>
    );
}
