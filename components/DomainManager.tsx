import React, { useState } from 'react';
import { SiteInstance } from '../types.js';
import { supabase } from '../services/supabaseService.js';
import { Globe, ExternalLink, Loader2, CheckCircle, Link2 } from 'lucide-react';

interface DomainManagerProps {
  site: SiteInstance;
  onDomainConnected: (domain: string) => void;
}

function sanitizeDomain(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/[^a-z0-9.-]/g, '');
}

const DomainManager: React.FC<DomainManagerProps> = ({ site, onDomainConnected }) => {
  const [domainInput, setDomainInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [error, setError] = useState('');

  // If domain is already connected, show connected state
  if (site.customDomain) {
    return (
      <div className="bg-[#0D1117] border border-white/10 rounded-2xl p-6">
        <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Custom Domain</div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Globe size={20} className="text-green-400" />
          </div>
          <div className="flex-1">
            <a
              href={`https://${site.customDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-bold transition-colors flex items-center gap-2"
            >
              {site.customDomain} <ExternalLink size={14} />
            </a>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-green-500/30 bg-green-500/10 text-green-400">
            Connected
          </span>
        </div>

        {/* DNS Instructions (always show for reference) */}
        <div className="mt-4 bg-[#05070A] border border-white/5 rounded-xl p-4">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">DNS Records Required</p>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex gap-4 text-gray-300">
              <span className="text-gray-500 w-16">CNAME</span>
              <span className="text-gray-500 w-12">www</span>
              <span>ablarme.com</span>
            </div>
            <div className="flex gap-4 text-gray-300">
              <span className="text-gray-500 w-16">CNAME</span>
              <span className="text-gray-500 w-12">@</span>
              <span>ablarme.com</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleConnectDomain = async () => {
    const domain = sanitizeDomain(domainInput);
    if (!domain || !domain.includes('.')) {
      setError('Please enter a valid domain (e.g., yourbusiness.com)');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      // Save custom_domain to Supabase
      const { error: updateError } = await supabase
        .from('sites')
        .update({
          custom_domain: domain,
          updated_at: new Date().toISOString(),
        })
        .eq('id', site.id);

      if (updateError) throw new Error(updateError.message);

      // Purge cache for both subdomain and custom domain
      await fetch('/api/cloudflare/purge-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: site.subdomain,
          custom_domain: domain,
        }),
      });

      setShowInstructions(true);
      onDomainConnected(domain);
    } catch (err: any) {
      console.error('[Domain] Connection failed:', err);
      setError(err.message || 'Failed to connect domain');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConnectDomain();
    }
  };

  return (
    <div className="bg-[#0D1117] border border-white/10 rounded-2xl p-6 space-y-6">
      <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">Custom Domain</div>

      {!showInstructions ? (
        <>
          <p className="text-gray-400 text-sm">
            Connect your own domain to your website. You'll need to update your DNS records after connecting.
          </p>

          {/* Domain Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Link2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={domainInput}
                onChange={(e) => {
                  setDomainInput(e.target.value);
                  setError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder="yourbusiness.com"
                className="w-full bg-[#05070A] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 text-sm font-medium outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              onClick={handleConnectDomain}
              disabled={!domainInput.trim() || isConnecting}
              className="bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
              Connect
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
        </>
      ) : (
        <>
          {/* Success + DNS Instructions */}
          <div className="flex items-center gap-3 text-green-400">
            <CheckCircle size={20} />
            <span className="font-bold">Domain connected! Now update your DNS records.</span>
          </div>

          <div className="bg-[#05070A] border border-white/5 rounded-xl p-5 space-y-4">
            <p className="text-white text-sm font-bold">
              Add these DNS records at your domain registrar:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                    <th className="text-left pb-2 pr-4">Type</th>
                    <th className="text-left pb-2 pr-4">Name</th>
                    <th className="text-left pb-2">Value</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300 font-mono">
                  <tr>
                    <td className="py-1.5 pr-4">CNAME</td>
                    <td className="py-1.5 pr-4">www</td>
                    <td className="py-1.5">ablarme.com</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-4">CNAME</td>
                    <td className="py-1.5 pr-4">@</td>
                    <td className="py-1.5">ablarme.com</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-gray-500 text-xs">
              DNS changes can take up to 24 hours to propagate. Your site will be available on your custom domain once the records are active.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default DomainManager;
