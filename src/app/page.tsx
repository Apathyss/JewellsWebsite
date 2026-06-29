import { Camera, Check, ClipboardList, Images, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/Button";
import { OrderForm } from "@/components/OrderForm";

const offers = [
  "A simple home for photos from Creative Images by JC",
  "Private galleries for weddings, couples, families, grads, and events",
  "Easy viewing, favorites, individual downloads, and download-all galleries"
];

const steps = [
  "Send a quick request or tell us which gallery you are looking for.",
  "After your photos are ready, you receive a private gallery link.",
  "Open your gallery from any device, save favorites, and download your photos."
];

const heroPhotos = [
  "/images/hero-gallery-1.jpg",
  "/images/hero-gallery-2.jpg",
  "/images/hero-gallery-3.jpg",
  "/images/hero-gallery-4.jpg",
  "/images/hero-gallery-5.jpg",
  "/images/hero-gallery-6.jpg"
];

const heroSlides = [...heroPhotos, heroPhotos[0]];

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid min-h-[88vh] max-w-6xl items-center gap-10 px-5 py-12 md:grid-cols-[1.05fr_0.95fr] md:px-8">
        <div className="space-y-7">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-leaf shadow-sm">
            <Camera size={16} /> Creative Images by JC Booking
          </p>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-bold leading-tight text-ink sm:text-6xl">
              Capturing the moments you&apos;ll never want to forget
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#52616b]">
              A warm, simple place for clients to find and enjoy photos from Creative Images by JC.
              Request a session, receive your private gallery, and download the moments that matter.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="#contact">Request photos</ButtonLink>
            <ButtonLink href="#how-it-works" variant="secondary">
              See how it works
            </ButtonLink>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-[#dce8d7] shadow-soft">
            <div className="hero-photo-scroll absolute inset-0">
              {heroSlides.map((photo, index) => (
                <img
                  key={`${photo}-${index}`}
                  className="h-full shrink-0 object-cover"
                  src={photo}
                  alt=""
                  aria-hidden="true"
                />
              ))}
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(47,111,78,0.18),rgba(248,217,207,0.28))]" />
            <div className="relative flex h-full items-end p-5">
              <div className="rounded-md bg-white/92 p-4 shadow-lg backdrop-blur">
                <p className="text-sm font-semibold text-ink">Private galleries for every shoot</p>
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
            <h2 className="text-3xl font-bold text-ink">What you can expect</h2>
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
            <Images className="text-leaf" />
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
            <h2 className="text-3xl font-bold">Lets Capture Your Story</h2>
            <p className="mt-4 leading-7 text-white/76">
              I&apos;d love to learn more about your vision. Fill out the form below and I&apos;ll be in touch as soon as
              possible. (I typically respond within 24-48 hours.)
            </p>
          </div>
          <OrderForm />
        </div>
      </section>

      <footer className="bg-ink px-5 pb-6 text-right md:px-8">
        <a className="text-xs text-white/25 transition hover:text-white/65" href="/admin/login" aria-label="Admin login">
          .
        </a>
      </footer>
    </main>
  );
}
