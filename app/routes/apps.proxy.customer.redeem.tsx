import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { RewardsService } from "../services/rewards.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ 
      success: false,
      error: "Method not allowed" 
    }, { 
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { session } = await authenticate.public.appProxy(request);
    
    if (!session) {
      return json({ 
        success: false,
        error: "Unauthorized" 
      }, { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get logged_in_customer_id from URL params (for security)
    const url = new URL(request.url);
    const loggedInCustomerId = url.searchParams.get("logged_in_customer_id");

    if (!loggedInCustomerId) {
      return json({ 
        success: false,
        error: "Customer must be logged in to redeem" 
      }, { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await request.json();
    const { optionId } = body;

    if (!optionId) {
      return json({ 
        success: false,
        error: "Option ID required" 
      }, { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const rewardsService = new RewardsService(session.shop);
    
    // Use the logged in customer ID from Shopify
    const customer = await rewardsService.getOrCreateCustomer(loggedInCustomerId);
    if (!customer) {
      return json({ 
        success: false,
        error: "Customer not found" 
      }, { 
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const redemption = await rewardsService.redeemPoints(customer.id, optionId);

    return json({
      success: true,
      data: redemption
    }, {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error redeeming points:", error);
    return json({ 
      success: false,
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}