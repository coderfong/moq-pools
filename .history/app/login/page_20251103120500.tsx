// app/login/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import bg from "./background.png";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    console.log("Login attempt:", { email, hasPassword: !!password });

    if (!email || !password) {
      setLoading(false);
      setError("Please enter your email and password.");
      return;
    }

    try {
      console.log("Sending login request...");
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      console.log("Login response:", { status: res.status, ok: res.ok, json });
      
      if (!res.ok || !json?.ok) {
        setLoading(false);
        setError(json?.reason || "Invalid email or password.");
        return;
      }
      
      // Successfully logged in
      console.log("Login successful, redirecting to /products");
      // Use window.location to do a full page reload which ensures cookies are sent
      // Add a longer delay to ensure cookie is fully set
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Always redirect to /products after successful login
      window.location.assign('/products');
    } catch (e) {
      setLoading(false);
      setError("Sign-in failed. Please try again.");
      console.error("Login error:", e);
      return;
    }
  }

  return (
    <main className="min-h-screen">
      {/* Hero background on the left, sign-in on the right */}
      <section
        className="relative w-screen min-h-[85vh] grid lg:grid-cols-12 rounded-3xl overflow-hidden"
        aria-label="Login section"
      >
        {/* Full-bleed background image */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <Image src={bg} alt="" fill priority className="object-cover object-left" />
        </div>

        {/* Left spacer column to align the form on the right */}
        <div className="order-2 lg:order-1 lg:col-span-7 xl:col-span-8" />

        {/* Right side: form (flattened, no extra column wrapper) */}
  <div className="order-1 lg:order-2 lg:col-span-5 xl:col-span-4 px-8 md:px-12 py-10 md:py-12 self-center justify-self-center w-full max-w-[520px]">
            <header className="mb-8">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-center">
                Sign in
              </h1>
              <p className="text-base text-white mt-2 text-center">
                Welcome back! Please enter your details.
              </p>
            </header>

            <form
              onSubmit={onSubmit}
              className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl border border-hairline p-8 md:p-10 space-y-6 shadow-2xl"
            >
              <div>
                <label htmlFor="email" className="block text-base font-medium text-black">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-2 w-full rounded-2xl border border-hairline bg-surface px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-base font-medium text-black">
                    Password
                  </label>
                  <Link
                    href="/forgot"
                    className="text-sm text-orange-600 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="mt-2 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="w-full rounded-2xl border border-hairline bg-surface px-4 py-3 pr-12 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 px-4 text-gray-500 hover:text-gray-700 text-xl"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center rounded-full bg-gray-900 text-white px-6 py-3 text-lg font-semibold hover:bg-black disabled:opacity-60 transition-all"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>

              <div className="flex items-center gap-4 text-sm text-muted">
                <span>Or continue with</span>
                <div className="h-px bg-hairline grow" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <SocialBtn label="Google" onClick={() => {}} img="/company-logos/google%20logo.jpg" />
                <SocialBtn label="Facebook" onClick={() => {}} img="/company-logos/Facebook-Logo-JPG.jpg" />
                <SocialBtn label="X" onClick={() => {}} img="/company-logos/Twitter.png" />
              </div>

              <p className="text-xs text-muted">
                By continuing you agree to our{" "}
                <Link href="/terms" className="underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </form>

            <p className="text-base mt-6 text-center">
              New to MOQ Pools?{" "}
              <Link
                href="/register"
                className="text-orange-600 font-semibold hover:underline"
              >
                Create an account
              </Link>
            </p>
        </div>

      </section>
    </main>
  );
}

function SocialBtn({
  label,
  img,
  onClick,
}: {
  label: string;
  img: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-full h-10 rounded-full border border-hairline bg-surface hover:bg-gray-50 flex items-center justify-center gap-2"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt="" className="w-5 h-5 object-contain" />
      <span className="text-sm">{label}</span>
    </button>
  );
}
