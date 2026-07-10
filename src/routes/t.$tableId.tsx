import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { useTable } from "@/lib/paakashala-store";
import { QrCode, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/t/$tableId")({
  component: TableEntry,
});

function TableEntry() {
  const { tableId } = Route.useParams();
  const navigate = useNavigate();
  const { setTable } = useTable();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateTable = async () => {
      try {
        const tableRef = ref(db, `restaurant/tables/${tableId}`);
        const snapshot = await get(tableRef);
        
        if (snapshot.exists() && snapshot.val().active) {
          // Valid table! Lock it in.
          setTable(tableId);
          // Redirect to home
          navigate({ to: "/", replace: true });
        } else {
          setError("Invalid or inactive Table QR code.");
        }
      } catch (err) {
        setError("Could not verify table at this time. Please try again.");
      }
    };

    if (tableId) {
      validateTable();
    }
  }, [tableId, setTable, navigate]);

  if (error) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-red-500/10 shadow-luxe ring-1 ring-red-500/20">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-brown-deep">
          Verification Failed
        </h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6">
      <div className="animate-pulse flex flex-col items-center">
        <QrCode className="h-16 w-16 text-gold mb-4" />
        <h2 className="text-xl font-bold text-brown-deep">Connecting to Table {tableId}...</h2>
        <p className="text-muted-foreground text-sm mt-2">Setting up your menu</p>
      </div>
    </div>
  );
}
