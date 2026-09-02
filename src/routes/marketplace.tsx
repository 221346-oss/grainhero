import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "GrainHero Marketplace — Buy verified grain" },
      {
        name: "description",
        content: "Browse verified grain listings direct from GrainHero-monitored warehouses.",
      },
      { property: "og:title", content: "GrainHero Marketplace" },
      {
        property: "og:description",
        content: "Buy verified grain direct from monitored warehouses.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: MarketplaceShell,
});

function MarketplaceShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isRoot = path === "/marketplace" || path === "/marketplace/";
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <Link to="/marketplace" className="flex items-center gap-2 font-semibold">
            <ShoppingBag className="h-5 w-5 text-emerald-600" />
            GrainHero Marketplace
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              Home
            </Link>
            <Link to="/buyer/orders" className="text-muted-foreground hover:text-foreground">
              My Orders
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {isRoot ? null : null}
        <Outlet />
      </main>
    </div>
  );
}
