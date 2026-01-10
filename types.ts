
export interface ServiceCard {
  title: string;
  description: string;
  icon: string;
}

export interface BenefitCard {
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
  faqs: FAQItem[];
  footer: {
    headline: string;
    ctaText: string;
  };
  contact: {
    phone: string;
    location: string;
    companyName: string;
  }
}

export interface SiteInstance {
  id: string;
  data: GeneratedSiteData;
  lastSaved: number;
}

export interface GeneratorInputs {
  industry: string;
  companyName: string;
  location: string;
  phone: string;
  brandColor: string;
}
