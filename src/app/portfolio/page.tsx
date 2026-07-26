import { Camera, Heart, Home } from "lucide-react";
import { ButtonLink } from "@/components/Button";
import { PortfolioViewer } from "@/components/PortfolioViewer";
import { getPortfolioPhotos } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const photos = await getPortfolioPhotos();

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 rounded-lg bg-white p-5 shadow-sm">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-leaf">
            <Camera size={17} /> Creative Images by JC
          </p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold leading-tight text-ink sm:text-5xl">Jewells Portfolio</h1>
              <p className="mt-3 max-w-2xl leading-7 text-[#52616b]">
                A public look at favorite moments, portraits, celebrations, and quiet details captured by Jewell.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink href="/" variant="secondary" className="min-h-12 border-[#b6879d] text-[#844865] hover:bg-[#fff6f9]">
                <Home size={18} /> Main page
              </ButtonLink>
              <ButtonLink href="/#contact" className="min-h-12 bg-[#9b5675] hover:bg-[#844865]">
                <Heart size={18} /> Let&apos;s Plan Your Session
              </ButtonLink>
            </div>
          </div>
        </header>

        <PortfolioViewer photos={photos} />
      </div>
    </main>
  );
}
