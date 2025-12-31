import { GeneratedSiteData } from "../types";

const VERCEL_API_TOKEN = "uDrB7AMqZisZk7s8noSD0ptF";
const VERCEL_API_URL = "https://api.vercel.com";

/**
 * Generate static HTML from site data
 */
const generateStaticHTML = (data: GeneratedSiteData): string => {
  const { hero, services, repairBenefits, aboutUs, additionalBenefits, industryValue, faqs, contact } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${contact.companyName} - ${hero.headline.line1}</title>
  <meta name="description" content="${hero.subtext}">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: 'Avenir Light', Avenir, -apple-system, BlinkMacSystemFont, sans-serif; }
    .hero-gradient { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); }
  </style>
</head>
<body class="antialiased">
  <!-- Navigation -->
  <nav class="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
    <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
      <div class="text-2xl font-bold text-gray-900">${contact.companyName}</div>
      <a href="tel:${contact.phone}" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
        Get an estimate
      </a>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="relative pt-24 pb-20 min-h-[600px] flex items-center" style="background-image: url('${hero.heroImage}'); background-size: cover; background-position: center;">
    <div class="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-blue-800/70"></div>
    <div class="relative max-w-7xl mx-auto px-6 text-white">
      <div class="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm mb-6">
        ${hero.badge}
      </div>
      <h1 class="text-5xl md:text-6xl font-bold mb-6 leading-tight">
        ${hero.headline.line1}<br>
        ${hero.headline.line2}<br>
        ${hero.headline.line3}
      </h1>
      <p class="text-xl mb-8 max-w-2xl">${hero.subtext}</p>
      <a href="tel:${contact.phone}" class="inline-block bg-white text-blue-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition">
        Get an estimate
      </a>
    </div>
  </section>

  <!-- Services Section -->
  <section class="py-20 bg-gray-50">
    <div class="max-w-7xl mx-auto px-6">
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        ${services.cards.map(card => `
          <div class="bg-white p-6 rounded-xl shadow-md">
            <div class="text-4xl mb-4">${card.icon}</div>
            <h3 class="text-xl font-bold mb-3 text-gray-900">${card.title}</h3>
            <p class="text-gray-600">${card.description}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- Repair Benefits Section -->
  <section class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-6">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <img src="${repairBenefits.image}" alt="${repairBenefits.title}" class="rounded-xl shadow-lg">
        <div>
          <h2 class="text-4xl font-bold mb-8 text-gray-900">${repairBenefits.title}</h2>
          ${repairBenefits.items.map(item => `
            <div class="mb-6">
              <div class="flex items-start gap-3">
                <div class="text-2xl">${item.icon}</div>
                <div>
                  <h3 class="text-xl font-bold mb-2 text-gray-900">${item.title}</h3>
                  <p class="text-gray-600">${item.description}</p>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  </section>

  <!-- About Us Section -->
  <section class="py-20 bg-gray-50">
    <div class="max-w-7xl mx-auto px-6">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 class="text-4xl font-bold mb-6 text-gray-900">${aboutUs.title}</h2>
          <p class="text-gray-600 text-lg mb-8 leading-relaxed">${aboutUs.content}</p>
          <a href="tel:${contact.phone}" class="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-bold hover:bg-blue-700 transition">
            Get an estimate
          </a>
        </div>
        <img src="${aboutUs.image}" alt="${aboutUs.title}" class="rounded-xl shadow-lg">
      </div>
    </div>
  </section>

  <!-- Additional Benefits Section -->
  <section class="py-20 bg-gray-900 text-white">
    <div class="max-w-7xl mx-auto px-6">
      <div class="grid md:grid-cols-3 gap-8">
        ${additionalBenefits.cards.map(card => `
          <div class="text-center">
            <div class="text-5xl mb-4">${card.icon}</div>
            <h3 class="text-2xl font-bold mb-3">${card.title}</h3>
            <p class="text-gray-300">${card.description}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- Industry Value Section -->
  ${industryValue ? `
  <section class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-6">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <img src="${industryValue.valueImage}" alt="${industryValue.title}" class="rounded-xl shadow-lg">
        <div>
          <h2 class="text-4xl font-bold mb-6 text-gray-900">${industryValue.title}</h2>
          <p class="text-gray-600 text-lg leading-relaxed">${industryValue.content}</p>
        </div>
      </div>
    </div>
  </section>
  ` : ''}

  <!-- FAQ Section -->
  <section class="py-20 bg-gray-50">
    <div class="max-w-7xl mx-auto px-6">
      <h2 class="text-4xl font-bold text-center mb-12 text-gray-900">Frequently Asked Questions</h2>
      <div class="grid md:grid-cols-2 gap-8">
        ${faqs.map(faq => `
          <div class="bg-white p-6 rounded-xl shadow-md">
            <h3 class="text-xl font-bold mb-3 text-gray-900">${faq.question}</h3>
            <p class="text-gray-600">${faq.answer}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- Footer / Contact -->
  <footer class="bg-gray-900 text-white py-12">
    <div class="max-w-7xl mx-auto px-6 text-center">
      <h3 class="text-3xl font-bold mb-4">${contact.companyName}</h3>
      <p class="text-gray-300 mb-2">${contact.location}</p>
      <a href="tel:${contact.phone}" class="text-blue-400 text-xl font-semibold hover:text-blue-300">
        ${contact.phone}
      </a>
    </div>
  </footer>
</body>
</html>`;
};

/**
 * Deploy site to Vercel
 */
export const deployToVercel = async (
  siteData: GeneratedSiteData,
  onProgress?: (message: string) => void
): Promise<{ url: string; deploymentId: string }> => {
  try {
    onProgress?.("Generating static HTML...");
    const html = generateStaticHTML(siteData);

    onProgress?.("Preparing deployment files...");

    // Create deployment using Vercel API
    const projectName = `${siteData.contact.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;

    const deploymentPayload = {
      name: projectName,
      files: [
        {
          file: "index.html",
          data: html
        }
      ],
      projectSettings: {
        framework: null,
        buildCommand: null,
        outputDirectory: null
      },
      target: "production"
    };

    onProgress?.("Deploying to Vercel...");

    const response = await fetch(`${VERCEL_API_URL}/v13/deployments`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VERCEL_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(deploymentPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Vercel deployment failed: ${errorData.error?.message || response.statusText}`);
    }

    const deployment = await response.json();

    onProgress?.("Deployment successful! Site is live.");

    return {
      url: `https://${deployment.url}`,
      deploymentId: deployment.id
    };

  } catch (error: any) {
    console.error("Vercel deployment error:", error);
    throw new Error(`Deployment failed: ${error.message}`);
  }
};
