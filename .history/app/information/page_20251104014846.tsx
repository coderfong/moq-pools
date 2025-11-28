"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const comboRef = useRef<HTMLDivElement | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [individualBuyer, setIndividualBuyer] = useState(false);
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [annualPurchaseVolume, setAnnualPurchaseVolume] = useState("");
  const [interestedCategories, setInterestedCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const BUSINESS_TYPES = [
    "Manufacturer",
    "Trading Company",
    "Retailer",
    "Wholesaler",
    "E-commerce Seller",
    "Distributor",
    "Other"
  ];

  const PURCHASE_VOLUMES = [
    "Less than $10,000",
    "$10,000 - $50,000",
    "$50,000 - $100,000",
    "$100,000 - $500,000",
    "$500,000 - $1,000,000",
    "Over $1,000,000"
  ];

  const CATEGORIES = [
    "Electronics",
    "Apparel & Accessories",
    "Home & Garden",
    "Sports & Entertainment",
    "Toys & Hobbies",
    "Beauty & Personal Care",
    "Automotive",
    "Industrial Equipment",
    "Food & Beverage",
    "Other"
  ];

  // Build filtered, alphabetically sorted countries based on query
  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase().replace("+", "");
    const list = (q
      ? COUNTRIES.filter((c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.dial.replace("+", "").includes(q)
        )
      : COUNTRIES
    ).slice().sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [countryQuery]);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!comboRef.current) return;
      if (e.target instanceof Node && comboRef.current.contains(e.target)) return;
      setIsCountryOpen(false);
      setCountryQuery("");
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

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
    if (!email.trim()) return "Please enter your Email Address.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Please enter a valid email address.";
    if (!mobile.trim()) return "Please enter your Mobile Number.";
    if (!isValidPhone(country.dial, mobile, country.code)) return "Enter a valid mobile number.";
    if (!individualBuyer && !businessType) return "Please select your Business Type.";
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
          email: email.trim(),
          mobile: normalizedMobile,
          jobTitle,
          businessType,
          annualPurchaseVolume,
          interestedCategories,
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
      router.push("/products");
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
          <Image src={BG_URL} alt="" fill priority className="object-cover object-left scale-90" />
        </div>

  <div className="order-2 lg:order-1 lg:col-span-5 xl:col-span-6" />

  <div className="order-1 lg:order-2 lg:col-span-7 xl:col-span-6 px-6 md:px-10 py-4 md:py-6 self-center justify-self-center w-full max-w-[640px] transform translate-x-20 md:translate-x-21">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-center bg-gradient-to-r from-white via-orange-100 to-amber-100 bg-clip-text text-transparent drop-shadow-lg">Complete registration information</h1>
            <p className="text-base text-white/90 mt-2 text-center font-medium drop-shadow">Provide the details to finish setting up your account.</p>
          </header>

          <form onSubmit={onSubmit} className="bg-gradient-to-br from-white/95 to-orange-50/90 dark:bg-gradient-to-br dark:from-gray-900/80 dark:to-gray-800/70 backdrop-blur-xl rounded-3xl border-2 border-orange-200/50 p-8 md:p-10 space-y-6 shadow-2xl">
            {/* Country/Region (Combobox) */}
            <div ref={comboRef} className="relative">
              <label htmlFor="country-combobox" className="block text-base font-semibold text-gray-900 mb-2">Country/Region<span className="text-red-600 ml-1">*</span></label>
              <input
                id="country-combobox"
                role="combobox"
                aria-expanded={isCountryOpen}
                aria-controls="country-listbox"
                aria-autocomplete="list"
                placeholder="Type to search country, code, or dial"
                className="mt-2 w-full rounded-2xl border-2 border-orange-200 bg-white px-5 py-3.5 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-sm transition-all"
                value={isCountryOpen ? countryQuery : `${country.name} (${country.dial})`}
                onFocus={() => {
                  setIsCountryOpen(true);
                  setCountryQuery("");
                  setHighlightIndex(0);
                }}
                onChange={(e) => {
                  setCountryQuery(e.target.value);
                  setIsCountryOpen(true);
                  setHighlightIndex(0);
                }}
                onKeyDown={(e) => {
                  if (!isCountryOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
                    setIsCountryOpen(true);
                    e.preventDefault();
                    return;
                  }
                  if (!isCountryOpen) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlightIndex((i) => Math.min(i + 1, Math.max(filteredCountries.length - 1, 0)));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlightIndex((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const c = filteredCountries[highlightIndex];
                    if (c) {
                      setCountry(c);
                      setIsCountryOpen(false);
                      setCountryQuery("");
                    }
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setIsCountryOpen(false);
                    setCountryQuery("");
                  }
                }}
              />
              {isCountryOpen && (
                <div
                  id="country-listbox"
                  role="listbox"
                  aria-label="Countries"
                  className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border-2 border-orange-200 bg-white shadow-xl focus:outline-none"
                >
                  {filteredCountries.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-500">No matches</div>
                  ) : (
                    filteredCountries.map((c, idx) => (
                      <div
                        key={c.code}
                        role="option"
                        aria-selected={country.code === c.code ? "true" : "false"}
                        tabIndex={-1}
                        className={`px-4 py-2 cursor-pointer text-sm flex items-center justify-between hover:bg-orange-50 ${idx === highlightIndex ? "bg-orange-100" : ""} ${country.code === c.code ? "font-semibold text-orange-600" : ""}`}
                        onMouseEnter={() => setHighlightIndex(idx)}
                        onMouseDown={(e) => {
                          // prevent input blur before click handler
                          e.preventDefault();
                        }}
                        onClick={() => {
                          setCountry(c);
                          setIsCountryOpen(false);
                          setCountryQuery("");
                        }}
                      >
                        <span>{c.name} ({c.code})</span>
                        <span className="text-gray-500">{c.dial}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Company Name + Individual toggle */}
            <div>
              <label className="block text-base font-semibold text-gray-900 mb-2">Company Name<span className="text-red-600 ml-1">*</span></label>
              <div className="mt-2 flex flex-col gap-3">
                <input
                  className="w-full rounded-2xl border-2 border-orange-200 bg-white px-5 py-3.5 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-60 disabled:bg-gray-50 shadow-sm transition-all"
                  placeholder="In English"
                  maxLength={160}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={individualBuyer}
                />
                <label className="inline-flex items-center gap-2 text-sm text-gray-800 font-medium">
                  <input 
                    type="checkbox" 
                    checked={individualBuyer} 
                    onChange={(e) => setIndividualBuyer(e.target.checked)}
                    className="w-4 h-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span>I don't have a company</span>
                </label>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-base font-semibold text-gray-900 mb-2">Full Name<span className="text-red-600 ml-1">*</span></label>
              <input
                className="mt-2 w-full rounded-2xl border-2 border-orange-200 bg-white px-5 py-3.5 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-sm transition-all"
                placeholder="In English"
                maxLength={50}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-base font-semibold text-gray-900 mb-2">Email Address<span className="text-red-600 ml-1">*</span></label>
              <input
                type="email"
                className="mt-2 w-full rounded-2xl border-2 border-orange-200 bg-white px-5 py-3.5 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-sm transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-base font-semibold text-gray-900 mb-2">Mobile Number<span className="text-red-600 ml-1">*</span></label>
              <div className="mt-2 flex">
                <span className="inline-flex items-center px-4 rounded-l-2xl border-2 border-r-0 border-orange-200 bg-orange-50/50 text-gray-700 select-none font-semibold">{country.dial}</span>
                <input title="Mobile number" placeholder="Your mobile number"
                  className="flex-1 rounded-r-2xl border-2 border-orange-200 bg-white px-5 py-3.5 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-sm transition-all"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 font-semibold bg-red-50 border-2 border-red-200 rounded-xl p-3" role="alert">
                ⚠️ {error}
              </p>
            )}

            <div className="pt-2">
              <button type="submit" disabled={submitting} className="w-full inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 text-lg font-bold hover:from-orange-600 hover:to-orange-700 disabled:opacity-60 transition-all shadow-lg hover:shadow-xl hover:shadow-orange-500/30 hover:scale-105 duration-300">
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting…
                  </>
                ) : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
