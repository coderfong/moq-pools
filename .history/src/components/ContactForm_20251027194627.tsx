"use client";
import React, { useEffect, useId, useRef, useState } from "react";

type SubjectOption =
  | "General Inquiry"
  | "Order Help"
  | "Shipping Issue"
  | "Supplier Partnership"
  | "Other";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [subject, setSubject] = useState<SubjectOption>("General Inquiry");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });
  const [agree, setAgree] = useState(true);
  const honeypotName = useId();
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (submit.status === "success") {
      // Reset form fields after a short pause to show message
      const t = setTimeout(() => {
        formRef.current?.reset();
        setName("");
        setEmail("");
        setOrderId("");
        setSubject("General Inquiry");
        setMessage("");
        setFile(null);
        setSubmit({ status: "idle" });
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [submit]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submit.status === "submitting") return;
    // Simple validation
    if (!name.trim() || !email.trim() || !message.trim()) {
      setSubmit({ status: "error", message: "Please fill in your name, email, and message." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSubmit({ status: "error", message: "Please enter a valid email address." });
      return;
    }
    if (!agree) {
      setSubmit({ status: "error", message: "Please accept the privacy notice to continue." });
      return;
    }
    try {
      setSubmit({ status: "submitting" });
      const fd = new FormData();
      fd.set("name", name);
      fd.set("email", email);
      if (orderId) fd.set("orderId", orderId);
      fd.set("subject", subject);
      fd.set("message", message);
      // Honeypot: must be empty; field name randomized per render to bypass simple bots
      fd.set(honeypotName, "");
      if (file) fd.set("file", file);

      const res = await fetch("/api/contact", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to submit. Please try again.");
      }
      setSubmit({ status: "success", message: "Thanks for reaching out! Our team will get back to you within 24 hours." });
    } catch (err: any) {
      setSubmit({ status: "error", message: err?.message || "Submission failed. Please try again later." });
    }
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      {/* Honeypot field (hidden from users) */}
      <div className="hidden" aria-hidden>
        <label className="block text-sm">Company</label>
        <input name={honeypotName} type="text" autoComplete="off" className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className="block text-sm font-medium text-neutral-800">Name</label>
          <input
            id="cf-name"
            name="name"
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
            required
          />
        </div>
        <div>
          <label htmlFor="cf-email" className="block text-sm font-medium text-neutral-800">Email</label>
          <input
            id="cf-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
            required
          />
        </div>
        <div>
          <label htmlFor="cf-order" className="block text-sm font-medium text-neutral-800">Order ID (optional)</label>
          <input
            id="cf-order"
            name="orderId"
            type="text"
            placeholder="ORD-10293"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="cf-subject" className="block text-sm font-medium text-neutral-800">Subject</label>
          <select
            id="cf-subject"
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value as SubjectOption)}
            className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          >
            {["General Inquiry","Order Help","Shipping Issue","Supplier Partnership","Other"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="cf-message" className="block text-sm font-medium text-neutral-800">Message</label>
        <textarea
          id="cf-message"
          name="message"
          placeholder="Tell us what's happening…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          required
        />
      </div>

      <div>
        <label htmlFor="cf-file" className="block text-sm font-medium text-neutral-800">File upload (optional)</label>
        <input
          id="cf-file"
          name="file"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-neutral-800"
          aria-describedby="cf-file-help"
        />
        <div id="cf-file-help" className="mt-1 text-xs text-neutral-500">Attach images for damaged items or screenshots if helpful. Max ~5MB recommended.</div>
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-600">
        <input id="cf-privacy" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-4 w-4 rounded border-neutral-300" />
        <label htmlFor="cf-privacy">I agree to the processing of my information per the <a className="underline" href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</label>
      </div>

      {submit.status === "error" && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {submit.message}
        </div>
      )}
      {submit.status === "success" && (
        <div role="status" className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {submit.message}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submit.status === "submitting"}
          className="inline-flex items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {submit.status === "submitting" ? "Sending…" : "Send message"}
        </button>
        <span className="text-xs text-neutral-600">Replies within 24 hours (Mon–Fri, 9 AM–6 PM SGT)</span>
      </div>
    </form>
  );
}
