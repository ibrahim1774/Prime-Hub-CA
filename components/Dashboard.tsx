import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { SiteInstance } from '../types.js';
import DomainManager from './DomainManager.js';
import {
  Zap, ChevronDown, LogOut, LayoutDashboard, Pencil,
  CircleDot, Mail, Clock, Globe, ExternalLink
} from 'lucide-react';

interface DashboardProps {
  site: SiteInstance | null;
  onEditSite: () => void;
  onSignOut: () => void;
  onSiteUpdated: (site: SiteInstance) => void;
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) return 'there';
  return fullName.split(' ')[0] || 'there';
}

const Dashboard: React.FC<DashboardProps> = ({ site, onEditSite, onSignOut, onSiteUpdated }) => {
  const { profile } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isLive = site?.deploymentStatus === 'deployed';
  const firstName = getFirstName(profile?.full_name);
  const userInitial = (profile?.full_name?.[0] || profile?.email?.[0] || 'U').toUpperCase();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="min-h-screen bg-[#05070A] text-white">
      {/* ─── Top Navigation ─── */}
      <nav className="bg-[#0D1117] border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">PrimeHub AI</span>
          </div>

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 hover:bg-white/5 px-3 py-2 rounded-xl transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                {userInitial}
              </div>
              <span className="hidden md:inline text-sm font-medium text-gray-300">
                {profile?.full_name || profile?.email || 'Account'}
              </span>
              <ChevronDown size={16} className="text-gray-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#0D1117] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                <button
                  onClick={() => { setDropdownOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 flex items-center gap-3 transition-colors"
                >
                  <LayoutDashboard size={16} /> Dashboard
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); onSignOut(); }}
                  className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 flex items-center gap-3 transition-colors border-t border-white/5"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Main Content ─── */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-gray-400 mt-2">Manage your website and settings</p>
        </div>

        {/* ─── Site Overview Card ─── */}
        {site ? (
          <div className="bg-[#0D1117] border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              {/* Left: Preview */}
              <div className="lg:w-1/2 p-6 border-b lg:border-b-0 lg:border-r border-white/10">
                <div className="bg-[#05070A] border border-white/5 rounded-xl overflow-hidden aspect-video">
                  {isLive && site.deployedUrl ? (
                    <iframe
                      src={site.deployedUrl}
                      title="Site Preview"
                      className="w-full h-full pointer-events-none"
                      loading="lazy"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                      <Globe size={40} className="mb-3 opacity-50" />
                      <span className="text-sm font-bold uppercase tracking-wider">Not yet published</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Details */}
              <div className="lg:w-1/2 p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Company name + status */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                      {site.data.contact.companyName}
                    </h2>
                    {isLive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-green-500/30 bg-green-500/10 text-green-400">
                        <span className="w-2 h-2 rounded-full bg-green-400"></span>
                        Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
                        <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                        Draft
                      </span>
                    )}
                  </div>

                  {/* Deployed URL */}
                  {isLive && site.deployedUrl && (
                    <a
                      href={site.deployedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                    >
                      {site.deployedUrl} <ExternalLink size={14} />
                    </a>
                  )}

                  {/* Last edited */}
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Clock size={14} />
                    <span>Last edited {getRelativeTime(site.lastSaved)}</span>
                  </div>
                </div>

                {/* Edit button */}
                <button
                  onClick={onEditSite}
                  className="mt-6 bg-white text-slate-900 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 w-full lg:w-auto"
                >
                  <Pencil size={16} /> Edit Website
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#0D1117] border border-white/10 rounded-2xl p-12 text-center">
            <Globe size={48} className="mx-auto mb-4 text-gray-500 opacity-50" />
            <h3 className="text-lg font-bold text-gray-400 mb-2">No website yet</h3>
            <p className="text-gray-500 text-sm">Generate your first website to get started.</p>
          </div>
        )}

        {/* ─── Domain Manager ─── */}
        {site && isLive && (
          <DomainManager site={site} onDomainConnected={(domain, orderId) => {
            const updatedSite: SiteInstance = {
              ...site,
              customDomain: domain,
              domainOrderId: orderId,
              lastSaved: Date.now(),
            };
            onSiteUpdated(updatedSite);
          }} />
        )}

        {/* ─── Quick Stats Grid ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Site Status */}
          <div className="bg-[#0D1117] border border-white/10 rounded-xl p-6">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Site Status</div>
            <div className="flex items-center gap-3">
              <CircleDot size={20} className={isLive ? 'text-green-400' : 'text-yellow-400'} />
              <span className="text-lg font-bold">{isLive ? 'Live' : 'Draft'}</span>
            </div>
          </div>

          {/* Support */}
          <div className="bg-[#0D1117] border border-white/10 rounded-xl p-6">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Support</div>
            <div className="text-sm text-gray-300 mb-2">Questions / Support / Cancellations</div>
            <a
              href="mailto:ibrahim3709@gmail.com"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
            >
              <Mail size={14} /> ibrahim3709@gmail.com
            </a>
          </div>

          {/* Last Published */}
          <div className="bg-[#0D1117] border border-white/10 rounded-xl p-6">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Last Published</div>
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-gray-400" />
              <span className="text-lg font-bold">
                {isLive ? getRelativeTime(site!.lastSaved) : 'Not yet published'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
