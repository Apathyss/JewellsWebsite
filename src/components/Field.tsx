import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      {label}
      <input
        className="min-h-11 rounded-md border border-[#d8ded3] bg-white px-3 py-2 text-base shadow-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
        {...props}
      />
    </label>
  );
}

export function TextArea({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      {label}
      <textarea
        className="min-h-28 rounded-md border border-[#d8ded3] bg-white px-3 py-2 text-base shadow-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
        {...props}
      />
    </label>
  );
}
