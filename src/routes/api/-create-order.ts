import { createAPIFileRoute } from "@tanstack/react-start/api";

const KEY_ID = "rzp_live_StBUehIpeULYuL";
const KEY_SECRET = "M76UWnmNsVE7hU5QrkriZuor";

export const APIRoute = createAPIFileRoute("/api/create-order")({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const amount = parseInt(body.amount);
      const receipt = body.receipt || `rcpt_${Date.now()}`;

      if (!amount) {
        return new Response(JSON.stringify({ error: "Amount is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const credentials = btoa(`${KEY_ID}:${KEY_SECRET}`);

      const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt,
        }),
      });

      const data = await rzpResponse.json();

      return new Response(JSON.stringify(data), {
        status: rzpResponse.status,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("Razorpay order creation failed:", err);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },

  OPTIONS: async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  },
});
