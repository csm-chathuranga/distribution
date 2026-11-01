import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import {
  Eye, EyeOff, Download, CheckCircle2,
  Truck, ArrowRight, Loader2, X,
  Share, MoreVertical, PlusSquare,
} from 'lucide-react';
import { useLoginMutation } from '../api/settingsApi';
import { setCredentials } from '../store/authSlice';
import { useInstallPWA } from '../hooks/useInstallPWA';

const schema = yup.object({
  email:    yup.string().required('Email or username required'),
  password: yup.string().min(3, 'Min 3 characters').required('Password required'),
});


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
  const [companyName, setCompanyName] = useState('Lanka Dist.');
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });

  useEffect(() => {
    fetch('/api/public/company')
      .then(r => r.json())
      .then(d => { if (d?.name) setCompanyName(d.name); })
      .catch(() => {});
  }, []);
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
      <div className="min-h-screen flex bg-[#050d1a]">

        {/* ── LEFT: Illustrated Panel ── */}
        <div className="hidden lg:flex lg:w-1/2 relative flex-col overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #052e16 0%, #14532d 45%, #064e3b 100%)' }}>

          {/* decorative blobs */}
          <div className="absolute top-[-80px] left-[-80px] w-80 h-80 rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle, #4ade80 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-60px] right-[-60px] w-72 h-72 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #059669 0%, transparent 70%)' }} />

          {/* SVG illustration */}
          <div className="absolute inset-0 flex items-center justify-center p-10">
            <svg viewBox="0 0 480 380" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-md opacity-90">
              {/* road */}
              <rect x="40" y="270" width="400" height="28" rx="4" fill="#052e16" />
              <rect x="40" y="281" width="400" height="4" rx="2" fill="#14532d" />
              {/* road dashes */}
              {[80,160,240,320].map(x => (
                <rect key={x} x={x} y="282" width="40" height="3" rx="1" fill="#166534" />
              ))}

              {/* main truck body */}
              <rect x="60" y="220" width="130" height="55" rx="6" fill="#16a34a" />
              <rect x="170" y="230" width="55" height="45" rx="5" fill="#0d7a3a" />
              {/* truck window */}
              <rect x="175" y="235" width="44" height="24" rx="3" fill="#7ee8a2" opacity="0.4" />
              {/* truck wheels */}
              <circle cx="95" cy="298" r="14" fill="#0f172a" />
              <circle cx="95" cy="298" r="8" fill="#1e293b" />
              <circle cx="95" cy="298" r="3" fill="#64748b" />
              <circle cx="165" cy="298" r="14" fill="#0f172a" />
              <circle cx="165" cy="298" r="8" fill="#1e293b" />
              <circle cx="165" cy="298" r="3" fill="#64748b" />
              {/* truck headlight */}
              <rect x="221" y="255" width="8" height="6" rx="2" fill="#fde68a" opacity="0.9" />
              {/* headlight beam */}
              <path d="M229 258 L260 248 L260 270 Z" fill="#fde68a" opacity="0.12" />

              {/* small truck 2 (background) */}
              <rect x="290" y="238" width="90" height="38" rx="5" fill="#1d4ed8" opacity="0.7" />
              <rect x="370" y="244" width="36" height="32" rx="4" fill="#1e40af" opacity="0.7" />
              <rect x="373" y="248" width="28" height="16" rx="2" fill="#93c5fd" opacity="0.25" />
              <circle cx="310" cy="298" r="11" fill="#0f172a" />
              <circle cx="310" cy="298" r="6" fill="#1e293b" />
              <circle cx="310" cy="298" r="2" fill="#64748b" />
              <circle cx="370" cy="298" r="11" fill="#0f172a" />
              <circle cx="370" cy="298" r="6" fill="#1e293b" />
              <circle cx="370" cy="298" r="2" fill="#64748b" />

              {/* route line */}
              <path d="M140 200 Q200 140 280 160 Q340 175 390 120" stroke="#16a34a" strokeWidth="2.5" strokeDasharray="8 5" strokeLinecap="round" opacity="0.6" />

              {/* location pins */}
              <circle cx="140" cy="200" r="6" fill="#16a34a" />
              <circle cx="140" cy="200" r="3" fill="white" />
              <circle cx="280" cy="160" r="6" fill="#16a34a" />
              <circle cx="280" cy="160" r="3" fill="white" />
              <circle cx="390" cy="120" r="8" fill="#16a34a" />
              <circle cx="390" cy="120" r="4" fill="white" />
              {/* destination pulse */}
              <circle cx="390" cy="120" r="14" stroke="#16a34a" strokeWidth="1.5" opacity="0.35" />
              <circle cx="390" cy="120" r="22" stroke="#16a34a" strokeWidth="1" opacity="0.15" />

              {/* floating stat cards */}
              {/* card 1 */}
              <rect x="28" y="80" width="120" height="56" rx="10" fill="#052e16" stroke="#166534" strokeWidth="1" />
              <rect x="38" y="90" width="28" height="28" rx="7" fill="#16a34a" opacity="0.9" />
              <rect x="50" y="98" width="4" height="12" rx="1" fill="white" />
              <rect x="44" y="104" width="16" height="4" rx="1" fill="white" />
              <text x="74" y="102" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">Deliveries</text>
              <text x="74" y="116" fill="white" fontSize="15" fontWeight="bold" fontFamily="sans-serif">1,248</text>
              <text x="74" y="128" fill="#4ade80" fontSize="8" fontFamily="sans-serif">↑ 12% today</text>

              {/* card 2 */}
              <rect x="332" y="48" width="118" height="56" rx="10" fill="#052e16" stroke="#166534" strokeWidth="1" />
              <rect x="342" y="58" width="28" height="28" rx="7" fill="#1d4ed8" opacity="0.9" />
              <rect x="352" y="64" width="8" height="16" rx="1" fill="white" opacity="0.8" />
              <rect x="362" y="68" width="8" height="12" rx="1" fill="white" opacity="0.8" />
              <text x="378" y="70" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">Active Routes</text>
              <text x="378" y="84" fill="white" fontSize="15" fontWeight="bold" fontFamily="sans-serif">34</text>
              <text x="378" y="96" fill="#60a5fa" fontSize="8" fontFamily="sans-serif">Live now</text>

              {/* card 3 */}
              <rect x="175" y="30" width="118" height="52" rx="10" fill="#052e16" stroke="#166534" strokeWidth="1" />
              <rect x="185" y="40" width="26" height="26" rx="7" fill="#7c3aed" opacity="0.85" />
              <circle cx="198" cy="53" r="7" stroke="white" strokeWidth="1.8" fill="none" />
              <path d="M198 47 L198 53 L202 53" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <text x="218" y="50" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">Drivers</text>
              <text x="218" y="64" fill="white" fontSize="15" fontWeight="bold" fontFamily="sans-serif">47</text>
              <text x="218" y="76" fill="#c4b5fd" fontSize="8" fontFamily="sans-serif">On duty</text>
            </svg>
          </div>

          {/* content over image */}
          <div className="relative z-10 flex flex-col justify-between h-full p-10">
            {/* logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl"
                style={{ background: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)' }}>
                <Truck size={24} className="text-white" strokeWidth={1.8} />
              </div>
              <span className="text-white font-bold text-lg leading-tight">{companyName}</span>
            </div>

            {/* center tagline */}
            <div>
              <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
                Smarter Distribution,<br />Every Mile.
              </h2>
              <p className="text-slate-300 text-base leading-relaxed max-w-sm">
                Manage routes, drivers, deliveries and inventory — all in one powerful platform built for Sri Lanka.
              </p>

              <div className="mt-8 flex flex-col gap-3">
                {[
                  'Real-time delivery tracking',
                  'Driver & route management',
                  'Inventory & stock control',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2.5 text-sm text-slate-200">
                    <CheckCircle2 size={15} className="text-green-400 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-slate-500 text-xs">Lanka Distribution Management System · v1.0</p>
          </div>
        </div>

        {/* ── RIGHT: Form Panel ── */}
        <div className="flex flex-col w-full lg:w-1/2 min-h-screen"
          style={{ background: 'linear-gradient(160deg, #0c1f4a 0%, #071430 100%)' }}>

          {/* mobile brand (hidden on lg) */}
          <div className="flex flex-col items-center pt-10 pb-4 px-6 lg:hidden">
            <div className="w-16 h-16 rounded-[18px] flex items-center justify-center shadow-2xl mb-4"
              style={{ background: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)' }}>
              <Truck size={30} className="text-white" strokeWidth={1.8} />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight text-center">{companyName}</h1>
            <p className="text-slate-400 text-sm mt-1">Distribution Management System</p>
          </div>

          {/* form centered */}
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
            <div className="w-full max-w-sm">

              {/* desktop heading */}
              <div className="hidden lg:block mb-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl mb-6"
                  style={{ background: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)' }}>
                  <Truck size={26} className="text-white" strokeWidth={1.8} />
                </div>
                <h2 className="text-3xl font-extrabold text-white mb-1">Welcome back</h2>
                <p className="text-slate-400 text-sm">Sign in to your account to continue</p>
              </div>

              {/* mobile heading */}
              <div className="lg:hidden mb-6">
                <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
                <p className="text-slate-400 text-sm">Sign in to continue</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">Email or Username</label>
                  <input
                    type="text" autoComplete="username" placeholder="Email or username"
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
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white
                             disabled:opacity-50 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)' }}>
                  {isLoading
                    ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                    : <><span>Sign In</span><ArrowRight size={15} /></>}
                </button>
              </form>

              {/* Install button */}
              <div className="mt-4">
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

              <p className="text-center text-slate-600 text-xs mt-8 lg:hidden">
                Lanka Distribution Management System · v1.0
              </p>
            </div>
          </div>
        </div>
      </div>

      {showInstructions && <InstallInstructionsModal onClose={dismissInstructions} />}
    </>
  );
}
