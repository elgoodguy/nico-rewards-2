import { createRequestHandler } from "@netlify/remix-adapter";
import * as build from "../../build/server/index.js";

export const handler = createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
  getRequestHeaders(request: Request) {
    const headers: HeadersInit = {};
    
    // Preserve Shopify-specific headers
    const shopifyHeaders = [
      "x-shopify-hmac-sha256",
      "x-shopify-shop-domain",
      "x-shopify-api-version",
      "x-shopify-webhook-id",
      "x-shopify-topic",
      "x-shopify-triggered-at"
    ];
    
    for (const [key, value] of request.headers.entries()) {
      if (shopifyHeaders.includes(key.toLowerCase()) || key.toLowerCase().startsWith("x-shopify-")) {
        headers[key] = value;
      }
    }
    
    return headers;
  }
});