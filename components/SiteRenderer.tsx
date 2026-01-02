
import React, { useRef } from 'react';
import { GeneratedSiteData } from '../types';
import IconRenderer from './IconRenderer';
import { CheckCircle, Camera, Sparkles, UserCheck, HelpCircle, ArrowRight, Shield, Clock, Award, Star } from 'lucide-react';

interface SiteRendererProps {
  data: GeneratedSiteData;
  isEditMode: boolean;
  onUpdate: (updatedData: GeneratedSiteData) => void;
}

const formatPhoneNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
};

const EditableText: React.FC<{
  text: string;
  className?: string;
  isEditMode: boolean;
  onBlur: (val: string) => void;
  as?: React.ElementType;
  style?: React.CSSProperties;
}> = ({ text, className, isEditMode, onBlur, as: Tag = 'div', style }) => {
  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    onBlur(e.currentTarget.innerText);
  };

  return (
    <Tag
      contentEditable={isEditMode}
      suppressContentEditableWarning
      className={`${className} ${isEditMode ? 'hover:ring-2 hover:ring-blue-400/30 transition-all outline-none focus:ring-2 focus:ring-blue-500/50 rounded-sm' : ''}`}
      onBlur={handleBlur}
      style={style}
    >
      {text}
    </Tag>
  );
};

const EditableImage: React.FC<{
  src: string;
  alt: string;
  className: string;
  isEditMode: boolean;
  onUpload: (base64: string) => void;
}> = ({ src, alt, className, isEditMode, onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`relative group overflow-hidden ${className}`} onClick={() => isEditMode && fileInputRef.current?.click()}>
      <img src={src} alt={alt} className="w-full h-full object-cover" />
      {isEditMode && (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 z-20">
          <div className="bg-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 transform group-hover:scale-105 transition-transform">
            <Camera className="text-blue-600 w-5 h-5" />
            <span className="text-blue-900 font-bold text-xs uppercase tracking-tight">Replace Image</span>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
        </div>
      )}
    </div>
  );
};

