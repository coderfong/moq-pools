"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
const BG_URL = "/background.png" as const;

type CountryOption = { code: string; name: string; dial: string };

const COUNTRIES: CountryOption[] = [
  { code: "SG", name: "Singapore", dial: "+65" },
  { code: "US", name: "United States", dial: "+1" },
  { code: "IN", name: "India", dial: "+91" },
  { code: "GB", name: "United Kingdom", dial: "+44" },
  { code: "AU", name: "Australia", dial: "+61" },
  { code: "CN", name: "China", dial: "+86" },
];

export default function InformationPage() {
  const router = useRouter();
  const [country, setCountry] = useState<CountryOption>(COUNTRIES[0]);
  const [companyName, setCompanyName] = useState("");
  const [individualBuyer, setIndividualBuyer] = useState(false);
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function isValidPhone(dial: string, local: string) {
    const digits = (local || "").replace(/\D/g, "");
    // Basic sanity: 6-15 digits local part, will be combined with a +CC prefix
    return digits.length >= 6 && digits.length <= 15;
  }

  function validate() {
    if (!country) return "Please select your Country/Region.";
    if (!individualBuyer && !companyName.trim()) return "Please enter your Company Name or choose 'I don't have a company'.";
    if (!fullName.trim()) return "Please enter your Full Name.";
    if (!mobile.trim()) return "Please enter your Mobile Number.";
    if (!isValidPhone(country.dial, mobile)) return "Enter a valid mobile number.";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const msg = validate();
    if (msg) { setError(msg); return; }
    setSubmitting(true);
    try {
      // Normalize phone to an E.164-like string (e.g., +6591234567)
      const mobileDigits = mobile.replace(/\D/g, "");
      const normalizedMobile = `${country.dial}${mobileDigits}`;

      const res = await fetch("/api/register/information", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          countryCode: country.code,
          companyName,
          individualBuyer,
          fullName,
          mobile: normalizedMobile,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        const reason = json?.reason || "unknown";
        setError(
          reason === "unauthorized"
            ? "Please sign in again."
            : reason === "invalid_mobile"
            ? "Enter a valid mobile number."
            : "Failed to submit information."
        );
        return;
      }
      router.push("/account");
    } catch (err) {
      setError("Failed to submit information. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen">
  <section className="relative w-screen min-h-[92vh] grid lg:grid-cols-12 overflow-hidden" aria-label="Complete registration information section">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <Image src={BG_URL} alt="" fill priority className="object-contain object-left origin-left scale-[1.2] md:scale-[1.24]" />
        </div>

  <div className="order-2 lg:order-1 lg:col-span-5 xl:col-span-6" />

  <div className="order-1 lg:order-2 lg:col-span-7 xl:col-span-6 px-6 md:px-10 py-4 md:py-6 self-center justify-self-center w-full max-w-[640px] transform translate-x-20 md:translate-x-21">
          <header className="mb-6 text-center">
            <h1 className="text-3xl md:text-4xl font-display font-bold">Complete registration information</h1>
            <p className="text-sm md:text-base text-white mt-2">Provide the details to finish setting up your account.</p>
          </header>

          <form onSubmit={onSubmit} className="bg-white/85 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl border border-hairline p-6 md:p-8 space-y-6 shadow-2xl">
            {/* Country/Region */}
            <div>
              <label htmlFor="country" className="block text-base font-medium text-black">Country/Region<span className="text-red-600">*</span></label>
              <select id="country" title="Country/Region"
                className="mt-2 w-full rounded-2xl border border-hairline bg-surface px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={country.code}
                onChange={(e) => {
                  const c = COUNTRIES.find((x) => x.code === e.target.value) || COUNTRIES[0];
                  setCountry(c);
                }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Company Name + Individual toggle */}
            <div>
              <label className="block text-base font-medium text-black">Company Name<span className="text-red-600">*</span></label>
              <div className="mt-2 flex flex-col gap-3">
                <input
                  className="w-full rounded-2xl border border-hairline bg-surface px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                  placeholder="In English"
                  maxLength={160}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={individualBuyer}
                />
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={individualBuyer} onChange={(e) => setIndividualBuyer(e.target.checked)} />
                  <span>I don't have a company</span>
                </label>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-base font-medium text-black">Full Name<span className="text-red-600">*</span></label>
              <input
                className="mt-2 w-full rounded-2xl border border-hairline bg-surface px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="In English"
                maxLength={50}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-base font-medium text-black">Mobile Number<span className="text-red-600">*</span></label>
              <div className="mt-2 flex">
                <span className="inline-flex items-center px-3 rounded-l-2xl border border-r-0 border-hairline bg-gray-50 text-gray-600 select-none">{country.dial}</span>
                <input title="Mobile number" placeholder="Your mobile number"
                  className="flex-1 rounded-r-2xl border border-hairline bg-surface px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

            <div className="pt-2">
              <button type="submit" disabled={submitting} className="w-full inline-flex items-center justify-center rounded-full bg-gray-900 text-white px-7 py-3.5 text-lg font-semibold hover:bg-black disabled:opacity-60 transition-all">
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
