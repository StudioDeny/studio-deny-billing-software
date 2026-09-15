import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { store } from '../services/store';
import { Lock, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('lead@studiodeny.com');
  const [password, setPassword] = useState('••••••••••••');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.addToast('Welcome Back', 'Logged into STUDIO DENY Operating System.', 'success');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col justify-between p-6 md:p-12 text-[#111111]">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#CFCFD2] pb-6">
        <div>
          <span className="font-display font-black text-2xl tracking-tight text-[#0A0A0A]">
            STUDIO DENY
          </span>
          <span className="ml-2 text-[10px] font-mono px-2 py-0.5 bg-[#0A0A0A] text-white">
            DENY OS
          </span>
        </div>
        <div className="text-xs font-mono text-[#666666] uppercase">
          INTERNAL ACCESS ONLY
        </div>
      </div>

      {/* Center Sign In Box */}
      <div className="max-w-md w-full mx-auto my-12 border border-[#0A0A0A] p-8 sm:p-10 shadow-modal bg-white">
        <div className="mb-8">
          <div className="text-[10px] font-mono uppercase tracking-widest-editorial text-[#888888]">
            OPERATING SYSTEM ACCESS
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0A0A0A] mt-1">
            SIGN IN
          </h1>
          <p className="text-xs text-[#666666] font-sans mt-2">
            Authenticate to access client production, financial ledgers, and editorial assets.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="OPERATOR IDENTIFIER (EMAIL)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="PASSPHRASE"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              icon={<ArrowRight size={16} />}
              iconPosition="right"
            >
              [ ENTER WORKSPACE ]
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-[#CFCFD2] text-center">
          <div className="text-[11px] font-mono text-[#888888]">
            AUTHORIZED STUDIO PERSONNEL ONLY • 256-BIT ENCRYPTION
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[#CFCFD2] pt-6 text-[11px] font-mono text-[#666666] gap-2">
        <div>© 2026 STUDIO DENY CREATIVE LABS PVT LTD</div>
        <div>MUMBAI • NEW DELHI • BENGALURU</div>
      </div>
    </div>
  );
};
