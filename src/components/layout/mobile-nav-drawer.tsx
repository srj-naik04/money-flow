"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Wallet, LogOut } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Mobile-only hamburger that opens a drawer with EVERY section. The bottom nav
 * only surfaces 4 destinations, so this is how phones reach the rest.
 */
export function MobileNavDrawer() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [open, setOpen] = useState(false);

  async function signOut() {
    setOpen(false);
    await authClient.signOut();
    router.replace("/auth/sign-in");
    router.refresh();
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-72 max-w-[85vw] gap-0 p-0 pt-safe pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="flex-row items-center gap-2 border-b">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="size-4" aria-hidden="true" />
            </div>
            <SheetTitle>MoneyFlow</SheetTitle>
          </SheetHeader>

          <nav
            className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3"
            aria-label="All sections"
          >
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-xs"
                      : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {session?.user ? (
            <div className="mt-auto border-t px-2 py-3">
              <div className="px-3 pb-2">
                {session.user.name ? (
                  <p className="truncate text-sm font-medium">
                    {session.user.name}
                  </p>
                ) : null}
                <p className="truncate text-xs text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={signOut}
              >
                <LogOut className="size-5 shrink-0" aria-hidden="true" />
                Sign out
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
