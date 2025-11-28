"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
const BG_URL = "/background.png" as const;

type CountryOption = { code: string; name: string; dial: string };

const COUNTRIES: CountryOption[] = [
  // APAC
  { code: "SG", name: "Singapore", dial: "+65" },
  { code: "MY", name: "Malaysia", dial: "+60" },
  { code: "ID", name: "Indonesia", dial: "+62" },
  { code: "PH", name: "Philippines", dial: "+63" },
  { code: "TH", name: "Thailand", dial: "+66" },
  { code: "VN", name: "Vietnam", dial: "+84" },
  { code: "CN", name: "China", dial: "+86" },
  { code: "HK", name: "Hong Kong", dial: "+852" },
  { code: "TW", name: "Taiwan", dial: "+886" },
  { code: "JP", name: "Japan", dial: "+81" },
  { code: "KR", name: "South Korea", dial: "+82" },
  { code: "AU", name: "Australia", dial: "+61" },
  { code: "NZ", name: "New Zealand", dial: "+64" },
  // Americas
  { code: "US", name: "United States", dial: "+1" },
  { code: "CA", name: "Canada", dial: "+1" },
  { code: "MX", name: "Mexico", dial: "+52" },
  { code: "BR", name: "Brazil", dial: "+55" },
  { code: "AR", name: "Argentina", dial: "+54" },
  { code: "CL", name: "Chile", dial: "+56" },
  { code: "CO", name: "Colombia", dial: "+57" },
  { code: "PE", name: "Peru", dial: "+51" },
  // Europe
  { code: "GB", name: "United Kingdom", dial: "+44" },
  { code: "IE", name: "Ireland", dial: "+353" },
  { code: "DE", name: "Germany", dial: "+49" },
  { code: "FR", name: "France", dial: "+33" },
  { code: "ES", name: "Spain", dial: "+34" },
  { code: "IT", name: "Italy", dial: "+39" },
  { code: "PT", name: "Portugal", dial: "+351" },
  { code: "NL", name: "Netherlands", dial: "+31" },
  { code: "BE", name: "Belgium", dial: "+32" },
  { code: "CH", name: "Switzerland", dial: "+41" },
  { code: "AT", name: "Austria", dial: "+43" },
  { code: "SE", name: "Sweden", dial: "+46" },
  { code: "NO", name: "Norway", dial: "+47" },
  { code: "DK", name: "Denmark", dial: "+45" },
  { code: "FI", name: "Finland", dial: "+358" },
  { code: "PL", name: "Poland", dial: "+48" },
  { code: "CZ", name: "Czechia", dial: "+420" },
  { code: "HU", name: "Hungary", dial: "+36" },
  { code: "RO", name: "Romania", dial: "+40" },
  { code: "GR", name: "Greece", dial: "+30" },
  // Middle East
  { code: "AE", name: "United Arab Emirates", dial: "+971" },
  { code: "SA", name: "Saudi Arabia", dial: "+966" },
  { code: "QA", name: "Qatar", dial: "+974" },
  { code: "KW", name: "Kuwait", dial: "+965" },
  { code: "TR", name: "Türkiye", dial: "+90" },
  // South Asia
  { code: "IN", name: "India", dial: "+91" },
  { code: "PK", name: "Pakistan", dial: "+92" },
  { code: "BD", name: "Bangladesh", dial: "+880" },
  { code: "LK", name: "Sri Lanka", dial: "+94" },
  { code: "NP", name: "Nepal", dial: "+977" },
  // Africa
  { code: "EG", name: "Egypt", dial: "+20" },
  { code: "NG", name: "Nigeria", dial: "+234" },
  { code: "KE", name: "Kenya", dial: "+254" },
  { code: "ZA", name: "South Africa", dial: "+27" },
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

  // Per-country approximate local number length rules (not exhaustive but practical)
  const PHONE_RULES: Record<string, { min: number; max: number }> = {
    SG: { min: 8, max: 8 }, US: { min: 10, max: 10 }, CA: { min: 10, max: 10 },
    GB: { min: 9, max: 10 }, IE: { min: 8, max: 9 }, DE: { min: 7, max: 13 }, FR: { min: 9, max: 9 },
    ES: { min: 9, max: 9 }, IT: { min: 9, max: 10 }, PT: { min: 9, max: 9 }, NL: { min: 9, max: 9 },
    BE: { min: 8, max: 9 }, CH: { min: 9, max: 9 }, AT: { min: 8, max: 12 }, SE: { min: 7, max: 10 },
    NO: { min: 8, max: 8 }, DK: { min: 8, max: 8 }, FI: { min: 7, max: 10 }, PL: { min: 9, max: 9 },
    CZ: { min: 9, max: 9 }, HU: { min: 9, max: 9 }, RO: { min: 9, max: 9 }, GR: { min: 10, max: 10 },
    AU: { min: 9, max: 9 }, NZ: { min: 8, max: 9 }, JP: { min: 10, max: 11 }, KR: { min: 9, max: 11 },
    CN: { min: 11, max: 11 }, HK: { min: 8, max: 8 }, TW: { min: 9, max: 10 },
    MX: { min: 10, max: 10 }, BR: { min: 10, max: 11 }, AR: { min: 10, max: 10 }, CL: { min: 9, max: 9 },
    CO: { min: 10, max: 10 }, PE: { min: 9, max: 9 },
    AE: { min: 9, max: 9 }, SA: { min: 9, max: 9 }, QA: { min: 8, max: 8 }, KW: { min: 8, max: 8 }, TR: { min: 10, max: 10 },
    IN: { min: 10, max: 10 }, PK: { min: 10, max: 10 }, BD: { min: 10, max: 10 }, LK: { min: 9, max: 9 }, NP: { min: 10, max: 10 },
    EG: { min: 10, max: 10 }, NG: { min: 10, max: 10 }, KE: { min: 9, max: 9 }, ZA: { min: 9, max: 9 },
  };

  function isValidPhone(dial: string, local: string, code: string) {
    const digits = (local || "").replace(/\D/g, "");
    const rule = PHONE_RULES[code];
    if (rule) return digits.length >= rule.min && digits.length <= rule.max;
    // Fallback sanity bounds
    return digits.length >= 6 && digits.length <= 15;
  }

  function validate() {
    if (!country) return "Please select your Country/Region.";
    if (!individualBuyer && !companyName.trim()) return "Please enter your Company Name or choose 'I don't have a company'.";
    if (!fullName.trim()) return "Please enter your Full Name.";
    if (!mobile.trim()) return "Please enter your Mobile Number.";
  if (!isValidPhone(country.dial, mobile, country.code)) return "Enter a valid mobile number.";
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
