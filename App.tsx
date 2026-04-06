
import React, { useState, useCallback, useRef, useEffect } from 'react';
import GeneratorForm from './components/GeneratorForm.js';
import SiteRenderer from './components/SiteRenderer.js';
import LoadingIndicator from './components/LoadingIndicator.js';
import AuthModal from './components/AuthModal.js';
import DeploymentSuccessModal from './components/DeploymentSuccessModal.js';
import Dashboard from './components/Dashboard.js';
import PrePaymentBanner from './components/PrePaymentBanner.js';
import { generateSiteContent } from './services/geminiService.js';
import { saveSite, loadUserSite, migrateSiteToUser } from './services/siteService.js';
import { saveSiteInstance, getAllSites, getSiteInstance } from './services/storageService.js';
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

  const [currentView, setCurrentView] = useState<AppView>('generator');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSite, setActiveSite] = useState<SiteInstance | null>(null);
  const [formInputs, setFormInputs] = useState<GeneratorInputs | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<any>(null);

  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [deploymentUrl, setDeploymentUrl] = useState<string>('');
  const [deploymentMessage, setDeploymentMessage] = useState<string>('');

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Background/refresh protection
  const [isRestoring, setIsRestoring] = useState(true);
  const generationFailedRef = useRef(false);

  // ─── Persist view state to sessionStorage ───
  const persistView = useCallback((view: AppView, siteId?: string) => {
    setCurrentView(view);
    sessionStorage.setItem('appView', view);
    if (siteId) {
      sessionStorage.setItem('activeSiteId', siteId);
    } else if (view === 'generator') {
      sessionStorage.removeItem('activeSiteId');
      sessionStorage.removeItem('pendingFormInputs');
    }
  }, []);

  // ─── Restore view + site from sessionStorage on mount ───
  useEffect(() => {
    const restore = async () => {
      try {
        const savedView = sessionStorage.getItem('appView') as AppView | null;
        const savedSiteId = sessionStorage.getItem('activeSiteId');
        const savedFormInputs = sessionStorage.getItem('pendingFormInputs');

        if (savedView === 'editor' && savedSiteId) {
          const site = await getSiteInstance(savedSiteId);
          if (site) {
            setActiveSite(site);
            setCurrentView('editor');
            if (site.formInputs) setFormInputs(site.formInputs);
          } else if (savedFormInputs) {
            const inputs: GeneratorInputs = JSON.parse(savedFormInputs);
            setFormInputs(inputs);
            handleGenerate(inputs);
          } else {
            sessionStorage.removeItem('appView');
            sessionStorage.removeItem('activeSiteId');
          }
        } else if (savedView === 'editor' && !savedSiteId && savedFormInputs) {
          const inputs: GeneratorInputs = JSON.parse(savedFormInputs);
          setFormInputs(inputs);
          handleGenerate(inputs);
        }
      } catch {
        sessionStorage.removeItem('appView');
        sessionStorage.removeItem('activeSiteId');
        sessionStorage.removeItem('pendingFormInputs');
      } finally {
        setIsRestoring(false);
      }
    };
    restore();
  }, []);

  // ─── Auto-retry generation when returning from background ───
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && generationFailedRef.current) {
        generationFailedRef.current = false;
        const saved = sessionStorage.getItem('pendingFormInputs');
        if (saved) {
          try {
            const inputs: GeneratorInputs = JSON.parse(saved);
            handleGenerate(inputs);
          } catch {
            persistView('generator');
          }
        } else {
          persistView('generator');
        }
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // ─── On authenticated load, navigate to dashboard and load site ───
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && currentView === 'generator' && !isRestoring) {
      persistView('dashboard');
      loadUserSite(user.id).then(site => {
        if (site) setActiveSite(site);
      });
    }
  }, [authLoading, isAuthenticated, user, isRestoring]);

  // ─── Safety net: redirect away from dashboard if not authenticated ───
  useEffect(() => {
    if (!authLoading && !isAuthenticated && currentView === 'dashboard') {
      persistView('generator');
    }
  }, [authLoading, isAuthenticated, currentView]);

  // ─── Handle Payment Success & Auto-Deploy ───
  useEffect(() => {
    const checkPaymentAndDeploy = async () => {
      if (!window.location.search.includes('payment=success')) return;

      window.history.replaceState({}, '', window.location.pathname);

      const eventId = crypto.randomUUID();

      if (window.fbq) {
        window.fbq('track', 'Purchase', {
          value: parseFloat(import.meta.env.VITE_PURCHASE_VALUE || '14.00'),
          currency: import.meta.env.VITE_PURCHASE_CURRENCY || 'CAD'
        }, { eventID: eventId });
      }

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
      setDeploymentMessage('Payment Verified! Starting automated publishing...');
      persistView('editor');

      try {
        const sites = await getAllSites();
        if (sites.length === 0) throw new Error("No saved site found to publish. Please regenerate.");

        const latestSite = sites.sort((a, b) => b.lastSaved - a.lastSaved)[0];
        setActiveSite(latestSite);

        setDeploymentMessage('Uploading assets and publishing your site...');
        const { url: finalUrl, subdomain, updatedData } = await deploySite(latestSite, user?.id);

        for (let i = 3; i > 0; i--) {
          setDeploymentMessage(`Almost there... ${i}s`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const deployedSite: SiteInstance = {
          ...latestSite,
          data: updatedData,
          deployedUrl: finalUrl,
          deploymentStatus: 'deployed',
          subdomain,
          lastSaved: Date.now(),
          lastPublishedAt: Date.now(),
        };
        setActiveSite(deployedSite);
        setDeploymentUrl(finalUrl);
        await saveSite(deployedSite, user?.id);

        if (!isAuthenticated) {
          setDeploymentStatus('idle');
          setShowSuccessModal(true);
        } else {
          setDeploymentStatus('success');
          setDeploymentMessage('Success! Your site is live.');
          setTimeout(() => window.open(finalUrl, '_blank'), 1000);
        }
      } catch (error: any) {
        console.error("Auto-deploy failed:", error);
        setDeploymentStatus('error');
        setDeploymentMessage(error.message || 'Publishing failed after payment.');
      }
    };
    checkPaymentAndDeploy();
  }, []);

  // ─── Navigation helpers ───
  const navigateToDashboard = useCallback(() => { persistView('dashboard'); }, [persistView]);
  const navigateToEditor = useCallback(() => { if (activeSite) persistView('editor', activeSite.id); }, [activeSite, persistView]);
  const navigateToGenerator = useCallback(() => { setActiveSite(null); setFormInputs(null); persistView('generator'); }, [persistView]);

  // ─── Auth handlers ───
  const handleAuthSuccess = useCallback(async (mode: 'signin' | 'signup') => {
    setShowAuthModal(false);
    setShowSuccessModal(false);

    const { supabase: sb } = await import('./services/supabaseService.js');
    let authenticated = false;
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 500));
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) { authenticated = true; break; }
    }

    if (authenticated) {
      const { data: { user: authUser } } = await sb.auth.getUser();
      if (authUser) {
        if (mode === 'signup' && activeSite) await migrateSiteToUser(activeSite, authUser.id);
        else if (mode === 'signin') {
          const site = await loadUserSite(authUser.id);
          if (site) setActiveSite(site);
        }
      }
      persistView('dashboard');
    } else {
      persistView('generator');
    }
  }, [activeSite, persistView]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setActiveSite(null);
    setFormInputs(null);
    persistView('generator');
  }, [signOut, persistView]);

  // ─── Generation handler ───
  const handleGenerate = async (newInputs: GeneratorInputs) => {
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) await window.aistudio.openSelectKey();
    }

    setIsGenerating(true);
    persistView('editor');
    sessionStorage.setItem('pendingFormInputs', JSON.stringify(newInputs));

    try {
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

      sessionStorage.removeItem('pendingFormInputs');
      sessionStorage.setItem('activeSiteId', instance.id);
    } catch (error: any) {
      console.error("Generation failed:", error);

      const pendingInputs = sessionStorage.getItem('pendingFormInputs');
      if (document.hidden && pendingInputs) {
        generationFailedRef.current = true;
        return;
      }

      if (error.message?.includes("Requested entity was not found") && window.aistudio) {
        alert("The selected model is not available with this API key. Please select a different key.");
        await window.aistudio.openSelectKey();
      } else {
        alert(`Generation Error: ${error.message || "Please check your API key and try again."}`);
      }
      persistView('generator');
    } finally {
      if (!generationFailedRef.current) setIsGenerating(false);
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
    setSaveStatus('saving');
    await saveSiteInstance(activeSite);
    setSaveStatus('saved');

    setDeploymentStatus('deploying');
    setDeploymentMessage('Redirecting to secure payment...');

    try {
      const response = await fetch('api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: activeSite.data.contact.companyName, siteId: activeSite.id }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const { error } = await response.json();
          throw new Error(error || `Server returned ${response.status}`);
        } else {
          throw new Error(`API error (${response.status}): The endpoint could not be found.`);
        }
      }

      const { url, error } = await response.json();
      if (error) throw new Error(error);
      if (url) window.location.href = url;
      else throw new Error("No checkout URL returned");
    } catch (err: any) {
      console.error("Checkout failed:", err);
      setDeploymentStatus('error');
      setDeploymentMessage(err.message || 'Failed to start payment process.');
    }
  };

  // ─── Publish (re-deployment for post-payment) ───
  const handlePublish = async () => {
    if (!activeSite) return;
    setSaveStatus('saving');
    await saveSite(activeSite, user?.id);
    setSaveStatus('saved');

    setDeploymentStatus('deploying');
    setDeploymentMessage('Publishing your changes...');

    try {
      setDeploymentMessage('Publishing your site...');
      const { url: finalUrl, subdomain, updatedData } = await deploySite(activeSite, user?.id);

      for (let i = 2; i > 0; i--) {
        setDeploymentMessage(`Almost there... ${i}s`);
        await new Promise(r => setTimeout(r, 1000));
      }

      setDeploymentStatus('success');
      setDeploymentUrl(finalUrl);
      setDeploymentMessage('Changes published successfully!');

      const updatedSite: SiteInstance = {
        ...activeSite, data: updatedData, deployedUrl: finalUrl, deploymentStatus: 'deployed',
        subdomain, lastSaved: Date.now(), lastPublishedAt: Date.now(),
      };
      setActiveSite(updatedSite);
      await saveSite(updatedSite, user?.id);
      setTimeout(() => window.open(finalUrl, '_blank'), 1000);
    } catch (error: any) {
      setDeploymentStatus('error');
      setDeploymentMessage(error.message || 'Publishing failed.');
    }
  };

  const handleBackFromEditor = useCallback(() => {
    if (isAuthenticated) { persistView('dashboard'); }
    else { if (confirm("Go back to generator? Your current site is saved locally.")) { setActiveSite(null); persistView('generator'); } }
  }, [isAuthenticated, persistView]);

  if (authLoading || isRestoring) {
    return (
      <div className="min-h-screen bg-[#05070A] flex items-center justify-center" style={{ fontFamily: '"Avenir Light", Avenir, sans-serif' }}>
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const isPostPayment = activeSite?.deploymentStatus === 'deployed';

  return (
    <div className="min-h-screen bg-[#05070A] font-light" style={{ fontFamily: '"Avenir Light", Avenir, sans-serif' }}>

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

      {currentView === 'editor' && activeSite && !isGenerating && (
        <div className="flex flex-col min-h-screen">

          {isPostPayment && (
            <div className="sticky top-0 z-[110] bg-[#0D1117] text-white px-4 py-3 shadow-lg flex items-center justify-between min-h-[60px] border-b border-white/10">
              <button onClick={handleBackFromEditor} className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
                <ChevronLeft size={20} />
                <span className="text-sm font-bold hidden sm:inline">Back to Dashboard</span>
              </button>
              <div className="flex items-center gap-2 md:gap-3">
                <SaveStatusBadge saveStatus={saveStatus} />
                <button onClick={handleManualSave} className="bg-white/10 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold uppercase tracking-wider hover:bg-white/20 transition-colors flex items-center gap-2">
                  <Save size={14} /> Save
                </button>
                <button onClick={handlePublish} disabled={deploymentStatus === 'deploying'} className="bg-blue-600 text-white px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {deploymentStatus === 'deploying' ? <Loader2 className="animate-spin" size={14} /> : <Rocket size={14} />}
                  Publish
                </button>
              </div>
            </div>
          )}

          <main className={`bg-white ${isPostPayment ? '' : 'pb-24'}`}>
            <SiteRenderer data={activeSite.data} isEditMode={true} onUpdate={updateSiteData} />
          </main>

          {!isPostPayment && (
            <PrePaymentBanner onDeploy={handleDeploy} isDeploying={deploymentStatus === 'deploying'} />
          )}

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
                      <h3 className="text-xl font-bold text-white mb-2">Publishing Site</h3>
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
                      <h3 className="text-xl font-bold text-white mb-2">Publishing Failed</h3>
                      <p className="text-red-400 mb-6">{deploymentMessage}</p>
                      <button onClick={() => setDeploymentStatus('idle')} className="bg-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors w-full">Try Again</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
                    <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors">
                      View Live Site <ExternalLink size={18} />
                    </a>
                  </div>
                  <button onClick={() => setDeploymentStatus('idle')} className="text-gray-500 hover:text-white text-sm font-medium transition-colors">Close</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {currentView === 'dashboard' && isAuthenticated && (
        <Dashboard site={activeSite} onEditSite={navigateToEditor} onSignOut={handleSignOut} onSiteUpdated={(updatedSite) => setActiveSite(updatedSite)} />
      )}

      <DeploymentSuccessModal
        isOpen={showSuccessModal}
        deployedUrl={deploymentUrl}
        onCreateAccount={() => { setShowSuccessModal(false); setAuthModalMode('signup'); setShowAuthModal(true); }}
        onSkip={() => setShowSuccessModal(false)}
      />

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
