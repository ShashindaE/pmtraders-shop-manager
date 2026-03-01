"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Force-clear any stale auth state when login page loads
    // This breaks the login loop: even if old tokens caused a redirect here,
    // we ensure a clean slate so the next login attempt works cleanly
    useEffect(() => {
        localStorage.removeItem("saleor_token");
        localStorage.removeItem("saleor_refresh_token");
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        const result = await login(email, password);

        if (!result.success) {
            setError(result.error || "Login failed");
            setIsLoading(false);
        }
        // If success, the page will redirect via window.location.href
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600), var(--primary-700))' }}
        >
            <div className="w-full max-w-md">
                {/* Logo Card */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-2xl mb-4">
                        <span
                            className="text-4xl font-bold"
                            style={{
                                background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                color: 'transparent'
                            }}
                        >
                            PM
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">PMTraders</h1>
                    <p className="mt-2" style={{ color: 'var(--primary-100)' }}>Shop Manager Dashboard</p>
                </div>

                {/* Login Card */}
                <div className="card p-8">
                    <h2
                        className="text-xl font-semibold mb-6 text-center"
                        style={{ color: 'var(--secondary-900)' }}
                    >
                        Sign in to your account
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label
                                className="block text-sm font-medium mb-1.5"
                                style={{ color: 'var(--secondary-700)' }}
                            >
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                placeholder="admin@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label
                                className="block text-sm font-medium mb-1.5"
                                style={{ color: 'var(--secondary-700)' }}
                            >
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>

                    <p
                        className="text-center text-sm mt-6"
                        style={{ color: 'var(--secondary-500)' }}
                    >
                        Staff account required for access
                    </p>
                </div>
            </div>
        </div>
    );
}
