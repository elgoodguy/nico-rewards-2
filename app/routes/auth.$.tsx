import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.admin(request);
    return null;
  } catch (error) {
    // If authentication fails, redirect to login
    console.error("Authentication error:", error);
    throw error;
  }
};
