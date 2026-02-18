// --- Copied from main app types.ts ---

export interface ServiceCard {
  title: string;
  description: string;
  icon: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface GeneratedSiteData {
  bannerText: string;
  hero: {
    badge: string;
    headline: {
      line1: string;
      line2: string;
    };
    subtext: string;
    ctaText: string;
    navCta: string;
    heroImage: string;
    stats?: {
      label: string;
      value: string;
    }[];
  };
  services: {
    cards: ServiceCard[];
  };
  valueProposition: {
    title: string;
    subtitle: string;
    content: string;
    ctaText: string;
    image: string;
    highlights: string[];
  };
  benefits: {
    title: string;
    items: string[];
  };
  process: {
    title: string;
    steps: {
      title: string;
      description: string;
      icon: string;
    }[];
  };
  whoWeHelp: {
    title: string;
    image: string;
    bullets: string[];
  };
  gallery?: {
    title: string;
    subtitle: string;
    images: (string | null)[];
  };
  faqs: FAQItem[];
  footer: {
    headline: string;
    ctaText: string;
  };
  contact: {
    phone: string;
    location: string;
    companyName: string;
  };
}

// --- Worker-specific types ---

export interface SiteRow {
  id: string;
  user_id: string;
  company_name: string;
  industry: string;
  service_area: string;
  phone: string;
  brand_colour: string;
  site_data: GeneratedSiteData;
  deployed_url: string | null;
  deployment_status: string;
  custom_domain: string | null;
  domain_order_id: string | null;
  subdomain: string | null;
  updated_at: string;
}

export interface SectionConfig {
  id: string;
  visible: boolean;
  order: number;
}

export interface Env {
  SITE_CACHE: KVNamespace;
  IMAGES: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  PURGE_SECRET: string;
  MAIN_APP_URL: string;
}
