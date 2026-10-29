import React from "react";

export function WhatsAppIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.031 2C6.496 2 2 6.496 2 12.031c0 1.768.46 3.493 1.332 5.008L2 22l5.121-1.343a10.007 10.007 0 0 0 4.91 1.282h.004c5.531 0 10.027-4.496 10.027-10.031A10.027 10.027 0 0 0 12.031 2zm0 18.368a8.318 8.318 0 0 1-4.244-1.157l-.304-.18-3.153.827.842-3.073-.198-.315a8.312 8.312 0 0 1-1.274-4.44c0-4.603 3.746-8.349 8.331-8.349a8.309 8.309 0 0 1 5.895 2.443 8.309 8.309 0 0 1 2.443 5.895c0 4.604-3.746 8.349-8.342 8.349zm4.566-6.241c-.25-.125-1.479-.73-1.708-.813-.23-.083-.396-.125-.563.125-.167.25-.646.813-.792.979-.146.167-.292.188-.542.063a6.848 6.848 0 0 1-2.015-1.242 7.55 7.55 0 0 1-1.393-1.737c-.146-.25-.016-.386.109-.51.112-.112.25-.292.375-.438.125-.146.167-.25.25-.417.083-.167.042-.313-.021-.438s-.563-1.354-.771-1.854c-.203-.487-.41-.421-.563-.429l-.479-.008c-.167 0-.438.063-.667.313s-.875.854-.875 2.083c0 1.229.896 2.417 1.021 2.583.125.167 1.764 2.694 4.274 3.777.597.258 1.064.412 1.428.528.6.191 1.146.164 1.578.1.481-.072 1.479-.604 1.688-1.188.208-.583.208-1.083.146-1.188-.063-.104-.229-.167-.479-.292z" />
    </svg>
  );
}

export function DeveloperFooter() {
  return (
    <section
      aria-label="Developer & Contact Information"
      className="mt-6 border-t border-line/60 pt-5 pb-4 text-xs text-muted"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
        {/* Developers Credential */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <span className="font-bold text-ink tracking-wide text-[13px] flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-accent animate-pulse" />
            Developed By:
          </span>
          <span className="text-ink/85 font-medium text-[13px]">
            Eng. Mina Seriany &amp; Mr. Bishoi Beshai
          </span>
        </div>

        {/* WhatsApp Contact Badges */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted/90 flex items-center gap-1 mr-1">
            WhatsApp Contact:
          </span>

          {/* Contact 1 */}
          <a
            href="https://wa.me/2001206711964"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="تواصل مع Eng. Mina Seriany عبر واتساب"
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 transition-all shadow-sm hover:shadow hover:scale-[1.02] active:scale-[0.98]"
          >
            <WhatsAppIcon className="size-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            <span dir="ltr" className="font-mono text-[12px] font-semibold">
              +20 01206711964
            </span>
          </a>

          {/* Contact 2 */}
          <a
            href="https://wa.me/306984698813"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="تواصل مع Mr. Bishoi Beshai عبر واتساب"
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 transition-all shadow-sm hover:shadow hover:scale-[1.02] active:scale-[0.98]"
          >
            <WhatsAppIcon className="size-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            <span dir="ltr" className="font-mono text-[12px] font-semibold">
              +30 698 469 8813
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