const SiteRenderer: React.FC<SiteRendererProps> = ({ data, isEditMode, onUpdate }) => {
  const primaryColor = '#2563eb'; // Default premium blue

  const updateField = (path: string, val: any) => {
    const newData = JSON.parse(JSON.stringify(data));
    const keys = path.split('.');
    let current = newData;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = val;
    onUpdate(newData);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 font-sans antialiased">
      {/* Navigation */}
      <nav className="sticky top-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-xl border-b border-slate-100 py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex-1">
          <EditableText
            text={data.contact.companyName}
            isEditMode={isEditMode}
            onBlur={(val) => updateField('contact.companyName', val)}
            className="font-black text-xl md:text-2xl tracking-tighter text-slate-900"
          />
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Expert Support</span>
            <span className="text-sm font-bold text-slate-900">{formatPhoneNumber(data.contact.phone)}</span>
          </div>
          <a
            href={`tel:${data.contact.phone}`}
            className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold text-xs md:text-sm transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 uppercase tracking-tight"
            style={{ backgroundColor: primaryColor }}
          >
            Get an estimate
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <EditableImage
            src={data.hero.heroImage}
            alt="Hero"
            className="w-full h-full"
            isEditMode={isEditMode}
            onUpload={(base64) => updateField('hero.heroImage', base64)}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-blue-100 text-[10px] md:text-xs font-bold tracking-[0.15em] uppercase">
              <Sparkles size={14} className="text-blue-400" />
              <EditableText
                text={data.hero.badge}
                isEditMode={isEditMode}
                onBlur={(val) => updateField('hero.badge', val)}
              />
            </div>
            <h1 className="text-white text-5xl md:text-[84px] font-black tracking-tight leading-[0.9] mb-10">
              <EditableText
                text={data.hero.headline.line1}
                isEditMode={isEditMode}
                onBlur={(val) => updateField('hero.headline.line1', val)}
                className="block"
              />
              <EditableText
                text={data.hero.headline.line2}
                isEditMode={isEditMode}
                onBlur={(val) => updateField('hero.headline.line2', val)}
                className="block"
                style={{ color: primaryColor }}
              />
              <EditableText
                text={data.hero.headline.line3}
                isEditMode={isEditMode}
                onBlur={(val) => updateField('hero.headline.line3', val)}
                className="block opacity-90"
              />
            </h1>
            <EditableText
              text={data.hero.subtext}
              isEditMode={isEditMode}
              onBlur={(val) => updateField('hero.subtext', val)}
              className="text-slate-300 text-lg md:text-2xl font-medium leading-relaxed mb-12 max-w-2xl"
            />

            <a
              href={`tel:${data.contact.phone}`}
              className="inline-flex items-center gap-3 px-10 py-5 bg-white text-slate-950 font-black rounded-2xl shadow-2xl transition-all hover:scale-[1.03] active:scale-[0.98] uppercase tracking-tight text-lg"
            >
              Get An Estimate <ArrowRight size={20} />
            </a>
          </div>
        </div>

        {/* Hero Stats Bar */}
        <div className="relative z-10 bg-white/10 backdrop-blur-xl border-y border-white/10 py-8">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            {data.hero.stats?.map((stat, idx) => (
              <div key={idx} className="flex flex-col items-center md:items-start text-center md:text-left">
                <EditableText
                  text={stat.value}
                  isEditMode={isEditMode}
                  onBlur={(val) => {
                    const stats = [...(data.hero.stats || [])];
                    stats[idx].value = val;
                    updateField('hero.stats', stats);
                  }}
                  className="text-white text-3xl md:text-4xl font-black mb-1"
                />
                <EditableText
                  text={stat.label}
                  isEditMode={isEditMode}
                  onBlur={(val) => {
                    const stats = [...(data.hero.stats || [])];
                    stats[idx].label = val;
                    updateField('hero.stats', stats);
                  }}
                  className="text-blue-200 text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-70"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 md:py-36 px-6 md:px-12 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <div className="text-blue-600 font-black text-xs uppercase tracking-[0.2em] mb-4">What We Do</div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-6">Expert Solutions</h2>
            <div className="w-24 h-1.5 bg-blue-600 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {data.services.cards.map((service, idx) => (
              <div key={idx} className="group bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 h-full flex flex-col">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:rotate-12 group-hover:scale-110" style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}>
                  <IconRenderer name={service.icon} className="w-8 h-8" />
                </div>
                <EditableText
                  text={service.title}
                  isEditMode={isEditMode}
                  onBlur={(val) => {
                    const cards = [...data.services.cards];
                    cards[idx].title = val;
                    updateField('services.cards', cards);
                  }}
                  className="text-2xl font-bold mb-4 tracking-tight text-slate-900"
                  as="h3"
                />
                <EditableText
                  text={service.description}
                  isEditMode={isEditMode}
                  onBlur={(val) => {
                    const cards = [...data.services.cards];
                    cards[idx].description = val;
                    updateField('services.cards', cards);
                  }}
                  className="text-slate-500 text-base font-medium leading-relaxed flex-grow"
                />
                <div className="mt-8 flex items-center gap-2 text-sm font-bold text-blue-600 group-hover:gap-3 transition-all cursor-pointer">
                  Learn more <ArrowRight size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-24 md:py-40 px-6 md:px-12 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
          <div className="lg:w-1/2 relative">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-200 rounded-full blur-3xl opacity-50"></div>
            <EditableImage
              src={data.valueProposition.image}
              alt="Action"
              className="rounded-[3rem] shadow-2xl w-full aspect-[4/5] object-cover relative z-10"
              isEditMode={isEditMode}
              onUpload={(base64) => updateField('valueProposition.image', base64)}
            />
          </div>
          <div className="lg:w-1/2 space-y-12 relative z-10">
            <div>
              <EditableText
                text={data.valueProposition.subtitle}
                isEditMode={isEditMode}
                onBlur={(val) => updateField('valueProposition.subtitle', val)}
                className="text-blue-600 font-bold text-xs uppercase tracking-[0.2em] mb-4"
              />
              <EditableText
                text={data.valueProposition.title}
                isEditMode={isEditMode}
                onBlur={(val) => updateField('valueProposition.title', val)}
                className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1] mb-8"
                as="h2"
              />
              <EditableText
                text={data.valueProposition.content}
                isEditMode={isEditMode}
                onBlur={(val) => updateField('valueProposition.content', val)}
                className="text-slate-600 text-lg md:text-xl font-medium leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {data.valueProposition.highlights.map((highlight, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 mt-1">
                    <CheckCircle size={14} />
                  </div>
                  <EditableText
                    text={highlight}
                    isEditMode={isEditMode}
                    onBlur={(val) => {
                      const highlights = [...data.valueProposition.highlights];
                      highlights[idx] = val;
                      updateField('valueProposition.highlights', highlights);
                    }}
                    className="text-slate-900 font-bold text-base leading-tight"
                  />
                </div>
              ))}
            </div>

            <div className="p-8 bg-slate-50 rounded-3xl border-l-4 border-blue-600 italic text-slate-700 font-medium">
              "We don't just complete projects; we build lasting relationships through excellence and integrity."
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators Section */}
      <section className="py-24 bg-slate-50 px-6 md:px-12 border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <EditableText
            text={data.trustIndicators.title}
            isEditMode={isEditMode}
            onBlur={(val) => updateField('trustIndicators.title', val)}
            className="text-center text-2xl md:text-3xl font-black mb-16 tracking-tight"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
            {data.trustIndicators.items.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center text-blue-600 mb-6 border border-slate-100">
                  <IconRenderer name={item.icon} className="w-7 h-7" />
                </div>
                <EditableText
                  text={item.title}
                  isEditMode={isEditMode}
                  onBlur={(val) => {
                    const items = [...data.trustIndicators.items];
                    items[idx].title = val;
                    updateField('trustIndicators.items', items);
                  }}
                  className="text-lg font-black text-slate-900 mb-2 truncate px-2"
                />
                <EditableText
                  text={item.description}
                  isEditMode={isEditMode}
                  onBlur={(val) => {
                    const items = [...data.trustIndicators.items];
                    items[idx].description = val;
                    updateField('trustIndicators.items', items);
                  }}
                  className="text-slate-500 text-sm font-bold leading-snug max-w-[200px]"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Checklist Section */}
      <section className="py-24 md:py-40 px-6 md:px-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <EditableText
              text={data.benefits.title}
              isEditMode={isEditMode}
              onBlur={(val) => updateField('benefits.title', val)}
              className="text-4xl md:text-6xl font-black tracking-tight text-slate-900"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-10">
            {data.benefits.items.map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-6 p-6 rounded-2xl bg-slate-50 border border-transparent hover:border-blue-100 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                  <CheckCircle size={20} />
                </div>
                <EditableText
                  text={benefit}
                  isEditMode={isEditMode}
                  onBlur={(val) => {
                    const items = [...data.benefits.items];
                    items[idx] = val;
                    updateField('benefits.items', items);
                  }}
                  className="text-lg md:text-xl font-bold text-slate-900"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section (Dark) */}
      <section className="py-24 md:py-40 px-6 md:px-12 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-600/10 skew-x-12 translate-x-1/2"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-24 gap-8">
            <div className="max-w-2xl">
              <div className="text-blue-400 font-bold text-xs uppercase tracking-[0.2em] mb-4">Our Method</div>
              <EditableText
                text={data.process.title}
                isEditMode={isEditMode}
                onBlur={(val) => updateField('process.title', val)}
                className="text-4xl md:text-6xl font-black tracking-tight"
                as="h2"
              />
            </div>
            <div className="text-slate-400 font-bold max-w-sm md:text-right border-l md:border-l-0 md:border-r border-blue-500/30 pl-8 md:pl-0 md:pr-8 uppercase tracking-widest text-xs leading-relaxed">
              Transparent & Professional Workflow From Start To Finish
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {data.process.steps.map((step, idx) => (
              <div key={idx} className="relative group">
                {idx < 2 && (
                  <div className="hidden md:block absolute top-10 -right-6 w-12 h-px bg-slate-800 z-0"></div>
                )}
                <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center text-white text-3xl font-black mb-10 transition-transform group-hover:scale-110 shadow-2xl shadow-blue-500/20">
                  {idx + 1}
                </div>
                <EditableText
                  text={step.title}
                  isEditMode={isEditMode}
                  onBlur={(val) => {
                    const steps = [...data.process.steps];
                    steps[idx].title = val;
                    updateField('process.steps', steps);
                  }}
                  className="text-2xl font-bold mb-4 tracking-tight"
                  as="h3"
                />
                <EditableText
                  text={step.description}
                  isEditMode={isEditMode}
                  onBlur={(val) => {
                    const steps = [...data.process.steps];
                    steps[idx].description = val;
                    updateField('process.steps', steps);
                  }}
                  className="text-slate-400 text-lg font-medium leading-relaxed"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credentials Section */}
      <section className="py-24 md:py-40 px-6 md:px-12 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:grid md:grid-cols-12 gap-16 md:gap-24 items-center">
          <div className="md:col-span-7 space-y-12">
            <div>
              <EditableText
                text={data.credentials.title}
                isEditMode={isEditMode}
                onBlur={(val) => updateField('credentials.title', val)}
                className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1] mb-8"
                as="h2"
              />
              <EditableText
                text={data.credentials.description}
                isEditMode={isEditMode}
                onBlur={(val) => updateField('credentials.description', val)}
                className="text-slate-600 text-xl font-medium leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {data.credentials.badges.map((badge, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-white hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                    <Award size={24} />
                  </div>
                  <EditableText
                    text={badge}
                    isEditMode={isEditMode}
                    onBlur={(val) => {
                      const badges = [...data.credentials.badges];
                      badges[idx] = val;
                      updateField('credentials.badges', badges);
                    }}
                    className="text-xs font-black uppercase tracking-widest text-slate-800"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-4 items-center pt-8">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-slate-200 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div>
                <div className="flex text-yellow-500 mb-1">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} fill="currentColor" />)}
                </div>
                <div className="text-xs font-black text-slate-900 uppercase tracking-tight">4.9/5 Service Excellence</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 w-full">
            <EditableImage
              src={data.credentials.teamImage}
              alt="Team"
              className="rounded-[3rem] shadow-2xl aspect-[3/4] w-full"
              isEditMode={isEditMode}
              onUpload={(base64) => updateField('credentials.teamImage', base64)}
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 md:py-40 px-6 md:px-12 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-24">
            <div className="text-blue-600 font-bold text-xs uppercase tracking-[0.2em] mb-4">FAQ</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6">Common Questions</h2>
            <div className="w-20 h-1.5 bg-blue-600 mx-auto rounded-full"></div>
          </div>

          <div className="space-y-6">
            {data.faqs.map((faq, idx) => (
              <div key={idx} className="bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-slate-100 group hover:border-blue-100 transition-all">
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <HelpCircle size={24} />
                  </div>
                  <div className="space-y-4">
                    <EditableText
                      text={faq.question}
                      isEditMode={isEditMode}
                      onBlur={(val) => {
                        const faqs = [...data.faqs];
                        faqs[idx].question = val;
                        updateField('faqs', faqs);
                      }}
                      className="text-xl md:text-2xl font-black tracking-tight text-slate-900"
                      as="h4"
                    />
                    <EditableText
                      text={faq.answer}
                      isEditMode={isEditMode}
                      onBlur={(val) => {
                        const faqs = [...data.faqs];
                        faqs[idx].answer = val;
                        updateField('faqs', faqs);
                      }}
                      className="text-slate-500 text-lg font-medium leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer / Final CTA */}
      <section className="bg-slate-900 py-32 px-6 text-center text-white">
        <div className="max-w-3xl mx-auto space-y-10">
          <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-none mb-4">Ready to start your project?</h2>
          <p className="text-slate-400 text-xl font-medium mb-12">Contact us today for a free, no-obligation estimate in {data.contact.location}.</p>
          <a
            href={`tel:${data.contact.phone}`}
            className="inline-flex items-center gap-4 px-12 py-7 bg-blue-600 text-white font-black rounded-[2rem] shadow-2xl transition-all hover:scale-105 active:scale-95 uppercase tracking-tighter text-xl"
            style={{ backgroundColor: primaryColor }}
          >
            {formatPhoneNumber(data.contact.phone)} <ArrowRight size={24} />
          </a>
          <div className="pt-20 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-8 opacity-50 text-xs font-bold uppercase tracking-widest">
            <span>© 2026 {data.contact.companyName}</span>
            <div className="flex gap-10">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SiteRenderer;
