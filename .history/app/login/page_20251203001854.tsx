// app/login/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import bg from "./background.png";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

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
        className="relative w-screen min-h-screen grid lg:grid-cols-12 rounded-3xl overflow-hidden"
        aria-label="Login section"
      >
        {/* Full-bleed background image */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <Image src={bg} alt="" fill priority className="object-cover object-left scale-90" />
        </div>

        {/* Left spacer column to align the form on the right */}
        <div className="order-2 lg:order-1 lg:col-span-6 xl:col-span-7" />

        {/* Right side: form (flattened, no extra column wrapper) */}
  <div className="order-1 lg:order-2 lg:col-span-6 xl:col-span-5 px-4 sm:px-8 md:px-12 py-6 sm:py-10 md:py-12 self-center justify-self-center w-full max-w-[520px]">
            <header className="mb-6 sm:mb-10">
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-display font-bold text-center bg-gradient-to-r from-white via-orange-100 to-amber-100 bg-clip-text text-transparent drop-shadow-lg">
                Sign in
              </h1>
              <p className="text-sm sm:text-lg text-white/90 mt-2 sm:mt-3 text-center font-medium drop-shadow">
                Welcome back! Please enter your details.
              </p>
            </header>

            <form
              onSubmit={onSubmit}
              className="bg-gradient-to-br from-white/95 to-orange-50/90 dark:bg-gradient-to-br dark:from-gray-900/80 dark:to-gray-800/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl border-2 border-orange-200/50 p-5 sm:p-8 md:p-10 space-y-4 sm:space-y-6 shadow-2xl"
            >
              <div>
                <label htmlFor="email" className="block text-sm sm:text-base font-semibold text-gray-900 mb-1 sm:mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1 sm:mt-2 w-full rounded-xl sm:rounded-2xl border-2 border-orange-200 bg-white px-3 sm:px-5 py-2.5 sm:py-3.5 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-sm transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <label htmlFor="password" className="block text-sm sm:text-base font-semibold text-gray-900">
                    Password
                  </label>
                  <Link
                    href="/forgot"
                    className="text-xs sm:text-sm text-orange-600 hover:text-orange-700 font-semibold hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="mt-1 sm:mt-2 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="w-full rounded-xl sm:rounded-2xl border-2 border-orange-200 bg-white px-3 sm:px-5 py-2.5 sm:py-3.5 pr-12 sm:pr-14 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-sm transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 px-3 sm:px-4 text-gray-600 hover:text-orange-600 text-xl sm:text-2xl transition-colors"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs sm:text-sm text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg sm:rounded-xl p-2 sm:p-3" role="alert">
                  ⚠️ {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg font-bold hover:from-orange-600 hover:to-orange-700 disabled:opacity-60 transition-all shadow-lg hover:shadow-xl hover:shadow-orange-500/30 hover:scale-105 duration-300"
              >
                {loading ? "🔄 Signing in…" : "Sign in"}
              </button>

              <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 font-medium">
                <span>Or continue with</span>
                <div className="h-px bg-orange-200 grow" />
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <SocialBtn label="Google" onClick={() => signIn('google', { callbackUrl: '/products' })} img="/company-logos/google%20logo.jpg" />
                <SocialBtn label="Facebook" onClick={() => signIn('facebook', { callbackUrl: '/products' })} img="/company-logos/Facebook-Logo-JPG.jpg" />
                <SocialBtn label="X" onClick={() => signIn('twitter', { callbackUrl: '/products' })} img="/company-logos/Twitter.png" />
              </div>

              <p className="text-[10px] sm:text-xs text-gray-600 font-medium text-center">
                By continuing you agree to our{" "}
                <Link href="/terms" className="underline hover:text-orange-600">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline hover:text-orange-600">
                  Privacy Policy
                </Link>
                .
              </p>
            </form>

            <p className="text-sm sm:text-lg mt-4 sm:mt-8 text-center text-white drop-shadow">
              New to MOQ Pools?{" "}
              <Link
                href="/register"
                className="text-orange-400 font-bold hover:text-orange-300 hover:underline"
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
      className="w-full h-12 rounded-full border-2 border-orange-200 bg-white hover:bg-orange-50 hover:border-orange-300 flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt="" className="w-5 h-5 object-contain" />
      <span className="text-sm font-semibold text-gray-800">{label}</span>
    </button>
  );
}
