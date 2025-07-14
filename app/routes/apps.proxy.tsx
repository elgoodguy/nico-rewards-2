// This route handles the app proxy root path
// Individual proxy routes are handled by their own files:
// - apps.proxy.customer.summary.tsx
// - apps.proxy.customer.redeem.tsx

export async function loader() {
  return new Response("App Proxy is working", { status: 200 });
}