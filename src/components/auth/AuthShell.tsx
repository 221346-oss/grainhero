import { Link } from "@tanstack/react-router";
import { Wheat, Home } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)" }}
    >
      <div className="w-full max-w-md">
        {/* Logo — click to go home */}
        <Link
          to="/"
          className="flex items-center justify-center gap-2 mb-4 text-gray-700 hover:text-[#00a63e] transition-colors"
        >
          <Wheat className="w-8 h-8 text-[#00a63e]" />
          <span className="text-2xl font-bold tracking-wide">GrainHero</span>
        </Link>

        {/* Explicit Home button */}
        <div className="flex justify-center mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#00a63e] transition-colors border border-slate-200 rounded-full px-4 py-1.5 bg-white hover:border-emerald-300"
          >
            <Home className="w-3.5 h-3.5" />
            Back to home
          </Link>
        </div>

        <Card className="shadow-xl border-gray-200 p-6">{children}</Card>
      </div>
    </div>
  );
}

export type Msg = { type: "success" | "error" | "info"; text: string } | null;

export function Message({ msg }: { msg: Msg }) {
  if (!msg) return null;
  const styles =
    msg.type === "error"
      ? "bg-red-50 text-red-700 border-red-200"
      : msg.type === "success"
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-blue-50 text-blue-700 border-blue-200";
  return <div className={`text-sm border rounded-md p-3 ${styles}`}>{msg.text}</div>;
}