import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { RewardsService } from "../services/rewards.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, admin, payload } = await authenticate.webhook(request);

  if (!admin) {
    throw new Response();
  }

  // Make sure it's the order paid webhook
  if (topic !== "orders/paid") {
    throw new Response();
  }

  try {
    const order = payload as any;
    console.log(`Processing order ${order.id} for shop ${shop}`);

    // Skip if no customer
    if (!order.customer?.id) {
      console.log("Order has no customer, skipping rewards");
      throw new Response();
    }

    const rewardsService = new RewardsService(shop);

    // Get or create customer in our system
    const customer = await rewardsService.getOrCreateCustomer(
      order.customer.id.toString(),
      {
        email: order.customer.email,
        firstName: order.customer.first_name,
        lastName: order.customer.last_name
      }
    );

    if (!customer) {
      console.error("Failed to create/find customer");
      throw new Response();
    }

    // Add points for the purchase
    const result = await rewardsService.addPointsForPurchase(
      customer.id,
      order.id.toString(),
      parseFloat(order.current_total_price || order.total_price || "0")
    );

    if (result) {
      console.log(`Added ${result.pointsEarned} points to customer ${customer.id}`);
    }

    throw new Response();
  } catch (error) {
    console.error("Error processing order webhook:", error);
    throw new Response();
  }
};