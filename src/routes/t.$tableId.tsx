import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useWokStore } from "@/lib/wokmawa-store";

export const Route = createFileRoute("/t/$tableId")({
  component: TableRedirect,
});

function TableRedirect() {
  const { tableId } = Route.useParams();
  const navigate = useNavigate();
  const { actions } = useWokStore();

  useEffect(() => {
    let isMounted = true;

    async function handleTableCheck() {
      if (!tableId) {
        navigate({ to: "/" });
        return;
      }

      const clean = tableId.toUpperCase();
      actions.setTableNumber(clean);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("wokmawa_seen_splash", "true");
      }

      // Check if table currently has an in-progress active order
      const res = await actions.checkTableActiveOrder(clean);
      if (isMounted) {
        if (res.hasActiveOrder && res.activeOrder) {
          navigate({ to: "/orders" });
        } else {
          navigate({ to: "/" });
        }
      }
    }

    handleTableCheck();

    return () => {
      isMounted = false;
    };
  }, [tableId, actions, navigate]);

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4 text-center select-none">
      <div className="space-y-3">
        <div className="w-12 h-12 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin mx-auto" />
        <p className="text-sm font-bold text-white">
          Checking Table #{tableId} Status...
        </p>
      </div>
    </div>
  );
}
