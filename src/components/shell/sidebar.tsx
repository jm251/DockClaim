"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Building2,
  FileText,
  Home,
  Import,
  Landmark,
  Loader2,
  Menu,
  ScrollText,
  Settings,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clearDemoAction } from "@/app/actions";

const navigation = [
  { href: "/app/dashboard", label: "Dashboard", icon: Home },
  { href: "/app/imports", label: "Imports", icon: Import },
  { href: "/app/loads", label: "Loads", icon: ScrollText },
  { href: "/app/claims", label: "Claims", icon: FileText },
  { href: "/app/rules", label: "Rules", icon: Landmark },
  { href: "/app/customers", label: "Customers", icon: Building2 },
  { href: "/app/facilities", label: "Facilities", icon: BarChart3 },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  organizationName,
  role,
  authMode,
}: {
  organizationName: string;
  role: string;
  authMode: "demo" | "supabase";
}) {
  const currentPath = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [currentPath]);

  const links = (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
        const pending = pendingHref === item.href;
        const Icon = item.icon;

        return (
          <Link
            aria-busy={pending || undefined}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-fluid-base font-medium transition ${
              active || pending
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--foreground-soft)] hover:bg-[var(--surface-subtle)]"
            }`}
            data-sidebar-href={item.href}
            data-testid={pending ? "sidebar-link-pending" : undefined}
            href={item.href}
            key={item.href}
            onClick={(event) => {
              if (pending) {
                event.preventDefault();
                return;
              }

              setMobileOpen(false);
              if (!active) {
                setPendingHref(item.href);
              }
            }}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
            {pending ? <Loader2 className="ml-auto h-4 w-4 animate-spin text-[var(--primary)]" /> : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="lg:hidden">
        <Card className="p-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-eyebrow text-[var(--primary)]">DockClaim</p>
              <h2 className="text-fluid-lg mt-2 break-words font-semibold text-[var(--foreground)]">{organizationName}</h2>
            </div>
            <Button aria-label="Open navigation" className="shrink-0" onClick={() => setMobileOpen(true)} variant="outline">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-[rgba(20,37,40,0.42)] backdrop-blur-sm lg:hidden">
          <button
            aria-label="Close navigation backdrop"
            className="absolute inset-0"
            onClick={() => setMobileOpen(false)}
            type="button"
          />
          <div className="absolute right-0 top-0 h-full w-[min(88vw,360px)] p-3">
            <Card className="relative flex h-full flex-col overflow-hidden p-4">
              <div className="rounded-[24px] bg-[var(--secondary)] p-5 text-[var(--secondary-foreground)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-eyebrow text-white/70">DockClaim</p>
                    <h2 className="text-fluid-xl mt-3 break-words font-semibold">{organizationName}</h2>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Badge variant="default" className="border-white/20 bg-white/10 text-white">
                        {role}
                      </Badge>
                      {authMode === "demo" ? (
                        <Badge variant="warning" className="border-white/20 bg-white/10 text-white">
                          Demo
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <Button aria-label="Close navigation" onClick={() => setMobileOpen(false)} variant="ghost">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-6 flex-1 overflow-y-auto">{links}</div>
              {authMode === "demo" ? (
                <form action={clearDemoAction} className="mt-6">
                  <Button className="w-full" type="submit" variant="outline">
                    Exit demo session
                  </Button>
                </form>
              ) : null}
            </Card>
          </div>
        </div>
      ) : null}

      <aside className="hidden w-full max-w-[320px] lg:block">
        <Card className="sticky top-6 overflow-hidden p-4">
          <div className="rounded-[24px] bg-[var(--secondary)] p-5 text-[var(--secondary-foreground)]">
            <p className="text-eyebrow text-white/70">DockClaim</p>
            <h2 className="text-fluid-xl mt-4 break-words font-semibold">{organizationName}</h2>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="default" className="border-white/20 bg-white/10 text-white">
                {role}
              </Badge>
              {authMode === "demo" ? (
                <Badge variant="warning" className="border-white/20 bg-white/10 text-white">
                  Demo
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="mt-6">{links}</div>

          {authMode === "demo" ? (
            <form action={clearDemoAction} className="mt-6">
              <Button className="w-full" type="submit" variant="outline">
                Exit demo session
              </Button>
            </form>
          ) : null}
        </Card>
      </aside>
    </>
  );
}
