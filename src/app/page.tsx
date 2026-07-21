import type { LucideIcon } from "lucide-react";
import { ClipboardList, Heart, Images, PartyPopper, PawPrint, Sparkles, Sunrise, Users, UserRound } from "lucide-react";
import Image from "next/image";
import { ButtonLink } from "@/components/Button";
import { OrderForm } from "@/components/OrderForm";

const sessionTypes: { label: string; icon: LucideIcon }[] = [
  { label: "Family Sessions", icon: Users },
  { label: "Pet Photography", icon: PawPrint },
  { label: "Couples", icon: Heart },
  { label: "Portraits & Solo Sessions", icon: UserRound },
  { label: "Events & Celebrations", icon: PartyPopper },
  { label: "Specialty Sessions", icon: Sunrise }
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
      <section id="session-types" className="bg-white py-10 sm:py-12 lg:py-14">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="grid items-center gap-8 text-center lg:grid-cols-[0.86fr_1.14fr] lg:gap-12 lg:text-left">
            <div className="flex justify-center lg:justify-start">
              <Image
                className="h-52 w-52 rounded-full object-contain drop-shadow-[0_18px_35px_rgba(31,41,51,0.12)] sm:h-64 sm:w-64 lg:h-[22rem] lg:w-[22rem] xl:h-[24rem] xl:w-[24rem]"
                src="/images/creative-images-logo.jpg"
                width={384}
                height={384}
                priority
                alt="Creative Images by JC logo"
              />
            </div>

            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full bg-[#fff7f4] px-4 py-2 text-sm font-semibold text-[#844865] shadow-sm">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Creative Images by JC
              </p>
              <div className="space-y-4">
                <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-[1.04] text-ink sm:text-5xl lg:mx-0 lg:text-[4.25rem]">
                  The moments you&apos;ll want to remember forever.
                </h1>
                <p className="mx-auto max-w-2xl text-lg leading-8 text-[#52616b] lg:mx-0">
                  A warm, simple place for clients to find and enjoy photos from Creative Images by JC.
                  Book a session, request past session images, and download the moments that matter.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <ButtonLink href="#contact" className="min-h-12 !bg-[#9b5675] px-6 text-base hover:!bg-[#844865]">
                  Book A Session
                </ButtonLink>
                <ButtonLink
                  href="#past-session-images"
                  variant="secondary"
                  className="min-h-12 border-[#b6879d] px-6 text-base text-[#844865] hover:bg-[#fff6f9]"
                >
                  Request Past Session Images
                </ButtonLink>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-lg bg-[#fff7f4] p-4 shadow-sm sm:p-5 lg:mt-10">
            <div className="grid items-center gap-4 lg:grid-cols-[13rem_1fr]">
              <div className="text-center lg:text-left">
                <h2 className="text-2xl font-bold text-ink">What I Photograph</h2>
                <Sparkles className="mx-auto mt-2 h-4 w-4 text-[#9b5675] lg:mx-0" aria-hidden="true" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {sessionTypes.map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-md bg-white/72 px-3 py-3 text-center"
                  >
                    <Icon className="h-7 w-7 text-[#844865]" strokeWidth={2.2} />
                    <span className="text-sm font-semibold leading-5 text-[#52616b]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="gallery-preview" className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 md:grid-cols-[0.78fr_1.22fr] md:px-8">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9b5675]">Private galleries</p>
            <h2 className="text-3xl font-bold leading-tight text-ink sm:text-4xl">
              Your favorite moments, gathered in one easy place.
            </h2>
            <p className="leading-7 text-[#52616b]">
              Browse your finished gallery from any device, save favorites, and download the photos you want to keep
              close.
            </p>
            <div className="grid gap-3 text-sm font-semibold text-[#52616b] sm:grid-cols-3 md:grid-cols-1">
              <span className="rounded-md bg-white px-4 py-3 shadow-sm">Private gallery links</span>
              <span className="rounded-md bg-white px-4 py-3 shadow-sm">Favorites for easy choosing</span>
              <span className="rounded-md bg-white px-4 py-3 shadow-sm">Simple photo downloads</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg bg-[#dce8d7] shadow-soft">
            <div className="aspect-[4/3] sm:aspect-[16/10]">
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
              <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(47,111,78,0.14),rgba(248,217,207,0.28))]" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <div className="max-w-sm rounded-md bg-white/92 p-4 text-left shadow-lg backdrop-blur">
                  <p className="text-sm font-semibold text-ink">Ready from phone or desktop</p>
                  <p className="mt-1 text-sm text-[#52616b]">A soft, simple viewing experience for every session.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="mb-8 flex items-center gap-3">
            <Images className="text-leaf" />
            <h2 className="text-3xl font-bold text-ink">How it works</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step} className="rounded-lg bg-cream p-5 shadow-sm">
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
            <h2 className="text-3xl font-bold">Let&apos;s Capture Your Story</h2>
            <p className="mt-4 leading-7 text-white/76">
              I&apos;d love to learn more about your vision or help you find past session images. Choose what you need
              in the form and I&apos;ll be in touch as soon as possible. (I typically respond within 24-48 hours.)
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
