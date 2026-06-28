"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/Button";
import { Field, TextArea } from "@/components/Field";

export function OrderForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sessionType, setSessionType] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice("");

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone,
        sessionType,
        preferredDate: preferredDate || null,
        location,
        message
      })
    });

    const payload = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      setNotice(payload.error || "Could not send your order. Please try again.");
      return;
    }

    setName("");
    setEmail("");
    setPhone("");
    setSessionType("");
    setPreferredDate("");
    setLocation("");
    setMessage("");
    setNotice("Thanks! Your order was sent and I will follow up soon.");
  }

  return (
    <form onSubmit={submitOrder} className="grid gap-4 rounded-lg bg-white p-5 text-ink">
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
        <Field
          label="Preferred date"
          name="preferredDate"
          type="date"
          value={preferredDate}
          onChange={(event) => setPreferredDate(event.target.value)}
        />
      </div>
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
      <TextArea
        label="Tell me what you want to book"
        name="message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        required
      />
      <Button type="submit" disabled={submitting}>
        <Send size={18} /> {submitting ? "Sending..." : "Send order"}
      </Button>
      {notice ? <p className="text-sm text-[#52616b]">{notice}</p> : null}
    </form>
  );
}
