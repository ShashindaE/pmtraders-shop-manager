"use client";

import { ApolloClient, InMemoryCache, ApolloProvider as Provider, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { ReactNode, useMemo } from "react";

const httpLink = createHttpLink({
    uri: process.env.NEXT_PUBLIC_SALEOR_API_URL || "http://localhost:8000/graphql/",
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

function makeClient() {
    return new ApolloClient({
        link: authLink.concat(httpLink),
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
