"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { authClient } from "@/lib/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initialsOf(name?: string | null, email?: string | null): string {
  const source = (name ?? email ?? "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/** Avatar + sign-out menu. Renders nothing until a session resolves so it never
 * flashes on the (already-gated) authenticated shell. */
export function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  // The session only resolves on the client, so the server and first client
  // paint must render the same neutral placeholder to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || isPending) {
    return (
      <div
        className="size-8 animate-pulse rounded-full bg-muted"
        aria-hidden="true"
      />
    );
  }
  if (!user) return null;

  async function signOut() {
    await authClient.signOut();
    router.replace("/auth/sign-in");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-9 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="Account menu"
      >
        <Avatar size="sm">
          {user.image ? (
            <AvatarImage src={user.image} alt="" referrerPolicy="no-referrer" />
          ) : null}
          <AvatarFallback>{initialsOf(user.name, user.email)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-60">
        <div className="flex items-center gap-2.5 px-1.5 py-1.5">
          <Avatar size="sm">
            {user.image ? (
              <AvatarImage
                src={user.image}
                alt=""
                referrerPolicy="no-referrer"
              />
            ) : null}
            <AvatarFallback>{initialsOf(user.name, user.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            {user.name ? (
              <p className="truncate text-sm font-medium">{user.name}</p>
            ) : null}
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={signOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
