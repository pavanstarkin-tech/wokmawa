import { LOGO_URL } from "@/lib/parkashala-menu";

export function Logo({ size = 56, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <div
      className="relative inline-flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 30% 30%, #FFF9F2 0%, #F3E8DB 60%, #E1CDB8 100%)",
        boxShadow: glow
          ? "0 0 0 1px rgba(200,155,60,0.6), 0 12px 40px -8px rgba(200,155,60,0.55), inset 0 0 20px rgba(200,155,60,0.2)"
          : "0 0 0 1px rgba(200,155,60,0.35), 0 4px 12px -2px rgba(59,36,24,0.25)",
      }}
    >
      <img
        src={LOGO_URL}
        alt="Parkashala"
        className="rounded-full object-contain"
        style={{ width: size * 0.86, height: size * 0.86 }}
        loading="eager"
      />
    </div>
  );
}
