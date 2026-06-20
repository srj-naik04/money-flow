"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { MOBILE_NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);

  const [first, second] = [MOBILE_NAV_ITEMS[0], MOBILE_NAV_ITEMS[1]];
  const [third, fourth] = [MOBILE_NAV_ITEMS[2], MOBILE_NAV_ITEMS[3]];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t bg-background/95 pb-safe backdrop-blur md:hidden"
      aria-label="Primary"
    >
      {[first, second].map((item) => (
        <NavTab key={item.href} item={item} active={isActive(pathname, item.href)} />
      ))}

      <button
        type="button"
        onClick={() => openQuickAdd("expense")}
        aria-label="Quick add"
        className="relative -mt-5 flex size-12 shrink-0 items-center justify-center self-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
      >
        <Plus className="size-6" />
      </button>

      {[third, fourth].map((item) => (
        <NavTab key={item.href} item={item} active={isActive(pathname, item.href)} />
      ))}
    </nav>
  );
}

function NavTab({
  item,
  active,
}: {
  item: (typeof MOBILE_NAV_ITEMS)[number];
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium outline-none transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
