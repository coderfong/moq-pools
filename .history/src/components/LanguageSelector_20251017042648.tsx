"use client";
import { useEffect, useState } from "react";

type LangOption = { code: string; label: string };

const LANGUAGES: LangOption[] = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文 (简体)" },
  { code: "es", label: "Español" },
  { code: "hi", label: "हिन्दी" },
];

export default function LanguageSelector() {
  const [lang, setLang] = useState<string>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("lang");
      const initial = stored || document.documentElement.getAttribute("lang") || "en";
      setLang(initial);
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    try {
      document.documentElement.setAttribute("lang", lang);
      localStorage.setItem("lang", lang);
      // announce to app if needed
      window.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
    } catch {
      // noop
    }
  }, [lang]);

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="site-language" className="sr-only">Language</label>
      <select
        id="site-language"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="min-w-[160px] appearance-none rounded-full border border-gray-300 bg-white/80 dark:bg-gray-900/70 px-4 py-2 text-sm md:text-base text-gray-900 dark:text-white hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        {LANGUAGES.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
