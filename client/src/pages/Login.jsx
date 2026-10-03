import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import {
  Eye, EyeOff, Download, CheckCircle2,
  Truck, WifiOff, Bell, ArrowRight, Loader2, X,
  Share, MoreVertical, PlusSquare,
} from 'lucide-react';
import { useLoginMutation } from '../api/settingsApi';
import { setCredentials } from '../store/authSlice';
import { useInstallPWA } from '../hooks/useInstallPWA';

const schema = yup.object({
  email:    yup.string().email('Invalid email').required('Email required'),
  password: yup.string().required('Password required'),
});

const FEATURES = [
  { icon: WifiOff, label: 'Works Offline' },
  { icon: Bell,    label: 'Push Alerts'  },
  { icon: Truck,   label: 'Van Sales'    },
];

// Detect iOS so we show the right install steps
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = /android/i.test(navigator.userAgent);

function InstallInstructionsModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center px-4 pb-4 sm:pb-0"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm bg-[#0f1f3d] border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-base">Install Lanka Dist.</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {isIOS ? (
          <ol className="space-y-3 text-sm text-slate-300">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <span>Tap the <strong className="text-white inline-flex items-center gap-1"><Share size={13} /> Share</strong> button at the bottom of Safari</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <span>Scroll down and tap <strong className="text-white inline-flex items-center gap-1"><PlusSquare size={13} /> Add to Home Screen</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <span>Tap <strong className="text-white">Add</strong> in the top-right corner</span>
            </li>
          </ol>
        ) : (
          <ol className="space-y-3 text-sm text-slate-300">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <span>Tap the <strong className="text-white inline-flex items-center gap-1"><MoreVertical size={13} /> menu</strong> (⋮) in Chrome's top-right corner</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <span>Tap <strong className="text-white">"Add to Home screen"</strong> or <strong className="text-white">"Install app"</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <span>Tap <strong className="text-white">Install</strong> to confirm</span>
            </li>
          </ol>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default function Login() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const [showPw, setShowPw]    = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });
  const { isInstalled, showInstructions, dismissInstructions, install } = useInstallPWA();

  const onSubmit = async (data) => {
    try {
      const result = await login(data).unwrap();
      dispatch(setCredentials(result));
      navigate('/');
    } catch (err) {
      toast.error(err.data?.message || 'Login failed');
    }
  };

  return (
    <>
      <div className="min-h-screen flex flex-col bg-[#0c1629]"
        style={{ backgroundImage: 'radial-gradient(ellipse at 60% 0%, #1a3a5c 0%, transparent 60%), radial-gradient(ellipse at 0% 100%, #0d2d1a 0%, transparent 50%)' }}>

        {/* ── Brand ── */}
        <div className="flex flex-col items-center pt-14 pb-6 px-6">
          <div className="w-20 h-20 rounded-[22px] flex items-center justify-center shadow-2xl mb-5"
            style={{ background: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)' }}>
            <Truck size={38} className="text-white" strokeWidth={1.8} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Lanka Dist.</h1>
          <p className="text-slate-400 text-sm mt-1 mb-6">Distribution Management System</p>

          <div className="flex gap-2 flex-wrap justify-center">
            {FEATURES.map(({ icon: Icon, label }) => (
              <span key={label}
                className="flex items-center gap-1.5 bg-white/10 border border-white/10 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-full">
                <Icon size={11} className="text-green-400" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Form ── */}
        <div className="flex flex-col items-center px-5 pb-4">
          <div className="w-full max-w-sm">
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-7 shadow-2xl">
              <h2 className="text-white text-xl font-bold mb-1">Welcome back</h2>
              <p className="text-slate-400 text-sm mb-6">Sign in to continue</p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">Email</label>
                  <input
                    type="email" autoComplete="email" placeholder="you@lankadist.lk"
                    className="block w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500
                               focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    {...register('email')}
                  />
                  {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••"
                      className="block w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-slate-500
                                 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      {...register('password')}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>}
                </div>

                <button type="submit" disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white mt-1
                             disabled:opacity-50 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)' }}>
                  {isLoading
                    ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                    : <><span>Sign In</span><ArrowRight size={15} /></>}
                </button>
              </form>
            </div>

            {/* ── Install button — always visible when not installed ── */}
            <div className="mt-3">
              {isInstalled ? (
                <div className="flex items-center justify-center gap-2 py-3 text-green-400 text-sm font-semibold">
                  <CheckCircle2 size={16} />
                  App installed · works offline
                </div>
              ) : (
                <button
                  type="button"
                  onClick={install}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl border border-green-700/60
                             bg-green-900/30 hover:bg-green-900/50 active:bg-green-900/70 text-green-300 text-sm font-semibold transition-colors"
                >
                  <Download size={15} />
                  Download App — works offline
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-700 text-xs pb-6 mt-auto">
          Lanka Distribution Management System · v1.0
        </p>
      </div>

      {/* Install instructions modal */}
      {showInstructions && <InstallInstructionsModal onClose={dismissInstructions} />}
    </>
  );
}
