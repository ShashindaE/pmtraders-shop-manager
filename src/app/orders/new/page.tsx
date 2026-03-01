"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/Sidebar";
import { useQuery, useMutation } from "@apollo/client";
import { PRODUCTS_LIST } from "@/lib/graphql";
import { gql } from "graphql-tag";
import Link from "next/link";
import {
    ArrowLeft,
    Search,
    Plus,
    Minus,
    Trash2,
    ShoppingCart,
    Package,
    Loader2,
    User,
    Phone,
    MapPin,
    CreditCard,
} from "lucide-react";

// We'll create a simple draft order
const CREATE_DRAFT_ORDER = gql`
  mutation DraftOrderCreate($input: DraftOrderCreateInput!) {
    draftOrderCreate(input: $input) {
      order {
        id
        number
      }
      errors {
        field
        message
      }
    }
  }
`;

interface CartItem {
    variantId: string;
    productName: string;
    variantName: string;
    price: number;
    quantity: number;
    thumbnail?: string;
}

export default function CreateOrderPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [error, setError] = useState("");
    const [step, setStep] = useState<'products' | 'customer'>('products');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    const { data, loading } = useQuery(PRODUCTS_LIST, {
        variables: {
            first: 50,
            search: searchQuery || undefined,
            channel: "lk",
        },
        skip: !isAuthenticated,
    });

    const [createOrder, { loading: creating }] = useMutation(CREATE_DRAFT_ORDER, {
        onCompleted: (data) => {
            if (data?.draftOrderCreate?.errors?.length > 0) {
                setError(data.draftOrderCreate.errors[0].message);
            } else if (data?.draftOrderCreate?.order) {
                router.push(`/orders/${encodeURIComponent(data.draftOrderCreate.order.id)}`);
            }
        },
        onError: (err) => setError(err.message),
    });

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary-50">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    const products = data?.products?.edges || [];

    const addToCart = (product: any, variant: any) => {
        const price = variant.pricing?.price?.gross?.amount ||
            product.pricing?.priceRange?.start?.gross?.amount || 0;

        setCart((prev) => {
            const existing = prev.find((item) => item.variantId === variant.id);
            if (existing) {
                return prev.map((item) =>
                    item.variantId === variant.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [
                ...prev,
                {
                    variantId: variant.id,
                    productName: product.name,
                    variantName: variant.name || "Default",
                    price,
                    quantity: 1,
                    thumbnail: product.thumbnail?.url,
                },
            ];
        });
    };

    const updateQuantity = (variantId: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) =>
                    item.variantId === variantId
                        ? { ...item, quantity: Math.max(0, item.quantity + delta) }
                        : item
                )
                .filter((item) => item.quantity > 0)
        );
    };

    const removeFromCart = (variantId: string) => {
        setCart((prev) => prev.filter((item) => item.variantId !== variantId));
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleCreateOrder = async () => {
        if (cart.length === 0) {
            setError("Add at least one product to the cart");
            return;
        }

        setError("");

        const lines = cart.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
        }));

        const input: any = {
            lines,
            channelId: "Q2hhbm5lbDox", // default-channel (you may need to adjust)
        };

        // Add customer info if provided
        if (customerEmail) {
            input.userEmail = customerEmail;
        }

        if (address && city) {
            input.shippingAddress = {
                firstName: customerName.split(" ")[0] || "Customer",
                lastName: customerName.split(" ").slice(1).join(" ") || "",
                streetAddress1: address,
                city: city,
                country: "LK",
                phone: customerPhone || undefined,
            };
            input.billingAddress = input.shippingAddress;
        }

        await createOrder({ variables: { input } });
    };

    return (
        <MainLayout>
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/orders"
                    className="inline-flex items-center gap-2 text-secondary-600 hover:text-secondary-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Orders
                </Link>

                <h1 className="text-2xl font-bold text-secondary-900">Create Order</h1>
                <p className="text-secondary-500 mt-1">
                    Add products and customer details to create a new order
                </p>
            </div>

            {/* Step Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setStep('products')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${step === 'products'
                        ? 'bg-primary-500 text-white'
                        : 'bg-white text-secondary-600 border border-secondary-200'
                        }`}
                >
                    1. Select Products
                </button>
                <button
                    onClick={() => setStep('customer')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${step === 'customer'
                        ? 'bg-primary-500 text-white'
                        : 'bg-white text-secondary-600 border border-secondary-200'
                        }`}
                >
                    2. Customer Details
                </button>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">
                    {error}
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2">
                    {step === 'products' ? (
                        <div className="space-y-6">
                            {/* Search */}
                            <div className="card p-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                                    <input
                                        type="text"
                                        placeholder="Search products..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="input-field pl-10"
                                    />
                                </div>
                            </div>

                            {/* Products Grid */}
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                                </div>
                            ) : products.length === 0 ? (
                                <div className="card p-12 text-center">
                                    <Package className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-secondary-700">No products found</h3>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {products.map((edge: any) => {
                                        const product = edge.node;
                                        const price = product.pricing?.priceRange?.start?.gross;
                                        const variants = product.variants || [{ id: product.id, name: "Default" }];

                                        return (
                                            <div key={product.id} className="card hover:shadow-md transition-shadow">
                                                <div className="aspect-square bg-secondary-100 relative">
                                                    {product.thumbnail?.url ? (
                                                        <img
                                                            src={product.thumbnail.url}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Package className="w-10 h-10 text-secondary-300" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-3">
                                                    <h3 className="font-medium text-secondary-900 text-sm truncate">
                                                        {product.name}
                                                    </h3>
                                                    <p className="text-primary-600 font-semibold mt-1">
                                                        {price ? `Rs. ${price.amount.toFixed(0)}` : "-"}
                                                    </p>
                                                    <button
                                                        onClick={() => addToCart(product, variants[0])}
                                                        className="btn-primary w-full mt-2 text-sm py-1.5 flex items-center justify-center gap-1"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="card p-6">
                            <h2 className="font-semibold text-secondary-900 mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-secondary-500" />
                                Customer Information
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                                        Customer Name
                                    </label>
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="input-field"
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                                        Email (optional)
                                    </label>
                                    <input
                                        type="email"
                                        value={customerEmail}
                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                        className="input-field"
                                        placeholder="customer@example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1.5 flex items-center gap-1">
                                        <Phone className="w-4 h-4" />
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="input-field"
                                        placeholder="+94 77 123 4567"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1.5 flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        Delivery Address
                                    </label>
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="input-field"
                                        placeholder="123 Main Street"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                                        City
                                    </label>
                                    <input
                                        type="text"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        className="input-field"
                                        placeholder="Colombo"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Cart Sidebar */}
                <div className="space-y-4">
                    <div className="card p-6">
                        <h2 className="font-semibold text-secondary-900 mb-4 flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-secondary-500" />
                            Cart ({cartItemsCount} items)
                        </h2>

                        {cart.length === 0 ? (
                            <p className="text-secondary-500 text-center py-6">
                                No items in cart
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {cart.map((item) => (
                                    <div key={item.variantId} className="flex items-center gap-3">
                                        {item.thumbnail ? (
                                            <img
                                                src={item.thumbnail}
                                                alt=""
                                                className="w-12 h-12 object-cover rounded-lg"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center">
                                                <Package className="w-5 h-5 text-secondary-400" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-secondary-900 text-sm truncate">
                                                {item.productName}
                                            </p>
                                            <p className="text-sm text-secondary-500">
                                                Rs. {item.price.toFixed(0)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateQuantity(item.variantId, -1)}
                                                className="p-1 rounded bg-secondary-100 hover:bg-secondary-200"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.variantId, 1)}
                                                className="p-1 rounded bg-secondary-100 hover:bg-secondary-200"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => removeFromCart(item.variantId)}
                                                className="p-1 rounded text-red-500 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Total & Action */}
                    <div className="card p-6">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-secondary-600">Subtotal</span>
                            <span className="text-xl font-bold text-secondary-900">
                                Rs. {cartTotal.toFixed(0)}
                            </span>
                        </div>

                        {step === 'products' ? (
                            <button
                                onClick={() => setStep('customer')}
                                disabled={cart.length === 0}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                Continue
                                <ArrowLeft className="w-4 h-4 rotate-180" />
                            </button>
                        ) : (
                            <button
                                onClick={handleCreateOrder}
                                disabled={creating || cart.length === 0}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {creating ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <CreditCard className="w-5 h-5" />
                                        Create Order
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
