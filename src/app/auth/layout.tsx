import type { ReactNode } from "react";

/** Full-bleed shell for auth screens — deliberately outside the (app) group so
 * the sidebar/topbar AppShell never renders here. The page owns its own layout. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh">{children}</div>;
}
