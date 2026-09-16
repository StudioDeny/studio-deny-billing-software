import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { store } from '../services/store';
import { signIn } from '../api/auth';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { staff } = await signIn(email, password);
      store.addToast('Welcome Back', `Signed in as ${staff.display_name}.`, 'success');
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E2E2E4] flex flex-col justify-between p-6 md:p-12 text-[#111111]">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.18)] pb-6">
        <div>
          <span className="font-display font-black text-2xl tracking-tight text-[#111111]">
            STUDIO DENY
          </span>
          <span className="ml-2 text-[10px] font-mono px-2 py-0.5 bg-[#111111] text-[#E2E2E4]">
            DENY OS
          </span>
        </div>
        <div className="text-xs font-mono text-[#4A4844] uppercase">
          INTERNAL ACCESS ONLY
        </div>
      </div>

      {/* Center Sign In Box */}
      <div className="max-w-md w-full mx-auto my-12 border border-[#111111] p-8 sm:p-10 shadow-modal bg-[#D5D5D8]">
        <div className="mb-8">
          <div className="text-[10px] font-mono uppercase tracking-widest-editorial text-[#4A4844]">
            OPERATING SYSTEM ACCESS
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#111111] mt-1">
            SIGN IN
          </h1>
          <p className="text-xs text-[#4A4844] font-sans mt-2">
            Authenticate to access client production, financial ledgers, and editorial assets.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="text-xs font-mono text-red-600 border border-red-300 bg-red-50 px-3 py-2">
              {error}
            </div>
          )}

          <Input
            label="OPERATOR IDENTIFIER (EMAIL)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />

          <Input
            label="PASSPHRASE"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading}
              icon={loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              iconPosition="right"
            >
              {loading ? '[ SIGNING IN... ]' : '[ ENTER WORKSPACE ]'}
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-[rgba(0,0,0,0.18)] text-center">
          <div className="text-[11px] font-mono text-[#4A4844]">
            AUTHORIZED STUDIO PERSONNEL ONLY • 256-BIT ENCRYPTION
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[rgba(0,0,0,0.18)] pt-6 text-[11px] font-mono text-[#4A4844] gap-2">
        <div>© 2026 STUDIO DENY CREATIVE LABS PVT LTD</div>
        <div>MUMBAI • NEW DELHI • BENGALURU</div>
      </div>
    </div>
  );
};
