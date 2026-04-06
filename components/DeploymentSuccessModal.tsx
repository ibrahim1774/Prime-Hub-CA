import React from 'react';
import { CheckCircle, ExternalLink } from 'lucide-react';

interface DeploymentSuccessModalProps {
  isOpen: boolean;
  deployedUrl: string;
  onCreateAccount: () => void;
  onSkip: () => void;
}

const DeploymentSuccessModal: React.FC<DeploymentSuccessModalProps> = ({
  isOpen,
  deployedUrl,
  onCreateAccount,
  onSkip,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
      <div className="bg-[#05070A] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl">
        {/* Green checkmark */}
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="text-green-500" size={40} />
        </div>

        {/* Heading */}
        <h3 className="text-2xl font-bold text-white mb-2">Site is Live!</h3>
        <p className="text-gray-400 mb-6">Your website has been published successfully.</p>

        {/* View Live Site button */}
        <a
          href={deployedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
        >
          View Live Site <ExternalLink size={18} />
        </a>

        {/* Divider */}
        <div className="border-t border-white/10 my-8"></div>

        {/* Account creation prompt */}
        <p className="text-gray-400 text-sm mb-6">
          Create a free account to manage your site, make edits, and republish anytime.
        </p>

        {/* Create Account button */}
        <button
          onClick={onCreateAccount}
          className="w-full bg-white text-slate-900 py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-gray-100 transition-colors mb-4"
        >
          Create Account
        </button>

        {/* Skip link */}
        <button
          onClick={onSkip}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default DeploymentSuccessModal;
