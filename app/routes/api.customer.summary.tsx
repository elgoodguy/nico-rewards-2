import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { RewardsService } from "../services/rewards.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.public.appProxy(request);
  
  if (!session) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const customerId = url.searchParams.get("customer_id");

  if (!customerId) {
    return json({ error: "Customer ID required" }, { status: 400 });
  }

  try {
    const rewardsService = new RewardsService(session.shop);
    const summary = await rewardsService.getCustomerSummary(customerId);

    if (!summary) {
      return json({ error: "Customer not found" }, { status: 404 });
    }

    return json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error("Error fetching customer summary:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}