import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { RewardsService } from "../services/rewards.server";

// Handle CORS preflight requests
export async function action({ request }: ActionFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, ngrok-skip-browser-warning"
      }
    });
  }
  
  return new Response("Method not allowed", { status: 405 });
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Add debug logging
    console.log("Proxy request URL:", request.url);
    console.log("Proxy request headers:", Object.fromEntries(request.headers.entries()));
    
    const { session } = await authenticate.public.appProxy(request);
    
    if (!session) {
      console.log("No session found for proxy request");
      return json({ error: "Unauthorized", success: false }, { 
        status: 401,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, ngrok-skip-browser-warning"
        }
      });
    }

    const url = new URL(request.url);
    // Use logged_in_customer_id parameter that Shopify automatically provides
    const customerId = url.searchParams.get("logged_in_customer_id") || url.searchParams.get("customer_id");

    if (!customerId) {
      // Return success with no data when no customer is logged in
      return json({ 
        success: true, 
        data: null,
        message: "No customer logged in"
      }, { 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, ngrok-skip-browser-warning"
        }
      });
    }

    const rewardsService = new RewardsService(session.shop);
    const summary = await rewardsService.getCustomerSummary(customerId);

    if (!summary) {
      return json({ 
        success: false,
        error: "Customer not found" 
      }, { 
        status: 404,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, ngrok-skip-browser-warning"
        }
      });
    }

    return json({
      success: true,
      data: summary
    }, {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, ngrok-skip-browser-warning"
      }
    });
  } catch (error) {
    console.error("Error fetching customer summary:", error);
    console.error("Error stack:", error.stack);
    return json({ 
      success: false,
      error: "Internal server error",
      details: error.message 
    }, { 
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, ngrok-skip-browser-warning"
      }
    });
  }
}