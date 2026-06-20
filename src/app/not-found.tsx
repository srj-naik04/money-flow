import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl font-bold text-muted-foreground/40">404</p>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you&rsquo;re looking for doesn&rsquo;t exist.
        </p>
      </div>
      <Button render={<Link href="/" />}>Back to dashboard</Button>
    </div>
  );
}
