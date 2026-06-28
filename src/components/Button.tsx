import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

const baseClasses =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-leaf focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const variants = {
  primary: "bg-leaf text-white hover:bg-[#285f43]",
  secondary: "border border-[#d8ded3] bg-white text-ink hover:bg-[#f6f8f3]",
  ghost: "text-ink hover:bg-white/70"
};

type Variant = keyof typeof variants;

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${baseClasses} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  className = "",
  variant = "primary",
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <Link className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
      {children}
    </Link>
  );
}
