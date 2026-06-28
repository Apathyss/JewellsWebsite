import { Camera, Check, ClipboardList, MapPin, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/Button";
import { OrderForm } from "@/components/OrderForm";

const offers = [
  "Easygoing mini sessions at local parks",
  "Natural portraits for couples, families, grads, and friends",
  "A private link where you can view and download your photos"
];

const steps = [
  "Send an order with the kind of shoot you have in mind.",
  "We pick a park, date, and simple plan that feels comfortable.",
  "After the session, you get a private gallery link for your photos."
];

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid min-h-[88vh] max-w-6xl items-center gap-10 px-5 py-12 md:grid-cols-[1.05fr_0.95fr] md:px-8">
        <div className="space-y-7">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-leaf shadow-sm">
            <Camera size={16} /> Jewells Photo Sessions
          </p>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-bold leading-tight text-ink sm:text-6xl">
              Simple park photoshoots
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#52616b]">
              Friendly, low-pressure photo sessions outside. Come as you are, wander a bit, laugh a lot,
              and get a private gallery that makes downloading your favorites simple.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="#contact">Book a session</ButtonLink>
            <ButtonLink href="#how-it-works" variant="secondary">
              See how it works
            </ButtonLink>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="aspect-[4/5] overflow-hidden rounded-lg bg-[#dce8d7] shadow-soft">
            <div className="flex h-full items-end bg-[linear-gradient(145deg,rgba(47,111,78,0.2),rgba(248,217,207,0.65)),url('https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1100&q=80')] bg-cover bg-center p-5">
              <div className="rounded-md bg-white/92 p-4 shadow-lg backdrop-blur">
                <p className="text-sm font-semibold text-ink">Private galleries included</p>
                <p className="mt-1 text-sm text-[#52616b]">View, favorite, and download from any phone.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="offer" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="mb-8 flex items-center gap-3">
            <Sparkles className="text-leaf" />
            <h2 className="text-3xl font-bold text-ink">What I offer</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {offers.map((offer) => (
              <div key={offer} className="rounded-lg border border-[#e4e8df] bg-cream p-5">
                <Check className="mb-4 text-leaf" />
                <p className="text-base leading-7 text-[#52616b]">{offer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-16">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="mb-8 flex items-center gap-3">
            <MapPin className="text-leaf" />
            <h2 className="text-3xl font-bold text-ink">How it works</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step} className="rounded-lg bg-white p-5 shadow-sm">
                <span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-petal font-bold text-ink">
                  {index + 1}
                </span>
                <p className="leading-7 text-[#52616b]">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="bg-ink py-16 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-[0.9fr_1.1fr] md:px-8">
          <div>
            <ClipboardList className="mb-4 text-petal" />
            <h2 className="text-3xl font-bold">Let&apos;s plan something easy.</h2>
            <p className="mt-4 leading-7 text-white/76">
              Tell me the park, the people, and the vibe. Your order will show up in the admin dashboard.
            </p>
          </div>
          <OrderForm />
        </div>
      </section>
    </main>
  );
}
