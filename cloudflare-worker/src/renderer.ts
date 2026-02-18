import { GeneratedSiteData, SectionConfig } from './types';
import { SPARKLES_SVG, CHECK_SVG, ARROW_RIGHT_SVG, HELP_CIRCLE_SVG, renderIcon } from './icons';

// --- Utility functions ---

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

// --- Brand color palette generation ---

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generateColorPalette(hex: string): Record<string, string> {
  const { h, s } = hexToHsl(hex);
  return {
    '50':  hslToHex(h, Math.min(s + 10, 100), 97),
    '100': hslToHex(h, Math.min(s + 5, 100), 93),
    '200': hslToHex(h, s, 86),
    '300': hslToHex(h, s, 75),
    '400': hslToHex(h, s, 64),
    '500': hslToHex(h, s, 55),
    '600': hex,
    '700': hslToHex(h, s, 40),
    '800': hslToHex(h, s, 32),
    '900': hslToHex(h, s, 24),
    '950': hslToHex(h, s, 16),
  };
}

// --- Section renderers ---

function renderNav(data: GeneratedSiteData, brandColour: string): string {
  return `
    <nav class="sticky top-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-xl border-b border-slate-100 py-4 px-6 md:px-12 flex justify-between items-center">
      <div class="flex-1">
        <div class="font-black text-xl md:text-2xl tracking-tighter text-slate-900">${escapeHtml(data.contact.companyName)}</div>
      </div>
      <div class="flex items-center gap-6">
        <div class="hidden md:flex flex-col items-end">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Expert Support</span>
          <span class="text-sm font-bold text-slate-900">${formatPhoneNumber(data.contact.phone)}</span>
        </div>
        <a href="tel:${escapeHtml(data.contact.phone)}" class="bg-blue-600 text-white px-6 py-3 rounded-full font-bold text-xs md:text-sm transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 uppercase tracking-tight" style="background-color: ${brandColour}">
          ${escapeHtml(data.hero.navCta)}
        </a>
      </div>
    </nav>`;
}

function renderHero(data: GeneratedSiteData, brandColour: string): string {
  const statsHtml = data.hero.stats?.map(stat => `
    <div class="flex flex-col items-center md:items-start text-center md:text-left">
      <div class="text-white text-3xl md:text-4xl font-black mb-1">${escapeHtml(stat.value)}</div>
      <div class="text-blue-200 text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-70">${escapeHtml(stat.label)}</div>
    </div>
  `).join('') || '';

  const statsBar = data.hero.stats && data.hero.stats.length > 0 ? `
    <div class="relative z-10 bg-white/10 backdrop-blur-xl border-y border-white/10 py-4">
      <div class="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        ${statsHtml}
      </div>
    </div>` : '';

  return `
    <section class="relative min-h-[90vh] flex flex-col justify-center overflow-hidden">
      <div class="absolute inset-0 z-0">
        <div class="w-full h-full">
          <img src="${escapeHtml(data.hero.heroImage)}" alt="Hero" class="w-full h-full object-cover" />
        </div>
        <div class="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent"></div>
      </div>

      <div class="relative z-10 max-w-7xl mx-auto px-6 w-full py-10">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-blue-100 text-[10px] md:text-xs font-bold tracking-[0.15em] uppercase">
            ${SPARKLES_SVG}
            <div>${escapeHtml(data.hero.badge)}</div>
          </div>
          <h1 class="text-white text-5xl md:text-8xl font-black tracking-tighter leading-[0.85] flex flex-col items-center">
            <span class="block">${escapeHtml(data.hero.headline.line1)}</span>
            <span class="block text-blue-600" style="color: ${brandColour}">${escapeHtml(data.hero.headline.line2)}</span>
          </h1>
          <div class="text-slate-300 text-lg md:text-2xl font-medium leading-relaxed mb-12 max-w-2xl">${escapeHtml(data.hero.subtext)}</div>

          <a href="tel:${escapeHtml(data.contact.phone)}" class="inline-flex items-center gap-3 px-10 py-5 bg-white text-slate-950 font-black rounded-2xl shadow-2xl transition-all hover:scale-[1.03] active:scale-[0.98] uppercase tracking-tight text-lg">
            <span>${escapeHtml(data.hero.ctaText)}</span>
            ${ARROW_RIGHT_SVG}
          </a>
        </div>
      </div>

      ${statsBar}
    </section>`;
}

