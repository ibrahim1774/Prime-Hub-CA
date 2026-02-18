import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SiteInstance } from '../types.js';
import {
  Globe, ExternalLink, Loader2, CheckCircle, Link2, Copy, Check,
  AlertTriangle, Trash2, RefreshCw, Shield
} from 'lucide-react';

interface DomainManagerProps {
  site: SiteInstance;
  onSiteUpdated: (site: SiteInstance) => void;
}

function sanitizeDomain(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/[^a-z0-9.-]/g, '');
}

const DomainManager: React.FC<DomainManagerProps> = ({ site, onSiteUpdated }) => {
  const [domainInput, setDomainInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [error, setError] = useState('');
  const [domainStatus, setDomainStatus] = useState<'pending' | 'active'>(
    site.domainStatus || 'pending'
  );
  const [sslActive, setSslActive] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const pollStartRef = useRef<number>(0);

  // ─── Verification Check ───
  const checkVerification = useCallback(async () => {
    if (!site.customHostnameId) return false;

    try {
      const response = await fetch('/api/domains/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customHostnameId: site.customHostnameId }),
      });

      if (!response.ok) return false;

      const data = await response.json();

      if (data.verified) {
        setDomainStatus('active');
        setSslActive(true);
        onSiteUpdated({ ...site, domainStatus: 'active' });
        return true;
      }

      if (data.ssl_status === 'active') {
        setSslActive(true);
      }

      return false;
    } catch {
      return false;
    }
  }, [site, onSiteUpdated]);

  // ─── Auto-polling when pending ───
  useEffect(() => {
    if (!site.customDomain || !site.customHostnameId || domainStatus === 'active') return;

    pollStartRef.current = Date.now();
    const MAX_POLL_DURATION = 10 * 60 * 1000; // 10 minutes

    const interval = setInterval(async () => {
      if (Date.now() - pollStartRef.current > MAX_POLL_DURATION) {
        clearInterval(interval);
        setPollingTimedOut(true);
        return;
      }
      await checkVerification();
    }, 30_000);

    return () => clearInterval(interval);
  }, [site.customDomain, site.customHostnameId, domainStatus, checkVerification]);

  // ─── Initial verification check on mount ───
  useEffect(() => {
    if (site.customDomain && site.customHostnameId && domainStatus !== 'active') {
      checkVerification();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Copy to clipboard ───
  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // ─── Connect Domain ───
  const handleConnect = async () => {
    const domain = sanitizeDomain(domainInput);
    if (!domain || !domain.includes('.')) {
      setError('Please enter a valid domain (e.g., yourbusiness.co.uk)');
      return;
    }

    if (domain.endsWith('.ablarme.com') || domain === 'ablarme.com') {
      setError('Cannot use an ablarme.com subdomain');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const response = await fetch('/api/domains/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, siteId: site.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect domain');
      }

      setDomainStatus('pending');
      setPollingTimedOut(false);
      onSiteUpdated({
        ...site,
        customDomain: domain,
        customHostnameId: data.customHostnameId,
        domainStatus: 'pending',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to connect domain');
    } finally {
      setIsConnecting(false);
    }
  };

  // ─── Manual Verify ───
  const handleVerify = async () => {
    setIsVerifying(true);
    setError('');

    const verified = await checkVerification();

    if (!verified) {
      setError('DNS not verified yet. Records may take 5-15 minutes to propagate.');
    }

    setIsVerifying(false);
  };

  // ─── Remove Domain ───
  const handleRemove = async () => {
    if (!site.customHostnameId) return;

    setIsRemoving(true);
    setError('');

    try {
      const response = await fetch('/api/domains/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: site.id,
          customHostnameId: site.customHostnameId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove domain');
      }

      setShowRemoveConfirm(false);
      setDomainInput('');
      setDomainStatus('pending');
      setSslActive(false);
      onSiteUpdated({
        ...site,
        customDomain: undefined,
        customHostnameId: undefined,
        domainStatus: undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to remove domain');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConnect();
    }
  };

  // ═══════════════════════════════════════
  // STATE 1: No custom domain — show input
  // ═══════════════════════════════════════
  if (!site.customDomain) {
    return (
      <div className="bg-[#0D1117] border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Globe size={20} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Connect Your Own Domain</h3>
            <p className="text-gray-500 text-xs">
              Use your own domain name instead of {site.subdomain}.ablarme.com
            </p>
          </div>
        </div>

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
              placeholder="e.g. yourbusiness.co.uk"
              className="w-full bg-[#05070A] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 text-sm font-medium outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            onClick={handleConnect}
            disabled={!domainInput.trim() || isConnecting}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
            Connect Domain
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle size={14} /> {error}
          </p>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════
  // STATE 3: Domain active and verified
  // ═══════════════════════════════════════
  if (domainStatus === 'active') {
    return (
      <div className="bg-[#0D1117] border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Globe size={20} className="text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Custom Domain</h3>
              <span className="text-green-400 font-bold text-sm">{site.customDomain}</span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-green-500/30 bg-green-500/10 text-green-400">
            <CheckCircle size={12} /> Active
          </span>
        </div>

        {/* URLs */}
        <div className="bg-[#05070A] border border-white/5 rounded-xl p-4 space-y-3">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Your website is accessible at</p>
          <div className="space-y-2">
            <a
              href={`https://${site.subdomain}.ablarme.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-300 text-sm flex items-center gap-2 transition-colors"
            >
              https://{site.subdomain}.ablarme.com <ExternalLink size={12} />
            </a>
            <a
              href={`https://${site.customDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm font-bold flex items-center gap-2 transition-colors"
            >
              https://{site.customDomain} <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* SSL Status */}
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <Shield size={14} />
          <span className="font-medium">SSL Certificate: Active</span>
        </div>

        {/* Remove Domain */}
        {!showRemoveConfirm ? (
          <button
            onClick={() => setShowRemoveConfirm(true)}
            className="text-red-400/60 hover:text-red-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Trash2 size={12} /> Remove Domain
          </button>
        ) : (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
            <p className="text-red-400 text-sm font-medium">
              Are you sure? Your site will only be accessible at {site.subdomain}.ablarme.com
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRemove}
                disabled={isRemoving}
                className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {isRemoving ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Yes, Remove
              </button>
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="text-gray-400 hover:text-gray-300 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle size={14} /> {error}
          </p>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════
  // STATE 2: Pending DNS verification
  // ═══════════════════════════════════════
  return (
    <div className="bg-[#0D1117] border border-white/10 rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
            <Globe size={20} className="text-yellow-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Custom Domain</h3>
            <span className="text-white font-bold text-sm">{site.customDomain}</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
          Pending DNS Setup
        </span>
      </div>

      {/* DNS Instructions */}
      <div className="bg-[#05070A] border border-white/5 rounded-xl p-5 space-y-4">
        <p className="text-white text-sm font-bold">
          Add these DNS records at your domain registrar (GoDaddy, Namecheap, etc.):
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                <th className="text-left pb-2 pr-4">Type</th>
                <th className="text-left pb-2 pr-4">Name</th>
                <th className="text-left pb-2 pr-4">Value</th>
                <th className="text-left pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="text-gray-300 font-mono">
              <tr>
                <td className="py-2 pr-4">CNAME</td>
                <td className="py-2 pr-4">www</td>
                <td className="py-2 pr-4">ablarme.com</td>
                <td className="py-2">
                  <button
                    onClick={() => handleCopy('ablarme.com', 'www')}
                    className="text-gray-500 hover:text-gray-300 transition-colors p-1"
                    title="Copy"
                  >
                    {copiedField === 'www' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4">CNAME</td>
                <td className="py-2 pr-4">@</td>
                <td className="py-2 pr-4">ablarme.com</td>
                <td className="py-2">
                  <button
                    onClick={() => handleCopy('ablarme.com', 'root')}
                    className="text-gray-500 hover:text-gray-300 transition-colors p-1"
                    title="Copy"
                  >
                    {copiedField === 'root' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-gray-500 text-xs">
          DNS changes can take up to 24 hours to propagate, but usually take 5-15 minutes.
          Some registrars don't support CNAME on the root (@) domain — in that case, use an ALIAS or ANAME record if available, or just use the www subdomain.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isVerifying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Verify DNS
        </button>

        {!showRemoveConfirm ? (
          <button
            onClick={() => setShowRemoveConfirm(true)}
            className="text-red-400/60 hover:text-red-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Trash2 size={12} /> Remove Domain
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleRemove}
              disabled={isRemoving}
              className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              {isRemoving ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Yes, Remove
            </button>
            <button
              onClick={() => setShowRemoveConfirm(false)}
              className="text-gray-400 hover:text-gray-300 px-3 py-2 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Polling timeout message */}
      {pollingTimedOut && (
        <p className="text-yellow-400/80 text-xs flex items-center gap-2">
          <AlertTriangle size={12} />
          Auto-check timed out. Click "Verify DNS" to check manually — DNS can take up to 24 hours.
        </p>
      )}

      {error && (
        <p className="text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </p>
      )}
    </div>
  );
};

export default DomainManager;
