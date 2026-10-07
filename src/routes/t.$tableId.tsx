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
    if (tableId) {
      actions.setTableNumber(tableId.toUpperCase());
    }
    // Navigate straight to WokMawa home
    navigate({ to: "/" });
  }, [tableId, actions, navigate]);

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4 text-center">
      <div className="space-y-3">
        <div className="w-12 h-12 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin mx-auto" />
        <p className="text-sm font-bold text-white">
          Setting Table #{tableId}...
        </p>
      </div>
    </div>
  );
}