function renderServices(data: GeneratedSiteData, brandColour: string): string {
  const cardsHtml = data.services.cards.map(service => `
    <div class="group bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 h-full flex flex-col">
      <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:rotate-12 group-hover:scale-110" style="background-color: ${brandColour}10; color: ${brandColour}">
        ${renderIcon(service.icon, 32, 'w-8 h-8')}
      </div>
      <h3 class="text-2xl font-bold mb-4 tracking-tight text-slate-900">${escapeHtml(service.title)}</h3>
      <div class="text-slate-500 text-base font-medium leading-relaxed flex-grow">${escapeHtml(service.description)}</div>
      <div class="mt-8 flex items-center gap-2 text-sm font-bold text-blue-600 group-hover:gap-3 transition-all cursor-pointer">
        Learn more <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      </div>
    </div>
  `).join('');

  return `
    <section class="py-12 md:py-18 px-6 md:px-12 bg-slate-50">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-12">
          <div class="text-blue-600 font-black text-xs uppercase tracking-[0.2em] mb-4">What We Do</div>
          <h2 class="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-6">Expert Solutions</h2>
          <div class="w-24 h-1.5 bg-blue-600 mx-auto rounded-full"></div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          ${cardsHtml}
        </div>
      </div>
    </section>`;
}

function renderValueProposition(data: GeneratedSiteData, brandColour: string): string {
  const highlightsHtml = data.valueProposition.highlights.map(highlight => `
    <div class="flex gap-4 items-start">
      <div class="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 mt-1">
        ${CHECK_SVG}
      </div>
      <div class="text-slate-900 font-bold text-base leading-tight">${escapeHtml(highlight)}</div>
    </div>
  `).join('');

  return `
    <section class="py-12 md:py-20 px-6 md:px-12 bg-white overflow-hidden">
      <div class="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
        <div class="lg:w-1/2 relative">
          <div class="absolute -top-10 -left-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
          <div class="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-200 rounded-full blur-3xl opacity-50"></div>
          <div class="rounded-[3rem] shadow-2xl w-full aspect-[4/5] object-cover relative z-10 overflow-hidden">
            <img src="${escapeHtml(data.valueProposition.image)}" alt="Action" class="w-full h-full object-cover" />
          </div>
        </div>
        <div class="lg:w-1/2 space-y-12 relative z-10">
          <div>
            <div class="text-blue-600 font-bold text-xs uppercase tracking-[0.2em] mb-4">${escapeHtml(data.valueProposition.subtitle)}</div>
            <h2 class="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1] mb-8">${escapeHtml(data.valueProposition.title)}</h2>
            <div class="text-slate-600 text-lg md:text-xl font-medium leading-relaxed">${escapeHtml(data.valueProposition.content)}</div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
            ${highlightsHtml}
          </div>

          <div class="p-8 bg-slate-50 rounded-3xl border-l-4 border-blue-600 italic text-slate-700 font-medium text-lg leading-relaxed mb-8">
            &ldquo;We focus on providing consistent service and clear communication throughout every project.&rdquo;
          </div>

          <a href="tel:${escapeHtml(data.contact.phone)}" class="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl transition-all hover:bg-blue-700 active:scale-95 uppercase tracking-tight text-base" style="background-color: ${brandColour}">
            <span>${escapeHtml(data.valueProposition.ctaText)}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    </section>`;
}

