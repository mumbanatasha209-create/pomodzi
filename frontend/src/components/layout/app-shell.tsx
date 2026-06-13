"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Shield,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/groups", label: "Groups", icon: Users },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const items = [...navItems];
  if (user.role === "platform_admin") {
    items.push({ href: "/dashboard/admin", label: "Admin", icon: Shield });
  }

  const SidebarBody = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white">
          P
        </div>
        <span className="text-lg font-semibold">Pamodzi</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials(user.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.full_name}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">
              {user.role.replace("_", " ")}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="mt-1 w-full justify-start text-muted-foreground"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" /> Log out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
        {SidebarBody}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white">
            P
          </div>
          <span className="font-semibold">Pamodzi</span>
        </div>
        <button
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="rounded-md p-2 hover:bg-secondary"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-card shadow-xl">
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-md p-2 hover:bg-secondary"
            >
              <X className="h-5 w-5" />
            </button>
            {SidebarBody}
          </div>
        </div>
      )}

      <main className="flex-1">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
