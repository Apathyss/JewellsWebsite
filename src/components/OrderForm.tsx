"use client";

import { FormEvent, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/Button";
import { Field, TextArea } from "@/components/Field";

type RequestType = "booking" | "past-images";

export function OrderForm() {
  const [requestType, setRequestType] = useState<RequestType>("booking");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sessionType, setSessionType] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isPastImageRequest = requestType === "past-images";

  useEffect(() => {
    function syncRequestTypeFromHash() {
      if (window.location.hash === "#past-session-images") setRequestType("past-images");
      if (window.location.hash === "#contact") setRequestType("booking");
    }

    syncRequestTypeFromHash();
    window.addEventListener("hashchange", syncRequestTypeFromHash);
    return () => window.removeEventListener("hashchange", syncRequestTypeFromHash);
  }, []);

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          sessionType: isPastImageRequest ? "Past session image request" : sessionType,
          preferredDate: isPastImageRequest ? null : preferredDate || null,
          location: isPastImageRequest ? "" : location,
          message
        })
      });

      const payload = await response.json();
      setSubmitting(false);

      if (!response.ok) {
        setNotice(payload.error || "Could not send your request. Please try again.");
        return;
      }
    } catch (error) {
      setSubmitting(false);
      setNotice(error instanceof Error ? error.message : "Could not send your request. Please try again.");
      return;
    }

    setRequestType("booking");
    setName("");
    setEmail("");
    setPhone("");
    setSessionType("");
    setPreferredDate("");
    setLocation("");
    setMessage("");
    setNotice("Thanks! Your request was sent and I will follow up soon.");
  }

  return (
    <form id="past-session-images" onSubmit={submitOrder} className="grid gap-4 rounded-lg bg-white p-5 text-ink">
      <div className="grid gap-2">
        <p className="text-sm font-medium text-ink">What can I help with?</p>
        <div className="grid gap-2 rounded-md bg-[#fff7f4] p-1 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setRequestType("booking")}
            className={`rounded-md px-4 py-3 text-sm font-semibold transition ${
              requestType === "booking"
                ? "bg-white text-[#844865] shadow-sm"
                : "text-[#52616b] hover:bg-white/65"
            }`}
          >
            Book a new session
          </button>
          <button
            type="button"
            onClick={() => setRequestType("past-images")}
            className={`rounded-md px-4 py-3 text-sm font-semibold transition ${
              isPastImageRequest ? "bg-white text-[#844865] shadow-sm" : "text-[#52616b] hover:bg-white/65"
            }`}
          >
            Request past images
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" name="name" value={name} onChange={(event) => setName(event.target.value)} required />
        <Field
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        {!isPastImageRequest ? (
          <Field
            label="Preferred date"
            name="preferredDate"
            type="date"
            value={preferredDate}
            onChange={(event) => setPreferredDate(event.target.value)}
          />
        ) : null}
      </div>
      {!isPastImageRequest ? (
        <>
          <Field
            label="Session type"
            name="sessionType"
            placeholder="Family, couple, grad, friends..."
            value={sessionType}
            onChange={(event) => setSessionType(event.target.value)}
          />
          <Field
            label="Preferred park or location"
            name="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </>
      ) : null}
      <TextArea
        label={isPastImageRequest ? "Comments or session details" : "Tell me what you want to book"}
        name="message"
        placeholder={
          isPastImageRequest
            ? "Tell me which past session or gallery you are looking for, including any names, date, or event details you remember."
            : undefined
        }
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        required
      />
      <Button type="submit" disabled={submitting}>
        <Send size={18} /> {submitting ? "Sending..." : isPastImageRequest ? "Send image request" : "Send booking request"}
      </Button>
      {notice ? <p className="text-sm text-[#52616b]">{notice}</p> : null}
    </form>
  );
}
