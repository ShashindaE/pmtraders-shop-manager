/**
 * Next.js API proxy for GraphQL requests.
 * 
 * This proxy forwards all GraphQL requests from the browser to the Railway
 * production API server-side, completely bypassing browser CORS restrictions.
 * 
 * Browser → localhost:5000/api/graphql → Railway API (server-side, no CORS)
 */

import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_API_URL =
    process.env.NEXT_PUBLIC_SALEOR_API_URL ||
    "https://api-production-9c55.up.railway.app/graphql/";

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization") || "";
        const contentType = request.headers.get("content-type") || "";
        const isMultipart = contentType.includes("multipart/form-data");

        let upstreamResponse;

        if (isMultipart) {
            // Forward multipart data exactly as received
            const formData = await request.formData();
            upstreamResponse = await fetch(UPSTREAM_API_URL, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    ...(authHeader ? { Authorization: authHeader } : {}),
                },
                body: formData, // Node fetch will set the correct Content-Type with boundary automatically
            });
        } else {
            // Forward JSON data
            const body = await request.text();
            upstreamResponse = await fetch(UPSTREAM_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    ...(authHeader ? { Authorization: authHeader } : {}),
                },
                body,
            });
        }

        const responseText = await upstreamResponse.text();

        return new NextResponse(responseText, {
            status: upstreamResponse.status,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    } catch (error: any) {
        console.error("[GraphQL Proxy] Error:", error.message);
        return NextResponse.json(
            { errors: [{ message: "Proxy error: " + error.message }] },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}