function renderBenefits(data: GeneratedSiteData): string {
  const itemsHtml = data.benefits.items.map(benefit => `
    <div class="flex items-center gap-6 p-6 rounded-2xl bg-slate-50 border border-transparent hover:border-blue-100 transition-colors">
      <div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div>
      <div class="text-lg md:text-xl font-bold text-slate-900">${escapeHtml(benefit)}</div>
    </div>
  `).join('');

  return `
    <section class="py-12 md:py-20 px-6 md:px-12 bg-white">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-10">
          <div class="text-4xl md:text-6xl font-black tracking-tight text-slate-900">${escapeHtml(data.benefits.title)}</div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-10">
          ${itemsHtml}
        </div>
      </div>
    </section>`;
}

function renderProcess(data: GeneratedSiteData, brandColour: string): string {
  const stepsHtml = data.process.steps.map((step, idx) => `
    <div class="relative group">
      ${idx < 2 ? '<div class="hidden md:block absolute top-10 -right-6 w-12 h-px bg-slate-800 z-0"></div>' : ''}
      <div class="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center text-white text-3xl font-black mb-10 transition-transform group-hover:scale-110 shadow-2xl shadow-blue-500/20" style="background-color: ${brandColour}">
        ${idx + 1}
      </div>
      <h3 class="text-2xl font-bold mb-4 tracking-tight">${escapeHtml(step.title)}</h3>
      <div class="text-slate-400 text-lg font-medium leading-relaxed">${escapeHtml(step.description)}</div>
    </div>
  `).join('');

  return `
    <section class="py-12 md:py-20 px-6 md:px-12 bg-slate-950 text-white relative overflow-hidden">
      <div class="absolute top-0 right-0 w-1/3 h-full bg-blue-600/10 skew-x-12 translate-x-1/2"></div>
      <div class="max-w-7xl mx-auto relative z-10">
        <div class="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
          <div class="max-w-2xl">
            <div class="text-blue-400 font-bold text-xs uppercase tracking-[0.2em] mb-4">Our Method</div>
            <h2 class="text-4xl md:text-6xl font-black tracking-tight">${escapeHtml(data.process.title)}</h2>
          </div>
          <div class="text-slate-400 font-bold max-w-sm md:text-right border-l md:border-l-0 md:border-r border-blue-500/30 pl-8 md:pl-0 md:pr-8 uppercase tracking-widest text-xs leading-relaxed">
            Transparent &amp; Professional Workflow From Start To Finish
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
          ${stepsHtml}
        </div>
      </div>
    </section>`;
}

