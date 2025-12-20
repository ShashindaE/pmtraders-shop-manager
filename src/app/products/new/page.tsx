"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/Sidebar";
import { useQuery, useMutation } from "@apollo/client";
import {
    CATEGORIES_LIST,
    PRODUCT_CREATE,
    PRODUCT_TYPES_LIST,
    PRODUCT_CHANNEL_LISTING_UPDATE,
    PRODUCT_VARIANT_CREATE,
    PRODUCT_VARIANT_CHANNEL_LISTING_UPDATE,
    CHANNELS_LIST
} from "@/lib/graphql";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Package, Check, AlertTriangle } from "lucide-react";

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
    const [error, setError] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [creationStep, setCreationStep] = useState("");

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

    const [createProduct] = useMutation(PRODUCT_CREATE);
    const [updateChannelListing] = useMutation(PRODUCT_CHANNEL_LISTING_UPDATE);
    const [createVariant] = useMutation(PRODUCT_VARIANT_CREATE);
    const [updateVariantChannelListing] = useMutation(PRODUCT_VARIANT_CHANNEL_LISTING_UPDATE);

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

        const priceValue = parseFloat(price);
        if (!price || isNaN(priceValue) || priceValue <= 0) {
            setError("Please enter a valid price");
            return;
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

            if (productResult.data?.productCreate?.errors?.length > 0) {
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
                        price: priceValue,
                    }],
                },
            });

            if (variantChannelResult.data?.productVariantChannelListingUpdate?.errors?.length > 0) {
                console.warn("Variant channel listing warning:", variantChannelResult.data.productVariantChannelListingUpdate.errors);
            }

            // Success! Redirect to the product edit page
            setCreationStep("Done!");
            router.push(`/products/${encodeURIComponent(productId)}`);

        } catch (err: any) {
            setError(err.message || "Failed to create product");
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

                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                                        Price (LKR) *
                                    </label>
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="input-field"
                                        placeholder="e.g., 150.00"
                                        min="0"
                                        step="0.01"
                                        required
                                        disabled={isCreating}
                                    />
                                    <p className="text-xs text-secondary-400 mt-1">
                                        Enter the selling price in Sri Lankan Rupees
                                    </p>
                                </div>
                            </div>
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
                            </ul>
                        </div>

                        <div className="card p-6">
                            <div className="flex items-center gap-3 text-secondary-500">
                                <Package className="w-10 h-10" />
                                <div>
                                    <p className="font-medium text-secondary-700">After Creating</p>
                                    <p className="text-sm">
                                        You can add images and stock from the edit page.
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
