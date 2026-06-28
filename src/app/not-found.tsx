import { ButtonLink } from "@/components/Button";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-soft">
        <p className="text-sm font-semibold text-leaf">Dustin Photo Sessions</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Gallery not found</h1>
        <p className="mt-3 leading-7 text-[#52616b]">
          This private gallery link may be inactive, expired, or mistyped.
        </p>
        <ButtonLink href="/" className="mt-6">
          Back home
        </ButtonLink>
      </div>
    </main>
  );
}
