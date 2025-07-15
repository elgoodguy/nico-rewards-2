import { createRequestHandler } from "@remix-run/netlify";
import * as build from "../../build/server/index.js";

const handler = createRequestHandler({
  build,
  mode: process.env.NODE_ENV || "production",
  getLoadContext: (request) => {
    // Preserve all headers, especially Shopify ones
    const headers = {};
    for (const [key, value] of request.headers.entries()) {
      headers[key] = value;
    }
    
    return {
      headers,
      request
    };
  }
});

export { handler };