
import React, { useState, useCallback, useRef, useEffect } from 'react';
import GeneratorForm from './components/GeneratorForm.js';
import SiteRenderer from './components/SiteRenderer.js';
import LoadingIndicator from './components/LoadingIndicator.js';
import AuthModal from './components/AuthModal.js';
import DeploymentSuccessModal from './components/DeploymentSuccessModal.js';
import Dashboard from './components/Dashboard.js';
import { generateSiteContent } from './services/geminiService.js';
import { saveSite, loadUserSite, migrateSiteToUser } from './services/siteService.js';
import { saveSiteInstance, getAllSites } from './services/storageService.js';
import { deploySite } from './services/deploymentService.js';
import { useAuth } from './contexts/AuthContext.js';
import { GeneratorInputs, GeneratedSiteData, SiteInstance, AppView } from './types.js';
import { ChevronLeft, CloudCheck, Loader2, Rocket, ExternalLink, Save } from 'lucide-react';

declare global {
  interface Window {
    aistudio: any;
    fbq: any;
  }
}

const MarqueeText: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="flex-1 overflow-hidden whitespace-nowrap min-w-0">
      <div className="inline-block animate-[marquee_12s_linear_infinite] font-bold text-sm tracking-tight">
        {text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

const SaveStatusBadge: React.FC<{ saveStatus: 'idle' | 'saving' | 'saved' }> = ({ saveStatus }) => (
  <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-widest bg-white/10 px-3 py-1.5 rounded-full border border-white/20 whitespace-nowrap">
    {saveStatus === 'saving' ? (
      <span className="flex items-center gap-1 text-blue-300">
        <Loader2 size={12} className="animate-spin" /> Saving
      </span>
    ) : saveStatus === 'saved' ? (
      <span className="flex items-center gap-1 text-green-300">
        <CloudCheck size={14} /> Saved
      </span>
    ) : (
      <span className="opacity-80 uppercase">Editor</span>
    )}
  </div>
);

const App: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading, signOut, profile } = useAuth();

  // Navigation
  const [currentView, setCurrentView] = useState<AppView>('generator');

  // Generator state
  const [isGenerating, setIsGenerating] = useState(false);

  // Site state
  const [activeSite, setActiveSite] = useState<SiteInstance | null>(null);
  const [formInputs, setFormInputs] = useState<GeneratorInputs | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<any>(null);

  // Deployment state
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [deploymentUrl, setDeploymentUrl] = useState<string>('');
  const [deploymentMessage, setDeploymentMessage] = useState<string>('');

  // Modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ─── On authenticated load, navigate to dashboard and load site ───
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && currentView === 'generator') {
      setCurrentView('dashboard');
      loadUserSite(user.id).then(site => {
        if (site) setActiveSite(site);
      });
    }
  }, [authLoading, isAuthenticated, user]);

  // ─── Handle Payment Success & Auto-Deploy ───
  useEffect(() => {
    const checkPaymentAndDeploy = async () => {
      if (!window.location.search.includes('payment=success')) return;

      // Clear the URL param immediately to prevent re-trigger
      window.history.replaceState({}, '', window.location.pathname);

      // Generate a unique event ID for deduplication between Pixel and CAPI
      const eventId = crypto.randomUUID();

      // Fire Facebook Pixel Purchase Event (client-side) with eventID for dedup
      if (window.fbq) {
        window.fbq('track', 'Purchase', {
          value: parseFloat(import.meta.env.VITE_PURCHASE_VALUE || '10.00'),
          currency: import.meta.env.VITE_PURCHASE_CURRENCY || 'USD'
        }, { eventID: eventId });
      }

      // Fire server-side Facebook CAPI Purchase Event (fire and forget)
      fetch('api/fb-purchase-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          event_source_url: window.location.origin,
          user_agent: navigator.userAgent,
        }),
      }).catch(err => console.error('[FB CAPI] Client-side call failed:', err));

      setDeploymentStatus('deploying');
      setDeploymentMessage('Payment Verified! Starting automated deployment...');
      setCurrentView('editor');

      try {
        // Load the latest site from storage
        const sites = await getAllSites();

        if (sites.length === 0) {
          throw new Error("No saved site found to deploy. Please regenerate.");
        }

        const latestSite = sites.sort((a, b) => b.lastSaved - a.lastSaved)[0];
        setActiveSite(latestSite);

        // Deploy it
        const { generateSlug } = await import('./services/urlService.js');
        const projectName = generateSlug(latestSite.data.contact.companyName);

        setDeploymentMessage('Building and deploying your site to Vercel...');
        await deploySite(latestSite.data, projectName);

        // 10-second countdown
        for (let i = 10; i > 0; i--) {
          setDeploymentMessage(`Deploying... ${i}s`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const finalUrl = `https://${projectName}.vercel.app`;

        // Update site with deployment info
        const deployedSite: SiteInstance = {
          ...latestSite,
          deployedUrl: finalUrl,
          deploymentStatus: 'deployed',
          lastSaved: Date.now(),
        };
        setActiveSite(deployedSite);
        setDeploymentUrl(finalUrl);

        // Save deployment info to both stores
        await saveSite(deployedSite, user?.id);

        // Show appropriate modal based on auth status
        if (!isAuthenticated) {
          setDeploymentStatus('idle');
          setShowSuccessModal(true);
        } else {
          setDeploymentStatus('success');
          setDeploymentMessage('Success! Your site is live.');
          setTimeout(() => {
            window.open(finalUrl, '_blank');
          }, 1000);
        }

      } catch (error: any) {
        console.error("Auto-deploy failed:", error);
        setDeploymentStatus('error');
        setDeploymentMessage(error.message || 'Deployment failed after payment.');
      }
    };

    checkPaymentAndDeploy();
  }, []);

  // ─── Handle domain payment success ───
  useEffect(() => {
    const checkDomainPayment = async () => {
      const params = new URLSearchParams(window.location.search);
      if (!params.has('domain_payment') || params.get('domain_payment') !== 'success') return;

      const sessionId = params.get('session_id');
      window.history.replaceState({}, '', window.location.pathname);

      if (!sessionId || !activeSite) return;

      try {
        const response = await fetch('api/purchase-domain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) throw new Error('Domain purchase failed');
        const { domain, orderId } = await response.json();

        const updatedSite: SiteInstance = {
          ...activeSite,
          customDomain: domain,
          domainOrderId: orderId,
          lastSaved: Date.now(),
        };
        setActiveSite(updatedSite);
        await saveSite(updatedSite, user?.id);
      } catch (err) {
        console.error('[Domain] Purchase failed:', err);
      }
    };

    checkDomainPayment();
  }, [activeSite?.id]);

  // ─── Navigation helpers ───
  const navigateToDashboard = useCallback(() => {
    setCurrentView('dashboard');
  }, []);

  const navigateToEditor = useCallback(() => {
    if (activeSite) {
      setCurrentView('editor');
    }
  }, [activeSite]);

  const navigateToGenerator = useCallback(() => {
    setActiveSite(null);
    setFormInputs(null);
    setCurrentView('generator');
  }, []);

  // ─── Auth handlers ───
  const handleAuthSuccess = useCallback(async (mode: 'signin' | 'signup') => {
    setShowAuthModal(false);
    setShowSuccessModal(false);

    // Small delay to let auth state propagate
    await new Promise(r => setTimeout(r, 500));

    if (mode === 'signup' && activeSite) {
      // Migrate current site from IndexedDB to Supabase
      const { data: { user: newUser } } = await (await import('./services/supabaseService.js')).supabase.auth.getUser();
      if (newUser) {
        await migrateSiteToUser(activeSite, newUser.id);
      }
    } else if (mode === 'signin') {
      // Load user's site from Supabase
      const { data: { user: existingUser } } = await (await import('./services/supabaseService.js')).supabase.auth.getUser();
      if (existingUser) {
        const site = await loadUserSite(existingUser.id);
        if (site) setActiveSite(site);
      }
    }

    setCurrentView('dashboard');
  }, [activeSite]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setActiveSite(null);
    setFormInputs(null);
    setCurrentView('generator');
  }, [signOut]);

  // ─── Generation handler ───
  const handleGenerate = async (newInputs: GeneratorInputs) => {
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
      }
    }

    setIsGenerating(true);
    setCurrentView('editor');
    try {
      // Capture lead data (fire and forget)
      import('./services/leadService.js').then(({ captureLead }) => {
        captureLead(newInputs).catch(err => console.error("Lead capture failed:", err));
      }).catch(err => console.error("Lead service import failed:", err));

      const data = await generateSiteContent(newInputs);
      const instance: SiteInstance = {
        id: Math.random().toString(36).substring(7),
        data: { ...data, gallery: { title: 'Our Work', subtitle: 'See our latest projects', images: [null, null, null] } },
        lastSaved: Date.now(),
        formInputs: newInputs,
        deploymentStatus: 'draft',
      };
      setActiveSite(instance);
      setFormInputs(newInputs);
      await saveSiteInstance(instance);
    } catch (error: any) {
      console.error("Generation failed:", error);
      if (error.message?.includes("Requested entity was not found") && window.aistudio) {
        alert("The selected model is not available with this API key. Please select a different key.");
        await window.aistudio.openSelectKey();
      } else {
        alert(`Generation Error: ${error.message || "Please check your API key and try again."}`);
      }
      setCurrentView('generator');
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Auto-save (debounced, dual-write) ───
  const updateSiteData = useCallback(async (newData: GeneratedSiteData) => {
    if (!activeSite) return;

    setSaveStatus('saving');
    const updatedSite = { ...activeSite, data: newData, lastSaved: Date.now() };
    setActiveSite(updatedSite);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveSite(updatedSite, user?.id);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1500);
      } catch (err) {
        console.error("Save failed:", err);
        setSaveStatus('idle');
      }
    }, 600);
  }, [activeSite, user?.id]);

  // ─── Manual save ───
  const handleManualSave = useCallback(async () => {
    if (!activeSite) return;
    setSaveStatus('saving');
    try {
      await saveSite(activeSite, user?.id);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (err) {
      console.error('Manual save failed:', err);
      setSaveStatus('idle');
    }
  }, [activeSite, user?.id]);

  // ─── Pre-payment deploy (checkout) ───
  const handleDeploy = async () => {
    if (!activeSite) return;

    // Save locally one last time
    setSaveStatus('saving');
    await saveSiteInstance(activeSite);
    setSaveStatus('saved');

    // Call dynamic checkout API
    setDeploymentStatus('deploying');
    setDeploymentMessage('Redirecting to secure payment...');

    try {
      const response = await fetch('api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: activeSite.data.contact.companyName,
          siteId: activeSite.id
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const { error } = await response.json();
          throw new Error(error || `Server returned ${response.status}`);
        } else {
          throw new Error(`API error (${response.status}): The endpoint could not be found. If you just pushed changes, please wait a minute for Vercel to finish building.`);
        }
      }

      const { url, error } = await response.json();
      if (error) throw new Error(error);
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Checkout failed:", err);
      setDeploymentStatus('error');
      setDeploymentMessage(err.message || 'Failed to start payment process.');
    }
  };

  // ─── Publish (re-deployment for post-payment) ───
  const handlePublish = async () => {
    if (!activeSite) return;

    // Phase 1: Save
    setSaveStatus('saving');
    await saveSite(activeSite, user?.id);
    setSaveStatus('saved');

    // Phase 2: Overlay
    setDeploymentStatus('deploying');
    setDeploymentMessage('Publishing your changes...');

    try {
      const { generateSlug } = await import('./services/urlService.js');
      const projectName = generateSlug(activeSite.data.contact.companyName);

      // Phase 3: Deploy
      setDeploymentMessage('Building and deploying your site...');
      await deploySite(activeSite.data, projectName);

      // Phase 4: 3-second countdown
      for (let i = 3; i > 0; i--) {
        setDeploymentMessage(`Almost there... ${i}s`);
        await new Promise(r => setTimeout(r, 1000));
      }

      // Phase 5: Success
      const finalUrl = `https://${projectName}.vercel.app`;
      setDeploymentStatus('success');
      setDeploymentUrl(finalUrl);
      setDeploymentMessage('Changes published successfully!');

      const updatedSite: SiteInstance = {
        ...activeSite,
        deployedUrl: finalUrl,
        deploymentStatus: 'deployed',
        lastSaved: Date.now(),
      };
      setActiveSite(updatedSite);
      await saveSite(updatedSite, user?.id);

      // Auto-open in 1s
      setTimeout(() => window.open(finalUrl, '_blank'), 1000);
    } catch (error: any) {
      setDeploymentStatus('error');
      setDeploymentMessage(error.message || 'Publishing failed.');
    }
  };

  // ─── Back from editor ───
  const handleBackFromEditor = useCallback(() => {
    if (isAuthenticated) {
      setCurrentView('dashboard');
    } else {
      if (confirm("Go back to generator? Your current site is saved locally.")) {
        setActiveSite(null);
        setCurrentView('generator');
      }
    }
  }, [isAuthenticated]);

  // ─── AppReady guard ───
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#05070A] flex items-center justify-center" style={{ fontFamily: '"Avenir Light", Avenir, sans-serif' }}>
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const isPostPayment = activeSite?.deploymentStatus === 'deployed';

  return (
    <div className="min-h-screen bg-[#05070A] font-light" style={{ fontFamily: '"Avenir Light", Avenir, sans-serif' }}>

      {/* ─── Generator View ─── */}
      {currentView === 'generator' && !isGenerating && (
        <div className="pt-4 md:pt-6 pb-20 px-6">
          <GeneratorForm
            onSubmit={handleGenerate}
            isLoading={isGenerating}
            onSignIn={() => { setAuthModalMode('signin'); setShowAuthModal(true); }}
          />
        </div>
      )}

      {isGenerating && <LoadingIndicator />}

      {/* ─── Editor View ─── */}
      {currentView === 'editor' && activeSite && !isGenerating && (
        <div className="flex flex-col min-h-screen">

          {/* Post-payment toolbar */}
          {isPostPayment ? (
            <div className="sticky top-0 z-[110] bg-[#0D1117] text-white px-4 py-3 shadow-lg flex items-center justify-between min-h-[60px] border-b border-white/10">
              <button
                onClick={handleBackFromEditor}
                className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={20} />
                <span className="text-sm font-bold hidden sm:inline">Back to Dashboard</span>
              </button>

              <div className="flex items-center gap-2 md:gap-3">
                <SaveStatusBadge saveStatus={saveStatus} />

                <button
                  onClick={handleManualSave}
                  className="bg-white/10 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold uppercase tracking-wider hover:bg-white/20 transition-colors flex items-center gap-2"
                >
                  <Save size={14} /> Save
                </button>

                <button
                  onClick={handlePublish}
                  disabled={deploymentStatus === 'deploying'}
                  className="bg-blue-600 text-white px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {deploymentStatus === 'deploying' ? <Loader2 className="animate-spin" size={14} /> : <Rocket size={14} />}
                  Publish
                </button>
              </div>
            </div>
          ) : (
            /* Pre-payment red banner */
            <div className="sticky top-0 z-[110] bg-red-600 text-white px-4 py-2 md:py-3 shadow-lg flex items-center justify-between min-h-[48px]">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  onClick={handleBackFromEditor}
                  className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
                  title="Back to Generator"
                >
                  <ChevronLeft size={20} />
                </button>
                <MarqueeText text="Tap to edit text & images, then deploy below." />
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-widest bg-white/10 px-3 py-1.5 rounded-full border border-white/20 whitespace-nowrap">
                  {saveStatus === 'saving' ? (
                    <span className="flex items-center gap-1 text-blue-100">
                      <Loader2 size={12} className="animate-spin" /> Saving
                    </span>
                  ) : saveStatus === 'saved' ? (
                    <span className="flex items-center gap-1 text-green-300">
                      <CloudCheck size={14} /> Saved
                    </span>
                  ) : (
                    <span className="opacity-80 uppercase">Editor</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <main className={`bg-white ${isPostPayment ? '' : 'pb-[340px] md:pb-52'}`}>
            <SiteRenderer
              data={activeSite.data}
              isEditMode={true}
              onUpdate={updateSiteData}
            />
          </main>

          {/* Pre-payment bottom bar */}
          {!isPostPayment && (
            <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-100 p-4 md:p-5 shadow-[0_-8px_20px_rgba(0,0,0,0.05)]">
              <div className="max-w-3xl mx-auto space-y-4">
                {/* HOW IT WORKS + steps */}
                <div className="text-center">
                  <p className="text-black font-bold text-sm uppercase tracking-[0.2em] mb-2">How It Works</p>
                  <div className="flex flex-col md:flex-row md:justify-center md:gap-6 gap-1">
                    <span className="text-black font-bold text-sm">1. Edit your text & images above</span>
                    <span className="text-black font-bold text-sm">2. Click deploy when ready</span>
                    <span className="text-black font-bold text-sm">3. Your site goes live instantly</span>
                  </div>
                </div>

                {/* Pricing + deploy button */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-3">
                  <p className="text-black font-bold text-sm uppercase tracking-tight text-center">
                    PAY ONLY $10/MONTH WEBSITE HOSTING TO HAVE YOUR CUSTOM SITE LIVE & ACTIVE
                  </p>
                  <button
                    onClick={handleDeploy}
                    disabled={deploymentStatus === 'deploying'}
                    className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.95] transition-all uppercase tracking-wider disabled:opacity-50"
                  >
                    {deploymentStatus === 'deploying' ? <Loader2 className="animate-spin" size={18} /> : <Rocket size={18} />}
                    Deploy Website
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Deployment Status Overlay (deploying / error states) */}
          {(deploymentStatus === 'deploying' || deploymentStatus === 'error') && (
            <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
              <div className="bg-[#05070A] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl">
                {deploymentStatus === 'deploying' && (
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                      <Rocket className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Deploying Site</h3>
                      <p className="text-gray-400">{deploymentMessage}</p>
                    </div>
                  </div>
                )}

                {deploymentStatus === 'error' && (
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
                      <span className="text-red-500 text-4xl font-bold">!</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Deployment Failed</h3>
                      <p className="text-red-400 mb-6">{deploymentMessage}</p>
                      <button
                        onClick={() => setDeploymentStatus('idle')}
                        className="bg-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors w-full"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Post-publish success overlay (for authenticated users) */}
          {deploymentStatus === 'success' && isAuthenticated && (
            <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
              <div className="bg-[#05070A] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl">
                <div className="flex flex-col items-center gap-6">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CloudCheck className="text-green-500" size={40} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Changes Published!</h3>
                    <p className="text-gray-400 mb-6">{deploymentMessage}</p>
                    <a
                      href={deploymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
                    >
                      View Live Site <ExternalLink size={18} />
                    </a>
                  </div>
                  <button
                    onClick={() => setDeploymentStatus('idle')}
                    className="text-gray-500 hover:text-white text-sm font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Dashboard View ─── */}
      {currentView === 'dashboard' && isAuthenticated && (
        <Dashboard
          site={activeSite}
          onEditSite={navigateToEditor}
          onSignOut={handleSignOut}
          onSiteUpdated={(updatedSite) => setActiveSite(updatedSite)}
        />
      )}

      {/* ─── Deployment Success Modal (unauthenticated, post-payment) ─── */}
      <DeploymentSuccessModal
        isOpen={showSuccessModal}
        deployedUrl={deploymentUrl}
        onCreateAccount={() => {
          setShowSuccessModal(false);
          setAuthModalMode('signup');
          setShowAuthModal(true);
        }}
        onSkip={() => setShowSuccessModal(false)}
      />

      {/* ─── Auth Modal ─── */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
        onAuthSuccess={handleAuthSuccess}
        signInOnly={authModalMode === 'signin'}
      />
    </div>
  );
};

export default App;
