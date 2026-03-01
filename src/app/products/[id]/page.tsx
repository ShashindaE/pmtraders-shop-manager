"use client";

import { useAuth } from "@/lib/auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { MainLayout } from "@/components/layout/Sidebar";
import { useQuery, useMutation } from "@apollo/client";
import { PRODUCT_DETAILS, PRODUCT_UPDATE, CATEGORIES_LIST, STOCK_UPDATE, STOCK_CREATE, WAREHOUSES_LIST, PRODUCT_MEDIA_DELETE, UPDATE_PRODUCT_METADATA, PRODUCT_VARIANT_CHANNEL_LISTING_UPDATE } from "@/lib/graphql";
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

// Set wholesale variant price mutation (WholesaleVariantPrice model)
const SET_WHOLESALE_VARIANT_PRICE = gql`
  mutation SetWholesaleVariantPrice($input: WholesaleVariantPriceInput!) {
    setWholesaleVariantPrice(input: $input) {
      wholesalePrice {
        id
        priceAmount
        unit
        active
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
    const [editStockUnit, setEditStockUnit] = useState<"kg" | "g">("kg");

    // Add stock modal
    const [addingStockVariant, setAddingStockVariant] = useState<string | null>(null);
    const [newWarehouseId, setNewWarehouseId] = useState("");
    const [newStockQty, setNewStockQty] = useState("");
    const [newStockUnit, setNewStockUnit] = useState("kg"); // kg or g for weighted products

    // Display unit selector state
    const [selectedDisplayUnit, setSelectedDisplayUnit] = useState("kg");
    const [savingDisplayUnit, setSavingDisplayUnit] = useState(false);

    // Price editing state
    const [displayPriceInput, setDisplayPriceInput] = useState("");
    const [priceInputUnit, setPriceInputUnit] = useState("kg");
    const [savingPrice, setSavingPrice] = useState(false);

    // MOQ (Min/Max Order Quantity) settings
    const [minOrderWeight, setMinOrderWeight] = useState("");
    const [maxOrderWeight, setMaxOrderWeight] = useState("");
    const [minOrderWeightUnit, setMinOrderWeightUnit] = useState("g"); // g or kg
    const [maxOrderWeightUnit, setMaxOrderWeightUnit] = useState("g"); // g or kg
    const [minOrderQuantity, setMinOrderQuantity] = useState("");
    const [maxOrderQuantity, setMaxOrderQuantity] = useState("");
    const [weightStep, setWeightStep] = useState("");
    const [weightStepUnit, setWeightStepUnit] = useState("g");
    const [savingMOQ, setSavingMOQ] = useState(false);

    // Wholesale pricing settings
    const [wholesaleEnabled, setWholesaleEnabled] = useState(false);
    const [wholesalePrice, setWholesalePrice] = useState("");
    const [wholsalePriceUnit, setWholesalePriceUnit] = useState("kg"); // for weighted products
    const [wholesaleMOQ, setWholesaleMOQ] = useState("");
    const [savingWholesale, setSavingWholesale] = useState(false);

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
                // Load display unit from metadata
                const displayUnit = data.product.metadata?.find((m: any) => m.key === "price_display_unit")?.value;
                if (displayUnit) {
                    setSelectedDisplayUnit(displayUnit);
                }
                // Load MOQ settings from metadata (stored in grams)
                const minWeight = data.product.metadata?.find((m: any) => m.key === "min_order_weight")?.value;
                const maxWeight = data.product.metadata?.find((m: any) => m.key === "max_order_weight")?.value;
                const minQty = data.product.metadata?.find((m: any) => m.key === "min_order_quantity")?.value;
                const maxQty = data.product.metadata?.find((m: any) => m.key === "max_order_quantity")?.value;
                // Auto-detect best unit: show in kg if >= 1000g, else grams
                if (minWeight) {
                    const grams = parseFloat(minWeight);
                    if (grams >= 1000) {
                        setMinOrderWeight((grams / 1000).toString());
                        setMinOrderWeightUnit("kg");
                    } else {
                        setMinOrderWeight(grams.toString());
                        setMinOrderWeightUnit("g");
                    }
                }
                if (maxWeight) {
                    const grams = parseFloat(maxWeight);
                    if (grams >= 1000) {
                        setMaxOrderWeight((grams / 1000).toString());
                        setMaxOrderWeightUnit("kg");
                    } else {
                        setMaxOrderWeight(grams.toString());
                        setMaxOrderWeightUnit("g");
                    }
                }
                if (minQty) setMinOrderQuantity(minQty);
                if (maxQty) setMaxOrderQuantity(maxQty);
                // Load weight step from metadata (stored in grams)
                const wStep = data.product.metadata?.find((m: any) => m.key === "weight_step")?.value;
                if (wStep) {
                    const grams = parseFloat(wStep);
                    if (grams >= 1000) {
                        setWeightStep((grams / 1000).toString());
                        setWeightStepUnit("kg");
                    } else {
                        setWeightStep(grams.toString());
                        setWeightStepUnit("g");
                    }
                }

                // Load wholesale settings from WholesaleVariantPrice model
                const variant = data.product.variants?.[0];
                const productIsWeighted = data.product.productType?.measurementType === "WEIGHTED";

                if (variant?.wholesalePrice && variant.wholesalePrice.active) {
                    setWholesaleEnabled(true);
                    // priceAmount is stored in BASE UNITS (per 25g), convert to display unit (per kg)
                    const basePriceAmount = parseFloat(variant.wholesalePrice.priceAmount);
                    if (productIsWeighted) {
                        // Multiply by 40 to convert from per-25g to per-kg display
                        const displayPrice = basePriceAmount * 40;
                        setWholesalePrice(displayPrice.toFixed(0));
                        setWholesalePriceUnit("kg");
                    } else {
                        // For countable products, price is per item directly
                        setWholesalePrice(basePriceAmount.toFixed(0));
                    }
                    // MOQ is still in metadata
                    const wsMOQ = data.product.metadata?.find((m: any) => m.key === "wholesale_moq")?.value;
                    if (wsMOQ) setWholesaleMOQ(wsMOQ);
                } else {
                    // Fallback to metadata for backward compatibility
                    const wsEnabled = data.product.metadata?.find((m: any) => m.key === "wholesale_enabled")?.value;
                    const wsPrice = data.product.metadata?.find((m: any) => m.key === "wholesale_price")?.value;
                    const wsMOQ = data.product.metadata?.find((m: any) => m.key === "wholesale_moq")?.value;
                    if (wsEnabled === "true") setWholesaleEnabled(true);
                    if (wsPrice) {
                        // Metadata stored base unit price (per 25g), convert to per-kg display
                        const basePriceAmount = parseFloat(wsPrice);
                        if (productIsWeighted) {
                            const displayPrice = basePriceAmount * 40;
                            setWholesalePrice(displayPrice.toFixed(0));
                            setWholesalePriceUnit("kg");
                        } else {
                            setWholesalePrice(basePriceAmount.toFixed(0));
                        }
                    }
                    if (wsMOQ) setWholesaleMOQ(wsMOQ);
                }
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

    // Metadata update mutation for display unit
    const [updateMetadata] = useMutation(UPDATE_PRODUCT_METADATA);

    // Variant price update mutation
    const [updateVariantPrice] = useMutation(PRODUCT_VARIANT_CHANNEL_LISTING_UPDATE);

    // Wholesale variant price mutation (WholesaleVariantPrice model)
    const [setWholesaleVariantPrice] = useMutation(SET_WHOLESALE_VARIANT_PRICE);

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
        const inputQty = parseFloat(stockValue);
        if (isNaN(inputQty) || inputQty < 0) return;

        // Convert kg/g to base units for weighted products
        let quantity: number;
        if (isWeightedProduct) {
            if (editStockUnit === "kg") {
                quantity = Math.round(inputQty * 40); // 1kg = 40 units (25g each)
            } else {
                quantity = Math.round(inputQty / 25); // grams / 25g per unit
            }
        } else {
            quantity = Math.round(inputQty);
        }

        updateStock({
            variables: {
                variantId,
                warehouseId,
                quantity,
            },
        });
    };

    const handleAddStock = () => {
        if (!addingStockVariant || !newWarehouseId || !newStockQty) return;
        const inputQty = parseFloat(newStockQty);
        if (isNaN(inputQty) || inputQty < 0) return;

        // Convert to base units for weighted products
        let quantity: number;
        if (isWeightedProduct) {
            if (newStockUnit === "kg") {
                quantity = Math.round(inputQty * 40); // 1kg = 40 units
            } else {
                quantity = Math.round(inputQty / 25); // grams / 25
            }
        } else {
            quantity = Math.round(inputQty); // items directly
        }

        createStock({
            variables: {
                variantId: addingStockVariant,
                warehouseId: newWarehouseId,
                quantity: quantity,
            },
        });
    };

    // Save display unit to product metadata
    const handleSaveDisplayUnit = async () => {
        setSavingDisplayUnit(true);
        setError("");
        try {
            const result = await updateMetadata({
                variables: {
                    id: productId,
                    input: [{ key: "price_display_unit", value: selectedDisplayUnit }],
                },
            });
            if (result.data?.updateMetadata?.errors?.length > 0) {
                setError(result.data.updateMetadata.errors[0].message);
            } else {
                setSuccess("Display unit saved! Storefront will show prices per " + selectedDisplayUnit);
                setTimeout(() => setSuccess(""), 4000);
                refetch();
            }
        } catch (err: any) {
            setError(err.message || "Failed to save display unit");
        } finally {
            setSavingDisplayUnit(false);
        }
    };

    // Save MOQ settings to product metadata
    const handleSaveMOQ = async () => {
        setSavingMOQ(true);
        setError("");
        try {
            const metadataInput = [];

            // Convert weight values to grams before saving
            if (minOrderWeight) {
                const minWeightInGrams = minOrderWeightUnit === "kg"
                    ? parseFloat(minOrderWeight) * 1000
                    : parseFloat(minOrderWeight);
                metadataInput.push({ key: "min_order_weight", value: minWeightInGrams.toString() });
            }
            if (maxOrderWeight) {
                const maxWeightInGrams = maxOrderWeightUnit === "kg"
                    ? parseFloat(maxOrderWeight) * 1000
                    : parseFloat(maxOrderWeight);
                metadataInput.push({ key: "max_order_weight", value: maxWeightInGrams.toString() });
            }
            if (minOrderQuantity) metadataInput.push({ key: "min_order_quantity", value: minOrderQuantity });
            if (maxOrderQuantity) metadataInput.push({ key: "max_order_quantity", value: maxOrderQuantity });

            if (weightStep) {
                const stepInGrams = weightStepUnit === "kg"
                    ? parseFloat(weightStep) * 1000
                    : parseFloat(weightStep);
                metadataInput.push({ key: "weight_step", value: stepInGrams.toString() });
            }



            if (metadataInput.length === 0) {
                setError("Please enter at least one MOQ value");
                setSavingMOQ(false);
                return;
            }

            const result = await updateMetadata({
                variables: {
                    id: productId,
                    input: metadataInput,
                },
            });
            if (result.data?.updateMetadata?.errors?.length > 0) {
                setError(result.data.updateMetadata.errors[0].message);
            } else {
                setSuccess("Order limits saved successfully!");
                setTimeout(() => setSuccess(""), 4000);
                refetch();
            }
        } catch (err: any) {
            setError(err.message || "Failed to save order limits");
        } finally {
            setSavingMOQ(false);
        }
    };

    // Save wholesale settings to WholesaleVariantPrice model
    const handleSaveWholesale = async () => {
        setSavingWholesale(true);
        setError("");
        try {
            // Get channel ID from product data
            const channelId = product?.channelListings?.[0]?.channel?.id;
            if (!channelId) {
                setError("Channel not found");
                setSavingWholesale(false);
                return;
            }

            const variants = product?.variants || [];

            if (!wholesaleEnabled) {
                // Deactivate wholesale pricing for all variants
                for (const variant of variants) {
                    try {
                        await setWholesaleVariantPrice({
                            variables: {
                                input: {
                                    variantId: variant.id,
                                    channelId: channelId,
                                    priceAmount: "0.000",
                                    unit: "ITEM",
                                    active: false,
                                },
                            },
                        });
                    } catch (variantErr: any) {
                        console.warn(`Failed to deactivate wholesale price for variant ${variant.id}:`, variantErr.message);
                    }
                }

                setSuccess("Wholesale pricing disabled successfully!");
                setTimeout(() => setSuccess(""), 4000);
                refetch();
                setSavingWholesale(false);
                return;
            }

            // Validate wholesale price
            const wsPrice = parseFloat(wholesalePrice);
            if (isNaN(wsPrice) || wsPrice <= 0) {
                setError("Please enter a valid wholesale price");
                setSavingWholesale(false);
                return;
            }

            // Validate wholesale MOQ
            const wsMOQValue = parseFloat(wholesaleMOQ);
            if (isNaN(wsMOQValue) || wsMOQValue <= 0) {
                setError("Please enter a valid minimum order quantity");
                setSavingWholesale(false);
                return;
            }

            // For wholesale pricing: send the price as-is with the unit
            // The backend stores priceAmount per the specified unit (KG or ITEM)
            // Calculate wholesale price in BASE UNITS (per 25g)
            // User enters price in display unit (kg, 100g, etc.), we DIVIDE to convert to base unit
            // Example: Rs.100 per kg → Rs.100 / 40 = Rs.2.50 per 25g (base unit)
            let wholesalePriceInBaseUnits: number;

            if (isWeightedProduct) {
                // Multipliers: how many 25g units in each display unit
                const multipliers: Record<string, number> = {
                    "25g": 1,      // 25g = 1 × 25g (already base unit)
                    "100g": 4,     // 100g = 4 × 25g
                    "250g": 10,    // 250g = 10 × 25g
                    "500g": 20,    // 500g = 20 × 25g
                    "kg": 40,      // 1kg = 40 × 25g
                };
                const mult = multipliers[wholsalePriceUnit] || 40;
                wholesalePriceInBaseUnits = wsPrice / mult;  // DIVIDE to get base unit price
            } else {
                // For countable products: price per item directly
                wholesalePriceInBaseUnits = wsPrice;
            }

            const priceUnit = isWeightedProduct ? "KG" : "ITEM";

            // Update WholesaleVariantPrice for each variant
            for (const variant of variants) {
                try {
                    const result = await setWholesaleVariantPrice({
                        variables: {
                            input: {
                                variantId: variant.id,
                                channelId: channelId,
                                priceAmount: wholesalePriceInBaseUnits.toFixed(2),
                                unit: priceUnit,
                                active: true,
                            },
                        },
                    });
                    console.log(`[Wholesale] Set price for variant ${variant.id}:`, result);
                } catch (variantErr: any) {
                    console.error(`Failed to set wholesale price for variant ${variant.id}:`, variantErr.message);
                    // Continue with other variants even if one fails
                }
            }

            // Save MOQ to metadata (temporary - will move to model in future)
            await updateMetadata({
                variables: {
                    id: productId,
                    input: [
                        { key: "wholesale_moq", value: wsMOQValue.toString() }
                    ],
                },
            });

            setSuccess("Wholesale settings saved successfully!");
            setTimeout(() => setSuccess(""), 4000);
            refetch();
        } catch (err: any) {
            setError(err.message || "Failed to save wholesale settings");
        } finally {
            setSavingWholesale(false);
        }
    };

    // Save price - calculate variant price from display price
    const handleSavePrice = async () => {
        const displayPrice = parseFloat(displayPriceInput);
        if (isNaN(displayPrice) || displayPrice <= 0) {
            setError("Please enter a valid price");
            return;
        }

        // Calculate variant price based on product type
        let variantPrice: number;

        // Check if product is weighted - need to recompute here since we don't have access to isWeightedProduct
        const WEIGHTED_TYPES = ["Fresh Fruits", "Fresh Vegetables"];
        const isWeighted = WEIGHTED_TYPES.includes(product?.productType?.name || "");

        if (isWeighted) {
            // Weight-based: calculate per 25g from display price
            const multipliers: Record<string, number> = {
                "25g": 1,
                "100g": 4,
                "250g": 10,
                "500g": 20,
                "kg": 40,
            };
            const mult = multipliers[priceInputUnit] || 40;
            variantPrice = displayPrice / mult;
        } else {
            // Non-weighted (Packaged Items): use direct price
            variantPrice = displayPrice;
        }

        // Get the first variant and channel
        const variant = product?.variants?.[0];
        const channelId = product?.channelListings?.[0]?.channel?.id;

        if (!variant || !channelId) {
            setError("No variant or channel found");
            return;
        }

        setSavingPrice(true);
        setError("");
        try {
            const result = await updateVariantPrice({
                variables: {
                    id: variant.id,
                    input: [{
                        channelId: channelId,
                        price: variantPrice.toFixed(2),
                    }],
                },
            });
            if (result.data?.productVariantChannelListingUpdate?.errors?.length > 0) {
                setError(result.data.productVariantChannelListingUpdate.errors[0].message);
            } else {
                setSuccess(`Price updated! Variant price is now Rs.${variantPrice.toFixed(2)}/25g (= Rs.${displayPrice.toFixed(0)}/${priceInputUnit})`);
                setTimeout(() => setSuccess(""), 5000);
                refetch();
            }
        } catch (err: any) {
            setError(err.message || "Failed to update price");
        } finally {
            setSavingPrice(false);
        }
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

    // Weighted product types - these get weight-based pricing
    const isWeightedProduct = product.productType?.measurementType === "WEIGHTED";

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
                        Stock ({isWeightedProduct ? `${(getTotalStock() / 40).toFixed(2).replace(/\.?0+$/, "")}kg` : getTotalStock()})
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
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Information */}
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

                        {/* Pricing & Order Limits Grid */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Pricing Section */}
                            <div className="card p-6">
                                <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--secondary-900)' }}>
                                    <DollarSign className="w-5 h-5" style={{ color: 'var(--secondary-500)' }} />
                                    Pricing
                                </h2>

                                {isWeightedProduct ? (
                                    /* Weight-based pricing for Fresh Fruits, Fresh Vegetables */
                                    <>
                                        {pricing ? (
                                            <div className="mb-4">
                                                {(() => {
                                                    const displayMultipliers: Record<string, number> = { "25g": 1, "100g": 4, "250g": 10, "500g": 20, "kg": 40 };
                                                    const mult = displayMultipliers[selectedDisplayUnit] || 40;
                                                    const displayAmount = pricing.amount * mult;
                                                    const displayLabel = selectedDisplayUnit === "kg" ? "1kg" : selectedDisplayUnit;
                                                    return (
                                                        <>
                                                            <p className="text-3xl font-bold" style={{ color: 'var(--primary-600)' }}>
                                                                Rs. {displayAmount.toFixed(2)}
                                                            </p>
                                                            <p className="text-sm mt-1" style={{ color: 'var(--secondary-500)' }}>
                                                                per {displayLabel}
                                                            </p>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <p className="mb-4" style={{ color: 'var(--secondary-500)' }}>No price set</p>
                                        )}

                                        {/* Display Unit Selector */}
                                        <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--primary-50)', border: '1px solid var(--primary-100)' }}>
                                            <p className="text-sm font-medium mb-2" style={{ color: 'var(--primary-700)' }}>
                                                📊 Storefront Display Unit
                                            </p>
                                            <p className="text-xs mb-3" style={{ color: 'var(--secondary-500)' }}>
                                                Select which weight to show on the storefront:
                                            </p>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {[
                                                    { value: "25g", label: "25g", mult: 1 },
                                                    { value: "100g", label: "100g", mult: 4 },
                                                    { value: "250g", label: "250g", mult: 10 },
                                                    { value: "500g", label: "500g", mult: 20 },
                                                    { value: "kg", label: "1kg", mult: 40 },
                                                ].map((unit) => (
                                                    <button
                                                        key={unit.value}
                                                        type="button"
                                                        onClick={() => setSelectedDisplayUnit(unit.value)}
                                                        className="px-3 py-1.5 text-sm rounded border transition-all font-medium"
                                                        style={{
                                                            backgroundColor: selectedDisplayUnit === unit.value ? 'var(--primary-500)' : 'white',
                                                            borderColor: selectedDisplayUnit === unit.value ? 'var(--primary-500)' : 'var(--secondary-300)',
                                                            color: selectedDisplayUnit === unit.value ? 'white' : 'var(--secondary-700)',
                                                        }}
                                                    >
                                                        {unit.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleSaveDisplayUnit}
                                                disabled={savingDisplayUnit}
                                                className="w-full py-2 text-sm font-medium rounded bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {savingDisplayUnit ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Save className="w-4 h-4" />
                                                )}
                                                Save Display Unit
                                            </button>
                                        </div>

                                        {/* Price Editor */}
                                        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--secondary-50)', border: '1px solid var(--secondary-200)' }}>
                                            <p className="text-sm font-medium mb-2" style={{ color: 'var(--secondary-700)' }}>
                                                💰 Edit Price
                                            </p>
                                            <p className="text-xs mb-3" style={{ color: 'var(--secondary-500)' }}>
                                                Enter price for your preferred weight:
                                            </p>
                                            <div className="flex gap-2 mb-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="Enter price"
                                                    value={displayPriceInput}
                                                    onChange={(e) => setDisplayPriceInput(e.target.value)}
                                                    className="flex-1 min-w-0 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
                                                    style={{ borderColor: 'var(--secondary-300)' }}
                                                />
                                                <select
                                                    value={priceInputUnit}
                                                    onChange={(e) => setPriceInputUnit(e.target.value)}
                                                    className="px-2 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-orange-400 w-[90px] flex-shrink-0"
                                                    style={{ borderColor: 'var(--secondary-300)' }}
                                                >
                                                    <option value="25g">per 25g</option>
                                                    <option value="100g">per 100g</option>
                                                    <option value="250g">per 250g</option>
                                                    <option value="500g">per 500g</option>
                                                    <option value="kg">per 1kg</option>
                                                </select>
                                            </div>
                                            {displayPriceInput && (
                                                <p className="text-xs mb-3" style={{ color: 'var(--secondary-600)' }}>
                                                    = Rs.{(parseFloat(displayPriceInput) / (priceInputUnit === "25g" ? 1 : priceInputUnit === "100g" ? 4 : priceInputUnit === "250g" ? 10 : priceInputUnit === "500g" ? 20 : 40)).toFixed(2)} per 25g (variant price)
                                                </p>
                                            )}
                                            <button
                                                type="button"
                                                onClick={handleSavePrice}
                                                disabled={savingPrice || !displayPriceInput}
                                                className="w-full py-2 text-sm font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {savingPrice ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <DollarSign className="w-4 h-4" />
                                                )}
                                                Save Price
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    /* Simple item pricing for Packaged Items */
                                    <>
                                        {pricing ? (
                                            <div className="mb-4">
                                                <p className="text-3xl font-bold" style={{ color: 'var(--primary-600)' }}>
                                                    Rs. {pricing.amount.toFixed(2)}
                                                </p>
                                                <p className="text-sm mt-1" style={{ color: 'var(--secondary-500)' }}>
                                                    per item
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="mb-4" style={{ color: 'var(--secondary-500)' }}>No price set</p>
                                        )}
                                        {/* Simple Price Editor */}
                                        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--secondary-50)', border: '1px solid var(--secondary-200)' }}>
                                            <p className="text-sm font-medium mb-2" style={{ color: 'var(--secondary-700)' }}>
                                                💰 Edit Price
                                            </p>
                                            <p className="text-xs mb-3" style={{ color: 'var(--secondary-500)' }}>
                                                Enter price per item:
                                            </p>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="Enter price per item"
                                                value={displayPriceInput}
                                                onChange={(e) => setDisplayPriceInput(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-orange-400 mb-3"
                                                style={{ borderColor: 'var(--secondary-300)' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleSavePrice}
                                                disabled={savingPrice || !displayPriceInput}
                                                className="w-full py-2 text-sm font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {savingPrice ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <DollarSign className="w-4 h-4" />
                                                )}
                                                Save Price
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Order Limits Section */}
                            <div className="card p-6">
                                <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--secondary-900)' }}>
                                    <AlertTriangle className="w-5 h-5" style={{ color: 'var(--secondary-500)' }} />
                                    Order Limits
                                </h2>
                                <p className="text-sm mb-4" style={{ color: 'var(--secondary-500)' }}>
                                    Set minimum and maximum order quantities for this product.
                                </p>

                                {isWeightedProduct ? (
                                    /* Weight-based limits for weighted products */
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--secondary-700)' }}>
                                                Min Order Weight
                                            </label>
                                            <div className="flex gap-2 items-center">
                                                <div className="flex-1 relative">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        placeholder="e.g. 500"
                                                        value={minOrderWeight}
                                                        onChange={(e) => setMinOrderWeight(e.target.value)}
                                                        className="w-full px-3 py-2 pr-10 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                        style={{ borderColor: 'var(--secondary-300)' }}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: 'var(--secondary-400)' }}>{minOrderWeightUnit}</span>
                                                </div>
                                                <select
                                                    value={minOrderWeightUnit}
                                                    onChange={(e) => {
                                                        const newUnit = e.target.value;
                                                        const oldUnit = minOrderWeightUnit;
                                                        if (minOrderWeight && newUnit !== oldUnit) {
                                                            const val = parseFloat(minOrderWeight);
                                                            if (!isNaN(val)) {
                                                                setMinOrderWeight(newUnit === "kg" ? (val / 1000).toString() : (val * 1000).toString());
                                                            }
                                                        }
                                                        setMinOrderWeightUnit(newUnit);
                                                    }}
                                                    className="px-2 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 w-[60px] flex-shrink-0"
                                                    style={{ borderColor: 'var(--secondary-300)' }}
                                                >
                                                    <option value="g">g</option>
                                                    <option value="kg">kg</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--secondary-700)' }}>
                                                Max Order Weight
                                            </label>
                                            <div className="flex gap-2 items-center">
                                                <div className="flex-1 relative">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        placeholder="e.g. 5"
                                                        value={maxOrderWeight}
                                                        onChange={(e) => setMaxOrderWeight(e.target.value)}
                                                        className="w-full px-3 py-2 pr-10 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                        style={{ borderColor: 'var(--secondary-300)' }}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: 'var(--secondary-400)' }}>{maxOrderWeightUnit}</span>
                                                </div>
                                                <select
                                                    value={maxOrderWeightUnit}
                                                    onChange={(e) => {
                                                        const newUnit = e.target.value;
                                                        const oldUnit = maxOrderWeightUnit;
                                                        if (maxOrderWeight && newUnit !== oldUnit) {
                                                            const val = parseFloat(maxOrderWeight);
                                                            if (!isNaN(val)) {
                                                                setMaxOrderWeight(newUnit === "kg" ? (val / 1000).toString() : (val * 1000).toString());
                                                            }
                                                        }
                                                        setMaxOrderWeightUnit(newUnit);
                                                    }}
                                                    className="px-2 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 w-[60px] flex-shrink-0"
                                                    style={{ borderColor: 'var(--secondary-300)' }}
                                                >
                                                    <option value="g">g</option>
                                                    <option value="kg">kg</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--secondary-700)' }}>
                                                Weight Step (+/-)
                                            </label>
                                            <div className="flex gap-2 items-center">
                                                <div className="flex-1 relative">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        placeholder="e.g. 250"
                                                        value={weightStep}
                                                        onChange={(e) => setWeightStep(e.target.value)}
                                                        className="w-full px-3 py-2 pr-10 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                        style={{ borderColor: 'var(--secondary-300)' }}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: 'var(--secondary-400)' }}>{weightStepUnit}</span>
                                                </div>
                                                <select
                                                    value={weightStepUnit}
                                                    onChange={(e) => {
                                                        const newUnit = e.target.value;
                                                        const oldUnit = weightStepUnit;
                                                        if (weightStep && newUnit !== oldUnit) {
                                                            const val = parseFloat(weightStep);
                                                            if (!isNaN(val)) {
                                                                setWeightStep(newUnit === "kg" ? (val / 1000).toString() : (val * 1000).toString());
                                                            }
                                                        }
                                                        setWeightStepUnit(newUnit);
                                                    }}
                                                    className="px-2 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 w-[60px] flex-shrink-0"
                                                    style={{ borderColor: 'var(--secondary-300)' }}
                                                >
                                                    <option value="g">g</option>
                                                    <option value="kg">kg</option>
                                                </select>
                                            </div>
                                            <p className="text-xs mt-1" style={{ color: 'var(--secondary-500)' }}>
                                                Storefront increment value (e.g. 250g).
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    /* Quantity-based limits for packaged items */
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--secondary-700)' }}>
                                                Min Order Quantity
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="e.g. 1"
                                                value={minOrderQuantity}
                                                onChange={(e) => setMinOrderQuantity(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                style={{ borderColor: 'var(--secondary-300)' }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--secondary-700)' }}>
                                                Max Order Quantity
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="e.g. 99"
                                                value={maxOrderQuantity}
                                                onChange={(e) => setMaxOrderQuantity(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                style={{ borderColor: 'var(--secondary-300)' }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleSaveMOQ}
                                    disabled={savingMOQ}
                                    className="w-full mt-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {savingMOQ ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    Save Order Limits
                                </button>
                            </div>

                            {/* Wholesale Settings Section */}
                            <div className="card p-6">
                                <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--secondary-900)' }}>
                                    <DollarSign className="w-5 h-5" style={{ color: 'var(--secondary-500)' }} />
                                    Wholesale Pricing
                                </h2>

                                {/* Enable Wholesale Toggle */}
                                <div className="flex items-center gap-3 p-4 rounded-lg mb-4" style={{ backgroundColor: 'var(--secondary-50)' }}>
                                    <input
                                        type="checkbox"
                                        id="wholesale-enabled"
                                        checked={wholesaleEnabled}
                                        onChange={(e) => setWholesaleEnabled(e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                    />
                                    <label htmlFor="wholesale-enabled" className="text-sm font-medium cursor-pointer" style={{ color: 'var(--secondary-700)' }}>
                                        Enable wholesale pricing for this product
                                    </label>
                                </div>

                                {wholesaleEnabled && (
                                    <div className="space-y-4">
                                        {/* Wholesale Price */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--secondary-700)' }}>
                                                Wholesale Price
                                            </label>
                                            {isWeightedProduct ? (
                                                <>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            placeholder="Enter wholesale price"
                                                            value={wholesalePrice}
                                                            onChange={(e) => setWholesalePrice(e.target.value)}
                                                            className="flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-green-400"
                                                            style={{ borderColor: 'var(--secondary-300)' }}
                                                        />
                                                        <select
                                                            value={wholsalePriceUnit}
                                                            onChange={(e) => setWholesalePriceUnit(e.target.value)}
                                                            className="px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-green-400 min-w-[100px]"
                                                            style={{ borderColor: 'var(--secondary-300)' }}
                                                        >
                                                            <option value="25g">per 25g</option>
                                                            <option value="100g">per 100g</option>
                                                            <option value="250g">per 250g</option>
                                                            <option value="500g">per 500g</option>
                                                            <option value="kg">per 1kg</option>
                                                        </select>
                                                    </div>
                                                    {wholesalePrice && (
                                                        <p className="text-xs mt-1" style={{ color: 'var(--secondary-600)' }}>
                                                            = Rs.{(parseFloat(wholesalePrice) / (wholsalePriceUnit === "25g" ? 1 : wholsalePriceUnit === "100g" ? 4 : wholsalePriceUnit === "250g" ? 10 : wholsalePriceUnit === "500g" ? 20 : 40)).toFixed(2)} per 25g (base unit)
                                                        </p>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="Enter wholesale price per item"
                                                        value={wholesalePrice}
                                                        onChange={(e) => setWholesalePrice(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-green-400"
                                                        style={{ borderColor: 'var(--secondary-300)' }}
                                                    />
                                                    <p className="text-xs mt-1" style={{ color: 'var(--secondary-500)' }}>
                                                        Price per item for wholesale customers
                                                    </p>
                                                </>
                                            )}
                                        </div>

                                        {/* Wholesale MOQ */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--secondary-700)' }}>
                                                Minimum Order Quantity (MOQ)
                                            </label>
                                            {isWeightedProduct ? (
                                                <>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            placeholder="e.g. 1"
                                                            value={wholesaleMOQ}
                                                            onChange={(e) => setWholesaleMOQ(e.target.value)}
                                                            className="flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-green-400"
                                                            style={{ borderColor: 'var(--secondary-300)' }}
                                                        />
                                                        <span className="px-3 py-2 text-sm bg-gray-100 rounded min-w-[70px] flex items-center justify-center" style={{ color: 'var(--secondary-700)' }}>
                                                            kg
                                                        </span>
                                                    </div>
                                                    <p className="text-xs mt-1" style={{ color: 'var(--secondary-500)' }}>
                                                        Minimum weight required for wholesale price
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            step="1"
                                                            placeholder="e.g. 10"
                                                            value={wholesaleMOQ}
                                                            onChange={(e) => setWholesaleMOQ(e.target.value)}
                                                            className="flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-green-400"
                                                            style={{ borderColor: 'var(--secondary-300)' }}
                                                        />
                                                        <span className="px-3 py-2 text-sm bg-gray-100 rounded min-w-[70px] flex items-center justify-center" style={{ color: 'var(--secondary-700)' }}>
                                                            items
                                                        </span>
                                                    </div>
                                                    <p className="text-xs mt-1" style={{ color: 'var(--secondary-500)' }}>
                                                        Minimum number of items required for wholesale price
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleSaveWholesale}
                                    disabled={savingWholesale}
                                    className="w-full mt-4 py-2 text-sm font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {savingWholesale ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    Save Wholesale Settings
                                </button>
                            </div>
                        </div>
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
                                    <span style={{ color: 'var(--secondary-900)' }}>
                                        {isWeightedProduct ? `${(getTotalStock() / 40).toFixed(2).replace(/\.?0+$/, "")}kg` : getTotalStock()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--secondary-500)' }}>Slug</span>
                                    <span className="truncate max-w-[150px]" style={{ color: 'var(--secondary-900)' }}>{product.slug}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Stock Tab */}
            {
                activeTab === "stock" && (
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
                                                {totalStock > 0
                                                    ? isWeightedProduct
                                                        ? `${(totalStock / 40).toFixed(2).replace(/\.?0+$/, "")}kg in stock`
                                                        : `${totalStock} in stock`
                                                    : 'Out of Stock'
                                                }
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
                                                        {isWeightedProduct ? "Amount" : "Quantity"}
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="number"
                                                            value={newStockQty}
                                                            onChange={(e) => setNewStockQty(e.target.value)}
                                                            className="input-field w-24 text-center"
                                                            min="0"
                                                            step={isWeightedProduct ? "0.1" : "1"}
                                                            placeholder={isWeightedProduct ? "0.0" : "0"}
                                                        />
                                                        {isWeightedProduct && (
                                                            <select
                                                                value={newStockUnit}
                                                                onChange={(e) => setNewStockUnit(e.target.value)}
                                                                className="select-field w-20"
                                                            >
                                                                <option value="kg">kg</option>
                                                                <option value="g">g</option>
                                                            </select>
                                                        )}
                                                    </div>
                                                    {isWeightedProduct && newStockQty && (
                                                        <p className="text-xs mt-1" style={{ color: 'var(--secondary-500)' }}>
                                                            = {newStockUnit === "kg"
                                                                ? Math.round(parseFloat(newStockQty) * 40)
                                                                : Math.round(parseFloat(newStockQty) / 25)
                                                            } base units
                                                        </p>
                                                    )}
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
                                                    onClick={() => { setAddingStockVariant(null); setNewWarehouseId(""); setNewStockQty(""); setNewStockUnit("kg"); }}
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
                                                        <th>{isWeightedProduct ? "Amount" : "Quantity"}</th>
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

                                                        // Format quantity for display
                                                        const formatStock = (qty: number) => {
                                                            if (isWeightedProduct) {
                                                                const kg = qty / 40;
                                                                return kg >= 1 ? `${kg.toFixed(2).replace(/\.?0+$/, "")}kg` : `${(qty * 25)}g`;
                                                            }
                                                            return qty.toString();
                                                        };

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
                                                                        <div className="flex items-center gap-2">
                                                                            <input
                                                                                type="number"
                                                                                step={isWeightedProduct ? "0.1" : "1"}
                                                                                value={stockValue}
                                                                                onChange={(e) => setStockValue(e.target.value)}
                                                                                className="input-field w-20 text-center py-1"
                                                                                min="0"
                                                                                autoFocus
                                                                            />
                                                                            {isWeightedProduct && (
                                                                                <select
                                                                                    value={editStockUnit}
                                                                                    onChange={(e) => setEditStockUnit(e.target.value as "kg" | "g")}
                                                                                    className="select-field py-1 px-2"
                                                                                >
                                                                                    <option value="kg">kg</option>
                                                                                    <option value="g">g</option>
                                                                                </select>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className={`font-semibold ${stock.quantity < 10 ? 'text-yellow-600' : ''}`} style={{ color: stock.quantity >= 10 ? 'var(--secondary-900)' : undefined }}>
                                                                            {formatStock(stock.quantity)}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td style={{ color: 'var(--secondary-500)' }}>
                                                                    {formatStock(stock.quantityAllocated || 0)}
                                                                </td>
                                                                <td>
                                                                    <span className={`font-medium ${available === 0 ? 'text-red-600' : available < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                                                                        {formatStock(available)}
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
                                                                                onClick={() => { setEditingStock(null); setStockValue(""); setEditStockUnit("kg"); }}
                                                                                className="btn-secondary text-sm py-1.5 px-3"
                                                                            >
                                                                                <X className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingStock(key);
                                                                                if (isWeightedProduct) {
                                                                                    // Convert base units to kg for editing
                                                                                    const kgValue = stock.quantity / 40;
                                                                                    setStockValue(kgValue.toFixed(2).replace(/\.?0+$/, ""));
                                                                                    setEditStockUnit("kg");
                                                                                } else {
                                                                                    setStockValue(stock.quantity.toString());
                                                                                }
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
                )
            }

            {/* SEO Tab */}
            {
                activeTab === "seo" && (
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
                )
            }

            {/* All Warehouses Quick View (only on Stock tab) */}
            {
                activeTab === "stock" && warehouses.length > 0 && (
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
                )
            }
        </MainLayout >
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
