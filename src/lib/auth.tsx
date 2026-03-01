"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useMutation, gql, useQuery } from "@apollo/client";

const TOKEN_CREATE = gql`
  mutation TokenCreate($email: String!, $password: String!) {
    tokenCreate(email: $email, password: $password) {
      token
      refreshToken
      user {
        id
        email
        firstName
        lastName
        isStaff
      }
      errors {
        field
        message
      }
    }
  }
`;

const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      firstName
      lastName
      isStaff
    }
  }
`;

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isStaff: boolean;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasToken, setHasToken] = useState(false);

    const [tokenCreate] = useMutation(TOKEN_CREATE);

    // Check localStorage on mount
    useEffect(() => {
        const token = localStorage.getItem("saleor_token");
        setHasToken(!!token);
        if (!token) {
            setIsLoading(false);
        }
    }, []);

    // Query user data if token exists
    const { data: meData, loading: meLoading } = useQuery(ME_QUERY, {
        skip: !hasToken,
        fetchPolicy: "network-only",
        onCompleted: (data) => {
            if (data?.me && data.me.isStaff) {
                setUser(data.me);
            } else {
                // Not staff or no user - clear tokens
                localStorage.removeItem("saleor_token");
                localStorage.removeItem("saleor_refresh_token");
                setHasToken(false);
            }
            setIsLoading(false);
        },
        onError: (error) => {
            // Don't aggressively clear tokens here — the errorLink in apollo-client.tsx
            // handles token refresh. Only clear state so the UI doesn't show stale user.
            console.warn("[AUTH] ME_QUERY error:", error.message);
            setUser(null);
            setIsLoading(false);
            // errorLink will handle token refresh or logout redirect
        },
    });

    // Also update user from query when data changes
    useEffect(() => {
        if (meData?.me && meData.me.isStaff && !user) {
            setUser(meData.me);
        }
    }, [meData, user]);

    // Update loading state based on meLoading
    useEffect(() => {
        if (hasToken && !meLoading) {
            setIsLoading(false);
        }
    }, [hasToken, meLoading]);

    const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            console.log("[AUTH] Starting login for:", email);

            // CRITICAL: Always clear out any stuck tokens before attempting a new login
            // This prevents zombie auth states where the cache thinks we are logged in.
            localStorage.removeItem("saleor_token");
            localStorage.removeItem("saleor_refresh_token");
            setHasToken(false);
            setUser(null);

            const { data } = await tokenCreate({
                variables: { email, password },
                fetchPolicy: "network-only", // Bypass Apollo cache completely
            });

            console.log("[AUTH] Token create response:", data);

            if (data?.tokenCreate?.errors?.length > 0) {
                console.log("[AUTH] Login errors:", data.tokenCreate.errors);
                return { success: false, error: data.tokenCreate.errors[0].message };
            }

            if (data?.tokenCreate?.token) {
                console.log("[AUTH] Token received:", data.tokenCreate.token.substring(0, 20) + "...");
                const userData = data.tokenCreate.user;
                console.log("[AUTH] User data:", userData);

                if (!userData.isStaff) {
                    console.log("[AUTH] User is not staff, rejecting");
                    return { success: false, error: "Access denied. Staff account required." };
                }

                // Store token
                console.log("[AUTH] Storing token in localStorage");
                localStorage.setItem("saleor_token", data.tokenCreate.token);
                if (data.tokenCreate.refreshToken) {
                    localStorage.setItem("saleor_refresh_token", data.tokenCreate.refreshToken);
                }
                console.log("[AUTH] Token stored successfully");

                // Set user immediately
                setUser(userData);
                setHasToken(true);

                // Force reload to ensure Apollo client has the new token
                console.log("[AUTH] Redirecting to /");
                window.location.href = "/";
                return { success: true };
            }

            console.log("[AUTH] No token in response");
            return { success: false, error: "Login failed. Please try again." };
        } catch (error: unknown) {
            console.error("[AUTH] Login error:", error);
            const errorMessage = error instanceof Error ? error.message : "An error occurred";
            return { success: false, error: errorMessage };
        }
    }, [tokenCreate]);

    const logout = useCallback(() => {
        localStorage.removeItem("saleor_token");
        localStorage.removeItem("saleor_refresh_token");
        setUser(null);
        setHasToken(false);
        window.location.href = "/login";
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
