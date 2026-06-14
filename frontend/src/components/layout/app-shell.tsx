"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
import { api } from "@/lib/api";
import { cn, initials } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
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
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .notifications()
      .then((n) => active && setUnread(n.filter((x) => !x.is_read).length))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Logo size={28} />
          <span className="text-sm">Loading your workspace…</span>
        </div>
      </div>
    );
  }

  const items = [...navItems];
  if (user.role === "platform_admin") {
    items.push({ href: "/dashboard/admin", label: "Admin", icon: Shield });
  }

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const SidebarBody = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Logo size={34} />
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight">Pamodzi</p>
            <p className="text-[11px] text-muted-foreground">Finance</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 -z-10 rounded-xl border border-border/60 bg-secondary/60"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon
                className={cn("h-[18px] w-[18px]", active && "text-primary")}
              />
              {item.label}
              {item.href === "/dashboard/notifications" && unread > 0 ? (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {unread}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-border/60 bg-secondary/40 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full brand-gradient text-xs font-semibold text-primary-foreground">
            {initials(user.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.full_name}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">
              {user.role.replace("_", " ")}
            </p>
          </div>
          <button
            onClick={logout}
            aria-label="Log out"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-background hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-background lg:flex">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-radial-fade" />

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border/60 bg-card/40 backdrop-blur-xl lg:block">
        {SidebarBody}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-card/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size={30} />
          <span className="font-semibold">Pamodzi</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-border/60 bg-secondary/40 p-2 text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="absolute left-0 top-0 h-full w-72 border-r border-border/60 bg-card"
            >
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-4 rounded-lg p-2 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
              {SidebarBody}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1">
        {/* Desktop top utility bar */}
        <div className="sticky top-0 z-20 hidden items-center justify-end gap-2 border-b border-border/60 bg-background/60 px-6 py-3 backdrop-blur-xl lg:flex">
          <Link href="/dashboard/notifications">
            <button
              aria-label="Notifications"
              className="relative rounded-lg border border-border/60 bg-secondary/40 p-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {unread}
                </span>
              ) : null}
            </button>
          </Link>
          <ThemeToggle />
        </div>

        <main>
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
