import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  Users,
  Map,
  BarChart3,
  Radar,
  Menu,
  X,
  Ruler,
  Warehouse,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const nav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/radar", label: "Radar", icon: Radar },
  { to: "/opportunita", label: "Opportunità", icon: Building2 },
  { to: "/opportunita/nuova", label: "Nuova", icon: PlusCircle },
  { to: "/capannoni", label: "Capannoni", icon: Warehouse },
  { to: "/misuratore", label: "Misuratore", icon: Ruler },
  { to: "/contatti", label: "Contatti", icon: Users },
  { to: "/mappa", label: "Mappa", icon: Map },
  { to: "/report", label: "Report", icon: BarChart3 },
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <Brand />
        <NavList pathname={pathname} onNavigate={() => {}} />
        <Footer />
      </aside>

      {/* Mobile topbar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-sidebar text-sidebar-foreground px-4 h-14 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Radar className="w-5 h-5 text-sidebar-primary" />
            <span className="font-semibold tracking-tight">Sica Industrial Radar</span>
          </div>
          <button
            aria-label="Menu"
            onClick={() => setOpen(true)}
            className="p-2 rounded-md hover:bg-sidebar-accent"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {open && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
            <aside className="relative w-72 bg-sidebar text-sidebar-foreground flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
                <Brand inline />
                <button onClick={() => setOpen(false)} className="p-2 rounded-md hover:bg-sidebar-accent">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
              <Footer />
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Brand({ inline = false }: { inline?: boolean }) {
  if (inline) {
    return (
      <div className="flex items-center gap-2">
        <Radar className="w-5 h-5 text-sidebar-primary" />
        <span className="font-semibold tracking-tight">Sica Industrial Radar</span>
      </div>
    );
  }
  return (
    <div className="px-5 py-5 border-b border-sidebar-border">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-md bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center">
          <Radar className="w-5 h-5" />
        </div>
        <div>
          <div className="font-semibold leading-tight tracking-tight">Sica Industrial</div>
          <div className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">Radar</div>
        </div>
      </div>
    </div>
  );
}

function NavList({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <nav className="flex-1 p-3 space-y-1">
      {nav.map((item) => {
        const Icon = item.icon;
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to as never}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Footer() {
  return (
    <div className="p-4 border-t border-sidebar-border text-[11px] text-sidebar-foreground/60">
      Strumento operativo interno · Sica Immobiliare
    </div>
  );
}
