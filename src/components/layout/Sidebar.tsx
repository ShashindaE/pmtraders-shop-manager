"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Warehouse,
    Truck,
    Users,
    LogOut,
    Menu,
    X,
    Building2,
} from "lucide-react";
import { useState } from "react";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Orders", href: "/orders", icon: ShoppingCart },
    { name: "Products", href: "/products", icon: Package },
    { name: "Stock", href: "/stock", icon: Warehouse },
    { name: "Delivery", href: "/delivery", icon: Truck },

    { name: "Drivers", href: "/drivers", icon: Users },
    { name: "Wholesale", href: "/wholesale", icon: Building2 },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isActive = (href: string) => {
        if (href === "/") {
            return pathname === "/";
        }
        return pathname.startsWith(href);
    };

    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className="p-6" style={{ borderBottom: '1px solid var(--secondary-100)' }}>
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                        style={{ background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))' }}
                    >
                        <span className="text-white font-bold text-lg">PM</span>
                    </div>
                    <div>
                        <h1 className="font-bold" style={{ color: 'var(--secondary-900)' }}>PMTraders</h1>
                        <p className="text-xs" style={{ color: 'var(--secondary-500)' }}>Shop Manager</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {navigation.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`nav-item ${active ? "active" : ""}`}
                        >
                            <Icon className="w-5 h-5" />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User & Logout */}
            <div className="p-4" style={{ borderTop: '1px solid var(--secondary-100)' }}>
                <div className="flex items-center gap-3 px-4 py-2 text-sm mb-2" style={{ color: 'var(--secondary-600)' }}>
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--primary-100)' }}
                    >
                        <span className="font-medium" style={{ color: 'var(--primary-600)' }}>
                            {user?.firstName?.[0] || user?.email?.[0] || "U"}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ color: 'var(--secondary-900)' }}>
                            {user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user?.email}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--secondary-500)' }}>{user?.email}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="nav-item w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile menu button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
            >
                <Menu className="w-6 h-6" style={{ color: 'var(--secondary-700)' }} />
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/50"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile sidebar */}
            <aside
                className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <button
                    onClick={() => setMobileOpen(false)}
                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100"
                >
                    <X className="w-5 h-5" style={{ color: 'var(--secondary-500)' }} />
                </button>
                <div className="h-full flex flex-col">
                    <SidebarContent />
                </div>
            </aside>

            {/* Desktop sidebar */}
            <aside
                className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-white"
                style={{ borderRight: '1px solid var(--secondary-100)' }}
            >
                <SidebarContent />
            </aside>
        </>
    );
}

import { NotificationBell } from "@/components/NotificationBell";

export function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--secondary-50)' }}>
            <Sidebar />
            <main className="lg:pl-72">
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 h-16 flex items-center justify-end">
                    <NotificationBell />
                </header>
                <div className="p-4 lg:p-8">{children}</div>
            </main>
        </div>
    );
}