function renderWhoWeHelp(data: GeneratedSiteData, brandColour: string): string {
  const bulletsHtml = data.whoWeHelp.bullets.map(bullet => `
    <div class="flex items-start gap-3 md:gap-4 group">
      <div class="mt-1.5 w-2 h-2 rounded-full bg-blue-600 shrink-0" style="background-color: ${brandColour}"></div>
      <div class="text-lg md:text-xl text-gray-600 font-medium leading-relaxed group-hover:text-gray-900 transition-colors">${escapeHtml(bullet)}</div>
    </div>
  `).join('');

  return `
    <section class="py-12 md:py-16 bg-white overflow-hidden" id="who-we-help">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex flex-col md:flex-row items-center gap-8 md:gap-16">
          <div class="w-full md:w-1/2 order-2 md:order-1">
            <div class="rounded-3xl shadow-2xl w-full h-[300px] md:h-[500px] object-cover overflow-hidden">
              <img src="${escapeHtml(data.whoWeHelp.image)}" alt="${escapeHtml(data.whoWeHelp.title)}" class="w-full h-full object-cover" />
            </div>
          </div>
          <div class="w-full md:w-1/2 order-1 md:order-2">
            <div class="text-3xl md:text-5xl font-black tracking-tighter mb-6 md:mb-8 text-gray-900 leading-tight">${escapeHtml(data.whoWeHelp.title)}</div>
            <div class="space-y-4 md:space-y-6">
              ${bulletsHtml}
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

function renderGallery(data: GeneratedSiteData): string {
  if (!data.gallery) return '';

  const images = data.gallery.images || [];
  const hasAnyImage = images.some(img => img !== null && img !== undefined);
  if (!hasAnyImage) return '';

  const slotsHtml = [0, 1, 2].map(idx => {
    const src = images[idx];
    if (!src) {
      return '<div class="aspect-[4/3] rounded-3xl overflow-hidden"></div>';
    }
    return `
      <div class="aspect-[4/3] rounded-3xl overflow-hidden">
        <img src="${escapeHtml(src)}" alt="Gallery" class="w-full h-full object-cover rounded-3xl" loading="lazy" />
      </div>`;
  }).join('');

  return `
    <section class="py-12 md:py-20 px-6 md:px-12 bg-slate-50">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-12">
          <div class="text-blue-600 font-black text-xs uppercase tracking-[0.2em] mb-4">Our Work</div>
          <h2 class="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-4">${escapeHtml(data.gallery.title || 'Gallery')}</h2>
          <div class="text-slate-500 text-lg font-medium">${escapeHtml(data.gallery.subtitle || 'See our latest projects')}</div>
          <div class="w-24 h-1.5 bg-blue-600 mx-auto rounded-full mt-6"></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          ${slotsHtml}
        </div>
      </div>
    </section>`;
}

function renderFaqs(data: GeneratedSiteData): string {
  const faqsHtml = data.faqs.map(faq => `
    <div class="bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-slate-100 group hover:border-blue-100 transition-all">
      <div class="flex gap-6">
        <div class="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
          ${HELP_CIRCLE_SVG}
        </div>
        <div class="space-y-4">
          <h4 class="text-xl md:text-2xl font-black tracking-tight text-slate-900">${escapeHtml(faq.question)}</h4>
          <div class="text-slate-500 text-lg font-medium leading-relaxed">${escapeHtml(faq.answer)}</div>
        </div>
      </div>
    </div>
  `).join('');

  return `
    <section class="py-12 md:py-20 px-6 md:px-12 bg-slate-50">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-12">
          <div class="text-blue-600 font-bold text-xs uppercase tracking-[0.2em] mb-4">FAQ</div>
          <h2 class="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6">Common Questions</h2>
          <div class="w-20 h-1.5 bg-blue-600 mx-auto rounded-full"></div>
        </div>
        <div class="space-y-6">
          ${faqsHtml}
        </div>
      </div>
    </section>`;
}

function renderFooter(data: GeneratedSiteData, brandColour: string): string {
  return `
    <section class="bg-slate-900 py-16 px-6 text-center text-white">
      <div class="max-w-3xl mx-auto space-y-10">
        <h2 class="text-4xl md:text-7xl font-black tracking-tighter leading-none mb-4">${escapeHtml(data.footer.headline)}</h2>
        <p class="text-slate-400 text-xl font-medium mb-6">Contact us today for a free, no-obligation estimate in ${escapeHtml(data.contact.location)}.</p>
        <a href="tel:${escapeHtml(data.contact.phone)}" class="inline-flex items-center gap-4 px-12 py-7 bg-blue-600 text-white font-black rounded-[2rem] shadow-2xl transition-all hover:scale-105 active:scale-95 uppercase tracking-tighter text-xl" style="background-color: ${brandColour}">
          <span>${escapeHtml(data.footer.ctaText)}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </a>
        <div class="pt-10 border-t border-slate-800 flex flex-col justify-between items-center gap-8 opacity-50 text-center">
          <div class="space-y-4">
            <p class="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em]">Services and availability may vary. Contact us to confirm details.</p>
            <div class="flex flex-col md:flex-row items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <span>&copy; ${new Date().getFullYear()} ${escapeHtml(data.contact.companyName)}</span>
              <span class="hidden md:inline">&bull;</span>
              <span>Privacy Policy</span>
              <span class="hidden md:inline">&bull;</span>
              <span>Terms of Service</span>
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

// --- Section ordering ---

const DEFAULT_SECTIONS = [
  'hero',
  'services',
  'valueProposition',
  'benefits',
  'process',
  'whoWeHelp',
  'gallery',
  'faqs',
  'footer',
];

function renderSections(data: GeneratedSiteData, brandColour: string, sectionsConfig?: SectionConfig[]): string {
  const renderers: Record<string, () => string> = {
    hero: () => renderHero(data, brandColour),
    services: () => renderServices(data, brandColour),
    valueProposition: () => renderValueProposition(data, brandColour),
    benefits: () => renderBenefits(data),
    process: () => renderProcess(data, brandColour),
    whoWeHelp: () => renderWhoWeHelp(data, brandColour),
    gallery: () => renderGallery(data),
    faqs: () => renderFaqs(data),
    footer: () => renderFooter(data, brandColour),
  };

  let orderedSections: string[];

  if (sectionsConfig && sectionsConfig.length > 0) {
    orderedSections = sectionsConfig
      .filter(s => s.visible)
      .sort((a, b) => a.order - b.order)
      .map(s => s.id);
  } else {
    orderedSections = DEFAULT_SECTIONS;
  }

  let html = '';
  for (const sectionId of orderedSections) {
    const renderer = renderers[sectionId];
    if (renderer) {
      html += renderer();
    }
  }
  return html;
}

// --- Main export ---

export function renderSiteHtml(
  siteData: GeneratedSiteData,
  brandColour: string,
  sectionsConfig?: SectionConfig[],
): string {
  const palette = generateColorPalette(brandColour);

  const paletteJson = JSON.stringify(palette);

  const nav = renderNav(siteData, brandColour);
  const body = renderSections(siteData, brandColour, sectionsConfig);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(siteData.hero.headline.line1)} - ${escapeHtml(siteData.contact.companyName)}</title>
    <meta name="description" content="${escapeHtml(siteData.hero.subtext)}">
    <meta name="robots" content="index, follow">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              blue: ${paletteJson}
            }
          }
        }
      }
    </script>
    <style>
      @font-face {
        font-family: 'Avenir Light';
        src: local('Avenir-Light'), local('Avenir Light'), local('HelveticaNeue-Light'), local('Helvetica Neue Light'), sans-serif;
        font-weight: 300;
      }

      body {
        font-family: "Avenir Light", "Avenir", "Helvetica Neue", Helvetica, Arial, sans-serif;
        background-color: #05070A;
        color: white;
        margin: 0;
        font-weight: 300;
      }

      h1, h2, h3, h4, h5, h6, button, input, textarea, div, span, p, a {
        font-family: "Avenir Light", "Avenir", "Helvetica Neue", Helvetica, Arial, sans-serif !important;
      }

      .tracking-tighter {
        letter-spacing: -0.05em;
      }

      @media (max-width: 640px) {
        body {
          font-size: 14px;
        }
      }
    </style>
</head>
<body>
    <div class="min-h-screen bg-white text-slate-900 selection:bg-blue-100 font-sans antialiased">
      ${nav}
      ${body}
    </div>
</body>
</html>`;
}

export function render404Page(mainAppUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Site Not Found - ablarme</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body {
        font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
        margin: 0;
      }
    </style>
</head>
<body class="bg-slate-950 text-white min-h-screen flex items-center justify-center">
    <div class="text-center space-y-6 px-6">
      <h1 class="text-6xl font-black tracking-tighter">404</h1>
      <p class="text-xl text-slate-400 font-medium">This site doesn&rsquo;t exist.</p>
      <a href="${escapeHtml(mainAppUrl)}" class="inline-block px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all uppercase tracking-tight text-sm">
        Go to ablarme.com
      </a>
    </div>
</body>
</html>`;
}
