import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { RewardsService } from "../services/rewards.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { session } = await authenticate.public.appProxy(request);
  
  if (!session) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { customerId, optionId } = body;

    if (!customerId || !optionId) {
      return json({ 
        error: "Customer ID and option ID required" 
      }, { status: 400 });
    }

    const rewardsService = new RewardsService(session.shop);
    
    // First get the customer by Shopify ID
    const customer = await rewardsService.getOrCreateCustomer(customerId);
    if (!customer) {
      return json({ error: "Customer not found" }, { status: 404 });
    }

    const redemption = await rewardsService.redeemPoints(customer.id, optionId);

    return json({
      success: true,
      data: redemption
    });
  } catch (error) {
    console.error("Error redeeming points:", error);
    return json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 });
  }
}