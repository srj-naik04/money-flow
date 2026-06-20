"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "motion/react";
import {
  Wallet,
  Loader2,
  TrendingUp,
  CalendarClock,
  LineChart,
  ShieldCheck,
} from "lucide-react";

import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Email/password fields are gated behind a build-time flag — on for automation
 * (Google OAuth can't be scripted), off in production to keep the UI Google-only. */
const PASSWORD_AUTH = process.env.NEXT_PUBLIC_ENABLE_PASSWORD_AUTH === "true";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Cash flow & GST",
    desc: "Every rupee in and out, with GST reconciled automatically.",
  },
  {
    icon: CalendarClock,
    title: "Bills & subscriptions",
    desc: "Never miss a renewal, EMI, SIP or recurring payment.",
  },
  {
    icon: LineChart,
    title: "Investments & goals",
    desc: "Track portfolio growth, deposits and savings targets.",
  },
  {
    icon: ShieldCheck,
    title: "Private & secure",
    desc: "Your finances stay yours alone, behind Google sign-in.",
  },
] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
};

type Busy = "google" | "signin" | "signup" | null;

/** Google's four-colour "G" mark (inline so we don't ship an icon dependency). */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

export default function SignInPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Already signed in? Don't show the gate — bounce to the app.
  useEffect(() => {
    if (session?.user) router.replace("/");
  }, [session, router]);

  async function signInWithGoogle() {
    setBusy("google");
    setError(null);
    try {
      // Redirects the browser to Google; on success we never return here.
      await authClient.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/`,
      });
    } catch {
      setError(
        "Couldn't start Google sign-in. Check your connection and try again.",
      );
      setBusy(null);
    }
  }

  async function emailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy("signin");
    setError(null);
    const { error: err } = await authClient.signIn.email({ email, password });
    if (err) {
      setError(
        err.message ?? "Couldn't sign in. Check your email and password.",
      );
      setBusy(null);
      return;
    }
    // Hard navigation so the freshly-set session cookie is picked up by the gate.
    window.location.assign("/");
  }

  async function emailSignUp() {
    setBusy("signup");
    setError(null);
    const { error: err } = await authClient.signUp.email({
      email,
      password,
      name: email.split("@")[0] || "User",
    });
    if (err) {
      setError(err.message ?? "Couldn't create the account.");
      setBusy(null);
      return;
    }
    window.location.assign("/");
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr] xl:grid-cols-2">
      {/* ---- Brand panel (desktop) ---- */}
      <motion.aside
        variants={container}
        initial="hidden"
        animate="show"
        className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 p-10 text-white lg:flex lg:flex-col xl:p-14"
      >
        {/* soft animated glow blobs */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-20 size-96 rounded-full bg-white/20 blur-3xl"
          animate={{ y: [0, 24, 0], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-6rem] bottom-[-4rem] size-[28rem] rounded-full bg-fuchsia-400/20 blur-3xl"
          animate={{ y: [0, -28, 0], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* subtle grid texture */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:36px_36px]"
        />

        <motion.div
          variants={rise}
          className="relative flex items-center gap-2.5"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <Wallet className="size-5" aria-hidden="true" />
          </div>
          <span className="font-heading text-lg font-semibold tracking-tight">
            MoneyFlow
          </span>
        </motion.div>

        <div className="relative my-auto max-w-md py-10">
          <motion.h1
            variants={rise}
            className="font-heading text-3xl leading-tight font-semibold tracking-tight text-balance xl:text-4xl"
          >
            Your money, beautifully in flow.
          </motion.h1>
          <motion.p variants={rise} className="mt-3 text-[15px] text-white/80">
            A fast, private finance dashboard for cash flow, GST, projects,
            subscriptions, investments and goals — all in one place.
          </motion.p>

          <motion.ul variants={container} className="mt-9 space-y-4">
            {FEATURES.map((f) => (
              <motion.li key={f.title} variants={rise} className="flex gap-3.5">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/12 ring-1 ring-white/20">
                  <f.icon className="size-[18px]" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-[13px] text-white/70">{f.desc}</p>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <motion.p variants={rise} className="relative text-xs text-white/60">
          © {new Date().getFullYear()} MoneyFlow · Built for India 🇮🇳
        </motion.p>
      </motion.aside>

      {/* ---- Sign-in panel ---- */}
      <main className="flex items-center justify-center px-5 py-10 pt-safe pb-safe">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="w-full max-w-sm"
        >
          {/* Compact brand header (mobile / tablet only) */}
          <motion.div
            variants={rise}
            className="mb-8 flex flex-col items-center text-center lg:hidden"
          >
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <Wallet className="size-6" aria-hidden="true" />
            </div>
          </motion.div>

          <motion.div variants={rise} className="text-center lg:text-left">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">
              Welcome to MoneyFlow
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground text-balance">
              Sign in to pick up your cash flow, projects and investments.
            </p>
          </motion.div>

          <motion.div variants={rise} className="mt-7">
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full gap-3 text-[0.95rem] shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
              onClick={signInWithGoogle}
              disabled={busy !== null}
            >
              {busy === "google" ? (
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              ) : (
                <GoogleIcon className="size-5" />
              )}
              {busy === "google"
                ? "Redirecting to Google…"
                : "Continue with Google"}
            </Button>
          </motion.div>

          {/* Email/password — automation/testing only (gated by env flag) */}
          {PASSWORD_AUTH ? (
            <motion.div variants={rise} className="mt-5">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>or use email</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={emailSignIn} className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={busy !== null}
                  >
                    {busy === "signin" ? (
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : null}
                    Sign in
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={emailSignUp}
                    disabled={busy !== null}
                  >
                    {busy === "signup" ? (
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : null}
                    Create account
                  </Button>
                </div>
              </form>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Email/password is enabled for automated testing.
              </p>
            </motion.div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="mt-3 text-center text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <motion.div
            variants={rise}
            className="mt-7 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"
          >
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            <span>Private by default — only you can see your data.</span>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
