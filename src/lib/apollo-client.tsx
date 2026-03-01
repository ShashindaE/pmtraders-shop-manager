"use client";

import { ApolloClient, InMemoryCache, ApolloProvider as Provider, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { ReactNode, useMemo } from "react";

const httpLink = createHttpLink({
    // In the browser, use the local Next.js proxy to bypass CORS.
    // On the server side (SSR), hits the API directly (no CORS issue).
    uri: typeof window === "undefined"
        ? (process.env.NEXT_PUBLIC_SALEOR_API_URL || "https://api-production-9c55.up.railway.app/graphql/")
        : "/api/graphql",
});

const authLink = setContext((_, { headers }) => {
    // Get token from localStorage (client-side only)
    let token = "";
    if (typeof window !== "undefined") {
        token = localStorage.getItem("saleor_token") || "";
    }

    return {
        headers: {
            ...headers,
            authorization: token ? `JWT ${token}` : "",
        },
    };
});

// Token refresh helper
let refreshingPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem("saleor_refresh_token");
    if (!refreshToken) return null;

    const apiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL || "https://api-production-9c55.up.railway.app/graphql/";

    try {
        const response = await fetch("/api/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: `mutation TokenRefresh($refreshToken: String!) {
                    tokenRefresh(refreshToken: $refreshToken) {
                        token
                        errors { field message }
                    }
                }`,
                variables: { refreshToken }
            })
        });

        const result = await response.json();
        const newToken = result.data?.tokenRefresh?.token;

        if (newToken) {
            console.log("[AUTH] Token refreshed successfully.");
            localStorage.setItem("saleor_token", newToken);
            return newToken;
        } else {
            console.warn("[AUTH] Token refresh failed:", result.data?.tokenRefresh?.errors);
            return null;
        }
    } catch (e) {
        console.error("[AUTH] Token refresh error:", e);
        return null;
    }
}

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
    if (typeof window !== "undefined") {
        let isExpiredToken = false;

        if (graphQLErrors) {
            graphQLErrors.forEach(({ message, extensions }) => {
                if (
                    message.includes("Signature has expired") ||
                    message.includes("JSONWebTokenError") ||
                    extensions?.code === "UNAUTHENTICATED"
                ) {
                    isExpiredToken = true;
                }
            });
        }

        if (networkError && 'statusCode' in networkError && networkError.statusCode === 401) {
            isExpiredToken = true;
        }

        if (isExpiredToken) {
            // Try to refresh before forcing logout
            if (!refreshingPromise) {
                refreshingPromise = tryRefreshToken().finally(() => {
                    refreshingPromise = null;
                });
            }

            refreshingPromise.then((newToken) => {
                if (newToken) {
                    // Token refreshed — reload to use the new token
                    // (Apollo singleton caches the old token, simplest fix is reload)
                    console.log("[AUTH] Reloading with refreshed token...");
                    window.location.reload();
                } else {
                    // Refresh failed — force logout
                    console.warn("[AUTH] Token expired and refresh failed, forcing logout.");
                    localStorage.removeItem("saleor_token");
                    localStorage.removeItem("saleor_refresh_token");

                    if (!window.location.pathname.includes('/login')) {
                        window.location.href = "/login";
                    }
                }
            });
        }
    }
});

function makeClient() {
    return new ApolloClient({
        link: errorLink.concat(authLink.concat(httpLink)),
        cache: new InMemoryCache(),
        defaultOptions: {
            watchQuery: {
                fetchPolicy: "cache-and-network",
            },
        },
    });
}

// Client singleton
let apolloClientInstance: ApolloClient<any> | null = null;

export function resetApolloClient() {
    if (apolloClientInstance) {
        apolloClientInstance.clearStore();
        apolloClientInstance = null;
    }
}

export function getApolloClient() {
    if (typeof window === "undefined") {
        return makeClient();
    }
    if (!apolloClientInstance) {
        apolloClientInstance = makeClient();
    }
    return apolloClientInstance;
}

export const apolloClient = typeof window !== "undefined" ? getApolloClient() : null;

export function ApolloProvider({ children }: { children: ReactNode }) {
    const client = useMemo(() => getApolloClient(), []);
    return <Provider client={client}>{children}</Provider>;
}

// Custom function for file uploads using fetch with multipart/form-data
export async function uploadProductImage(productId: string, file: File, alt?: string): Promise<{ success: boolean; error?: string; media?: any }> {
    const token = typeof window !== "undefined" ? localStorage.getItem("saleor_token") || "" : "";
    const apiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL || "http://localhost:8000/graphql/";

    const operations = JSON.stringify({
        query: `
            mutation ProductMediaCreate($product: ID!, $image: Upload!, $alt: String) {
                productMediaCreate(input: { product: $product, image: $image, alt: $alt }) {
                    product {
                        id
                        media {
                            id
                            url
                            alt
                        }
                        thumbnail {
                            url
                        }
                    }
                    errors {
                        field
                        message
                    }
                }
            }
        `,
        variables: {
            product: productId,
            image: null,
            alt: alt || "Product image",
        },
    });

    const map = JSON.stringify({
        "0": ["variables.image"],
    });

    const formData = new FormData();
    formData.append("operations", operations);
    formData.append("map", map);
    formData.append("0", file);

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                Authorization: token ? `JWT ${token}` : "",
            },
            body: formData,
        });

        const result = await response.json();

        if (result.errors) {
            return { success: false, error: result.errors[0]?.message || "Upload failed" };
        }

        if (result.data?.productMediaCreate?.errors?.length > 0) {
            return { success: false, error: result.data.productMediaCreate.errors[0].message };
        }

        return { success: true, media: result.data?.productMediaCreate?.product?.media };
    } catch (error: any) {
        return { success: false, error: error.message || "Upload failed" };
    }
}
