"use client";

import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
// Use public asset for background
const BG_URL = "/background.png" as const;
import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";

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
        body: JSON.stringify({ 
          email: email.trim(), 
          password, 
          token: turnstileToken,
          verificationCode: code,
          verifyToken 
        }),
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
          case "invalid_verification_code": msg = "Invalid or expired verification code. Please request a new code."; break;
          case "missing_verification_code": msg = "Please enter the verification code."; break;
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
        className="relative w-screen min-h-screen grid lg:grid-cols-12 overflow-hidden"
        aria-label="Register section"
      >
        {/* Full-bleed background image */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <Image src={BG_URL} alt="" fill priority className="object-cover object-left scale-90" />
        </div>

        {/* Left spacer column to align the form on the right */}
  <div className="order-2 lg:order-1 lg:col-span-7 xl:col-span-8" />

        {/* Right side: form */}
  <div className="order-1 lg:order-2 lg:col-span-5 xl:col-span-4 px-3 sm:px-8 md:px-12 py-2 sm:py-4 md:py-6 self-center justify-self-center w-full max-w-[520px] transform translate-x-2 md:translate-x-3">
          <header className="mb-3 sm:mb-8">
            <h1 className="text-xl sm:text-3xl md:text-4xl font-display font-bold text-center bg-gradient-to-r from-white via-orange-100 to-amber-100 bg-clip-text text-transparent drop-shadow-lg">Create account</h1>
            <p className="text-xs sm:text-base text-white/90 mt-1 sm:mt-2 text-center font-medium drop-shadow">Join MOQ Pools. Please enter your details.</p>
          </header>

          <form
            onSubmit={openVerifyModal}
            className="bg-gradient-to-br from-white/95 to-orange-50/90 dark:bg-gradient-to-br dark:from-gray-900/80 dark:to-gray-800/70 backdrop-blur-xl rounded-xl sm:rounded-3xl border-2 border-orange-200/50 p-3 sm:p-8 md:p-10 space-y-2 sm:space-y-5 shadow-2xl"
          >
            <div>
              <label htmlFor="email" className="block text-xs sm:text-base font-semibold text-gray-900 mb-0.5 sm:mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-0.5 sm:mt-2 w-full rounded-lg sm:rounded-2xl border-2 border-orange-200 bg-white px-2 sm:px-5 py-1.5 sm:py-3.5 text-sm sm:text-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-sm transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5 sm:mb-2">
                <label htmlFor="password" className="block text-xs sm:text-base font-semibold text-gray-900">
                  Password
                </label>
                <Link href="/forgot" className="text-[10px] sm:text-sm text-orange-600 hover:text-orange-700 font-semibold hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="mt-0.5 sm:mt-2 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="w-full rounded-lg sm:rounded-2xl border-2 border-orange-200 bg-white px-2 sm:px-5 py-1.5 sm:py-3.5 pr-8 sm:pr-14 text-sm sm:text-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-sm transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-2 sm:px-4 text-gray-600 hover:text-orange-600 text-base sm:text-2xl transition-colors"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-[10px] sm:text-sm text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg sm:rounded-xl p-1.5 sm:p-3" role="alert">
                ⚠️ {error}
              </p>
            )}

            {/* Agreement checkbox */}
            <div className="ft-form-item-control">
              <div className="ft-form-item-input">
                <label className="ft-checkbox inline-flex items-start gap-1 sm:gap-2">
                  <input
                    className="mt-0.5 sm:mt-1 w-3 sm:w-4 h-3 sm:h-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                    type="checkbox"
                    name="agreement"
                    required
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <span className="ft-checkbox-front mt-0.5 sm:mt-1">
                    <span className="ft-checkbox-front-tick" />
                  </span>
                  <span className="ft-checkbox-label text-[10px] sm:text-sm text-gray-800 font-medium">
                    <span>
                      I agree to the{' '}
                      <a href="https://www.made-in-china.com/help/terms/" target="_blank" rel="noopener noreferrer" ads-data="st:181" className="text-orange-600 hover:text-orange-700 underline">User Agreement</a>
                      {' '}and the{' '}
                      <a href="https://www.made-in-china.com/help/policy/" target="_blank" rel="noopener noreferrer" ads-data="st:251" className="text-orange-600 hover:text-orange-700 underline">Privacy Policy</a>.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* Cloudflare Turnstile placeholder (hidden input) */}
            <div className="turnstile space-y-1 sm:space-y-2">
              {/* Visible widget container (renders if NEXT_PUBLIC_TURNSTILE_SITE_KEY is set) */}
              {siteKey ? (
                <div
                  ref={widgetRef}
                  id="cf-turnstile-container"
                  className="mt-0.5 sm:mt-1 w-full min-h-[58px]"
                />
              ) : (
                <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-amber-800 font-semibold bg-amber-50 border-2 border-amber-300 rounded-lg sm:rounded-xl p-2 sm:p-3">
                  ⚠️ Verification is not configured. Set NEXT_PUBLIC_TURNSTILE_SITE_KEY in your .env and restart the dev server.
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
              className="w-full inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 sm:px-6 py-2 sm:py-4 text-sm sm:text-lg font-bold hover:from-orange-600 hover:to-orange-700 disabled:opacity-60 transition-all shadow-lg hover:shadow-xl hover:shadow-orange-500/30 hover:scale-105 duration-300"
            >
              {loading ? "🔄 Verifying…" : "Verify email"}
            </button>

            <div className="flex items-center gap-1.5 sm:gap-4 text-[10px] sm:text-sm text-gray-600 font-medium">
              <span>Or continue with</span>
              <div className="h-px bg-orange-200 grow" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
              <SocialBtn label="Google" onClick={() => signIn('google', { callbackUrl: '/products' })} img="/company-logos/google%20logo.jpg" />
              <SocialBtn label="Facebook" onClick={() => signIn('facebook', { callbackUrl: '/products' })} img="/company-logos/Facebook-Logo-JPG.jpg" />
              <SocialBtn label="X" onClick={() => signIn('twitter', { callbackUrl: '/products' })} img="/company-logos/Twitter.png" />
            </div>

            <p className="text-[9px] sm:text-xs text-gray-600 font-medium text-center">
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

          <p className="text-xs sm:text-lg mt-2 sm:mt-8 text-center text-white drop-shadow">
            Already have an account?{" "}
            <Link href="/login" className="text-orange-400 font-bold hover:text-orange-300 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 to-orange-900/40" onClick={() => setShowVerifyModal(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-3xl bg-gradient-to-br from-white to-orange-50/30 shadow-2xl border-2 border-orange-200/50 overflow-hidden transform transition-all">
            <div className="px-8 py-6 border-b-2 border-orange-100/50 bg-gradient-to-r from-orange-50 to-amber-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl">✉️</span>
                </div>
                <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">Verify your email</div>
              </div>
              <button className="text-gray-400 hover:text-gray-700 hover:bg-orange-100 w-10 h-10 rounded-full transition-all duration-200 hover:rotate-90" onClick={() => setShowVerifyModal(false)} aria-label="Close">
                <span className="text-2xl font-light">✕</span>
              </button>
            </div>
            <div className="p-8 space-y-8">
              <div className="text-center">
                <p className="text-lg text-gray-700 mb-2">We've sent a verification code to</p>
                <p className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">{email || "your email"}</p>
              </div>
              
              <div className="space-y-6">
                <div className="flex gap-4 justify-center">
                  {codeDigits.map((d, i) => (
                    <input
                      key={i}
                      id={`code-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      aria-label={`Verification code digit ${i + 1}`}
                      title={`Verification code digit ${i + 1}`}
                      placeholder="•"
                      className="w-16 h-16 text-center text-2xl font-bold rounded-2xl border-2 border-orange-200 bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/30 focus:border-orange-500 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                      value={d}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, "");
                        const next = [...codeDigits];
                        next[i] = v.slice(-1);
                        setCodeDigits(next);
                        
                        // Auto-focus next input
                        if (v && i < 3) {
                          const nextInput = document.getElementById(`code-${i + 1}`);
                          nextInput?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        // Handle backspace to go to previous input
                        if (e.key === 'Backspace' && !codeDigits[i] && i > 0) {
                          const prevInput = document.getElementById(`code-${i - 1}`);
                          prevInput?.focus();
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4);
                        if (pastedData.length === 4) {
                          setCodeDigits(pastedData.split(''));
                          const lastInput = document.getElementById(`code-3`);
                          lastInput?.focus();
                        }
                      }}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="text-gray-600">Didn't receive the code?</span>
                  <button
                    type="button"
                    disabled={resendSeconds > 0 || sendingCode}
                    className="font-semibold text-orange-600 hover:text-orange-700 disabled:text-gray-400 hover:underline transition-colors"
                    onClick={async () => { await sendVerificationCode(); setResendSeconds(10); }}
                  >
                    {sendingCode ? "Sending..." : resendSeconds > 0 ? `Resend (${resendSeconds}s)` : "Resend code"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-200">
                  <p className="text-sm text-red-700 font-semibold flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    {error}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={performRegister}
                disabled={loading || codeDigits.join('').length < 4}
                className="w-full inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 text-lg font-bold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:shadow-orange-500/30 hover:scale-105 duration-300"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </button>

              <div className="bg-orange-50/50 rounded-2xl p-4 space-y-2 border border-orange-100">
                <p className="text-xs font-semibold text-orange-900 mb-2">💡 Helpful tips:</p>
                <div className="text-xs text-gray-600 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    <span>Check your spam/junk folder if you don't see the email</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    <span>Make sure <b>{email}</b> is correct</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    <span>Code expires in 10 minutes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    <span>Need help? <a href="/support" className="text-orange-600 hover:text-orange-700 underline font-semibold">Contact support</a></span>
                  </div>
                </div>
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
      className="w-full h-8 sm:h-12 rounded-full border-2 border-orange-200 bg-white hover:bg-orange-50 hover:border-orange-300 flex items-center justify-center gap-0.5 sm:gap-2 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt="" className="w-3 sm:w-5 h-3 sm:h-5 object-contain" />
      <span className="text-[10px] sm:text-sm font-semibold text-gray-800">{label}</span>
    </button>
  );
}
