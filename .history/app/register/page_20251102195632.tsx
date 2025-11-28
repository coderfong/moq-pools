"use client";

import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
// Use public asset for background
const BG_URL = "/background.png" as const;
import { useState, useRef, useEffect } from "react";

declare global {
  interface Window {
    turnstile?: any;
  }
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [turnstileRendered, setTurnstileRendered] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [codeDigits, setCodeDigits] = useState<string[]>(["", "", "", ""]);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyToken, setVerifyToken] = useState<string>("");
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Robust render: attempt rendering when script or ref becomes available; retry briefly if needed
  useEffect(() => {
    if (!siteKey || !widgetRef.current || turnstileRendered) return;
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
      attempts += 1;
      if (window.turnstile && widgetRef.current && !turnstileRendered) {
        try {
          window.turnstile.render(widgetRef.current, {
            sitekey: siteKey,
            callback: (token: string) => setTurnstileToken(token),
            theme: "auto",
            size: "flexible",
          });
          setTurnstileRendered(true);
          clearInterval(interval);
        } catch {}
      }
      if (attempts >= maxAttempts) clearInterval(interval);
    }, 250);
    return () => clearInterval(interval);
  }, [siteKey, turnstileRendered]);

  // Resend countdown tick
  useEffect(() => {
    if (!showVerifyModal || resendSeconds <= 0) return;
    const id = setTimeout(() => setResendSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearTimeout(id);
  }, [showVerifyModal, resendSeconds]);

  function validateBasics() {
    const emailVal = email.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
    if (!emailVal || !password) {
      setError("Please enter your email and password.");
      return false;
    }
    if (!emailOk) {
      setError("Enter a valid email address.");
      return false;
    }
    if (!agreed) {
      setError("Please agree to the Terms and Privacy Policy.");
      return false;
    }
    if (siteKey && !turnstileToken) {
      setError("Please complete the verification.");
      return false;
    }
    setError(null);
    return true;
  }

  function openVerifyModal(e?: React.FormEvent<HTMLFormElement>) {
    if (e) e.preventDefault();
    if (!validateBasics()) return;
    setCodeDigits(["", "", "", ""]);
    setShowVerifyModal(true);
    // Kick off sending the code and start timer
    void sendVerificationCode();
    setResendSeconds(10);
  }

  async function performRegister() {
    if (!validateBasics()) return;
    const code = codeDigits.join("");
    if (code.length < 4) {
      setError("Please enter the 4-digit code we emailed you.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, token: turnstileToken }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        let msg = "Registration failed. Please try again.";
        switch (json?.reason) {
          case "missing_email": msg = "Please enter your email."; break;
          case "invalid_email": msg = "Enter a valid email address."; break;
          case "missing_password": msg = "Please enter your password."; break;
          case "missing_token": msg = "Please complete the verification."; break;
          case "email_in_use": msg = "An account already exists for this email. Try signing in."; break;
          case "verification_failed": {
            const first = Array.isArray(json?.errors) && json.errors.length ? String(json.errors[0]) : "";
            if (first.includes("timeout-or-duplicate")) msg = "Verification token expired or already used. Please click the box again and submit promptly.";
            else if (first.includes("invalid-input-response")) msg = "Verification token invalid. Please retry the challenge.";
            else if (first.includes("invalid-input-secret")) msg = "Server secret invalid. Please check TURNSTILE_SECRET_KEY.";
            else if (first.includes("hostname-mismatch")) msg = "Hostname mismatch. Add 'localhost' and '127.0.0.1' in your widget settings.";
            else msg = "Verification failed. Please retry the challenge.";
            break;
          }
        }
        setError(msg);
        setLoading(false);
        return;
      }
    } catch (e) {
      setError("Registration error. Please try again.");
      setLoading(false);
      return;
    }
  setLoading(false);
  window.location.href = "/information";
  }

  async function sendVerificationCode() {
    try {
      setSendingCode(true);
      const res = await fetch("/api/register/send-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();
      if (json?.ok) {
        if (json?.token) setVerifyToken(String(json.token));
        // If dev mode, we may receive the code for convenience
        if (json?.dev && json?.code) {
          // eslint-disable-next-line no-console
          console.info("[dev] verification code:", json.code);
        }
      } else {
        setError(
          json?.reason === "smtp_config_invalid"
            ? "Email service is misconfigured. Please try again later."
            : json?.reason === "missing_email"
            ? "Enter a valid email address."
            : "Failed to send verification email."
        );
      }
    } catch (err) {
      // best-effort; UI still shows modal and allows retry
      setError("Failed to send verification email.");
    } finally {
      setSendingCode(false);
    }
  }

  return (
    <main className="min-h-screen">
      {/* Cloudflare Turnstile script for widget rendering (explicit) */}
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      {/* Hero background on the left, form on the right */}
      <section
        className="relative w-screen min-h-[92vh] grid lg:grid-cols-12 overflow-hidden"
        aria-label="Register section"
      >
        {/* Full-bleed background image */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <Image src={BG_URL} alt="" fill priority className="object-contain object-left origin-left scale-[1.18] md:scale-[1.22]" />
        </div>

        {/* Left spacer column to align the form on the right */}
  <div className="order-2 lg:order-1 lg:col-span-6 xl:col-span-7" />

        {/* Right side: form */}
  <div className="order-1 lg:order-2 lg:col-span-6 xl:col-span-5 px-8 md:px-12 py-4 md:py-6 self-center justify-self-center w-full max-w-[520px] transform translate-x-2 md:translate-x-3">
          <header className="mb-6">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-center">Create account</h1>
            <p className="text-base text-white mt-2 text-center">Join MOQ Pools. Please enter your details.</p>
          </header>

          <form
            onSubmit={openVerifyModal}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-base font-medium text-black">
                  Password
                </label>
                <Link href="/forgot" className="text-sm text-orange-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="mt-2 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="w-full rounded-2xl border border-hairline bg-surface px-4 py-3 pr-12 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            {/* Agreement checkbox */}
            <div className="ft-form-item-control">
              <div className="ft-form-item-input">
                <label className="ft-checkbox inline-flex items-start gap-2">
                  <input
                    className="mt-1"
                    type="checkbox"
                    name="agreement"
                    required
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <span className="ft-checkbox-front mt-1">
                    <span className="ft-checkbox-front-tick" />
                  </span>
                  <span className="ft-checkbox-label text-sm text-gray-700">
                    <span>
                      I agree to the{' '}
                      <a href="https://www.made-in-china.com/help/terms/" target="_blank" rel="noopener noreferrer" ads-data="st:181">User Agreement</a>
                      {' '}and the{' '}
                      <a href="https://www.made-in-china.com/help/policy/" target="_blank" rel="noopener noreferrer" ads-data="st:251">Privacy Policy</a>.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* Cloudflare Turnstile placeholder (hidden input) */}
            <div className="turnstile space-y-2">
              {/* Visible widget container (renders if NEXT_PUBLIC_TURNSTILE_SITE_KEY is set) */}
              {siteKey ? (
                <div
                  ref={widgetRef}
                  id="cf-turnstile-container"
                  className="mt-1 w-full min-h-[58px]"
                />
              ) : (
                <div className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                  Verification is not configured. Set NEXT_PUBLIC_TURNSTILE_SITE_KEY in your .env and restart the dev server.
                </div>
              )}
              <div>
                <input type="hidden" name="cf-turnstile-response" id="cf-chl-widget-response" value={turnstileToken} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => openVerifyModal()}
              disabled={loading || !agreed || (siteKey ? !turnstileToken : false)}
              className="w-full inline-flex items-center justify-center rounded-full bg-gray-900 text-white px-6 py-3 text-lg font-semibold hover:bg-black disabled:opacity-60 transition-all"
            >
              Verify email
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
            Already have an account?{" "}
            <Link href="/login" className="text-orange-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowVerifyModal(false)} />
          <div className="relative z-10 w-[94vw] max-w-xl rounded-2xl bg-white shadow-2xl border border-hairline overflow-hidden">
            <div className="px-6 py-5 border-b border-hairline flex items-center justify-between">
              <div className="text-xl font-semibold">Verify your email</div>
              <button className="text-gray-500 hover:text-gray-800" onClick={() => setShowVerifyModal(false)} aria-label="Close">✕</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="text-base text-gray-700">
                A verification code has been sent to your email <b>{email || "your email"}</b>.
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  {codeDigits.map((d, i) => (
                    <input
                      key={i}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      aria-label={`Verification code digit ${i + 1}`}
                      title={`Verification code digit ${i + 1}`}
                      placeholder="•"
                      className="w-14 h-14 text-center text-xl rounded-lg border border-hairline focus:outline-none focus:ring-2 focus:ring-orange-500"
                      value={d}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, "");
                        const next = [...codeDigits];
                        next[i] = v.slice(-1);
                        setCodeDigits(next);
                      }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  disabled={resendSeconds > 0 || sendingCode}
                  className="text-sm text-orange-600 disabled:text-gray-400"
                  onClick={async () => { await sendVerificationCode(); setResendSeconds(10); }}
                >
                  {resendSeconds > 0 ? `Resend (${resendSeconds}s)` : "Resend"}
                </button>
              </div>
              {error && (
                <p className="text-sm text-red-600" role="alert">{error}</p>
              )}
              <button
                type="button"
                onClick={performRegister}
                disabled={loading}
                className="w-full inline-flex items-center justify-center rounded-full bg-gray-900 text-white px-7 py-3.5 text-lg font-semibold hover:bg-black disabled:opacity-60 transition-all"
              >
                {loading ? "Submitting…" : "Next"}
              </button>
              <div className="text-xs text-gray-500 space-y-1">
                <div>* Please check your spam folder.</div>
                <div>* Verify and edit your email address if necessary.</div>
                <div>* Ask your email provider about potential blocks.</div>
                <div>* Need Help? <a href="#" className="underline">Click here</a>.</div>
              </div>
            </div>
          </div>
        </div>
      )}
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
