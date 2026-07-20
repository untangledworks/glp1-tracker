import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Navigate } from 'react-router-dom';
import { confirmSignUp } from 'aws-amplify/auth';

type Step = 'welcome' | 'signin' | 'confirm' | 'diet' | 'injection' | 'sleep';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Onboarding() {
  const [step, setStep] = useState<Step>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signUp, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) return <div className="flex items-center justify-center h-screen text-forest/50">Loading...</div>;
  if (isAuthenticated && localStorage.getItem('onboardingComplete') === 'true') return <Navigate to="/" />;

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (isSignUp) {
        await signUp(email, password);
        setStep('confirm');
      } else {
        await signIn(email, password);
        setStep('diet');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await confirmSignUp({ username: email, confirmationCode: confirmCode });
      await signIn(email, password);
      setStep('diet');
    } catch (err: any) {
      setError(err.message || 'Confirmation failed');
    }
  }

  function handleDietSelect(preference: string) {
    localStorage.setItem('dietaryPreference', preference);
    setStep('injection');
  }

  function handleInjectionDay(day: string | null) {
    if (day) {
      localStorage.setItem('injectionDayOfWeek', day.toLowerCase());
    }
    setStep('sleep');
  }

  function handleSleepChoice(enabled: boolean) {
    localStorage.setItem('sleepTrackingEnabled', enabled ? 'true' : 'false');
    localStorage.setItem('onboardingComplete', 'true');
    navigate('/');
  }

  if (step === 'welcome') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-sage-light max-w-md mx-auto">
        <div className="space-y-6">
          <h1 className="font-display text-3xl font-semibold text-forest">
            You're on a GLP-1.
          </h1>
          <p className="text-lg text-forest/70">Your appetite has changed.</p>
          <p className="text-forest/60 leading-relaxed">
            This app helps you make sure you're getting enough of what matters:
          </p>
          <ul className="text-left text-forest/70 space-y-3 mx-auto max-w-xs">
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-sage shrink-0" />
              <span><span className="font-medium text-forest">Protein</span> — protect muscle</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-sage shrink-0" />
              <span><span className="font-medium text-forest">Fiber</span> — support digestion</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-sage shrink-0" />
              <span><span className="font-medium text-forest">Hydration</span> — energy & skin</span>
            </li>
          </ul>
          <p className="text-sm text-forest/40">No calorie limits. No judgment.</p>
        </div>
        <button
          onClick={() => setStep('signin')}
          className="mt-10 w-full bg-sage text-white py-4 px-6 rounded-2xl text-lg font-medium hover:bg-sage-dark transition-colors"
        >
          Let's go
        </button>
      </div>
    );
  }

  if (step === 'signin') {
    return (
      <div className="flex flex-col justify-center min-h-screen p-8 max-w-md mx-auto">
        <h2 className="font-display text-2xl font-semibold mb-8">{isSignUp ? 'Create account' : 'Welcome back'}</h2>
        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border border-forest/10 rounded-2xl px-4 py-3.5 text-lg placeholder:text-forest/30 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white border border-forest/10 rounded-2xl px-4 py-3.5 text-lg placeholder:text-forest/30 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-sage text-white py-3.5 rounded-2xl text-lg font-medium hover:bg-sage-dark transition-colors"
          >
            {isSignUp ? 'Sign up' : 'Sign in'}
          </button>
        </form>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="mt-4 text-sage text-sm hover:text-sage-dark transition-colors"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="flex flex-col justify-center min-h-screen p-8 max-w-md mx-auto">
        <h2 className="font-display text-2xl font-semibold mb-2">Check your email</h2>
        <p className="text-forest/60 mb-8">We sent a verification code to {email}</p>
        <form onSubmit={handleConfirm} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter 6-digit code"
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value)}
            className="w-full bg-white border border-forest/10 rounded-2xl px-4 py-3.5 text-lg text-center tracking-widest placeholder:text-forest/30 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-sage text-white py-3.5 rounded-2xl text-lg font-medium hover:bg-sage-dark transition-colors"
          >
            Verify
          </button>
        </form>
      </div>
    );
  }

  if (step === 'diet') {
    const options = ['Vegetarian', 'Vegan', 'Pescatarian', 'No restrictions'];
    return (
      <div className="flex flex-col justify-center min-h-screen p-8 max-w-md mx-auto">
        <h2 className="font-display text-2xl font-semibold mb-2">Any dietary preferences?</h2>
        <p className="text-forest/60 mb-8">This helps us make better suggestions for you.</p>
        <div className="space-y-3">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => handleDietSelect(option.toLowerCase())}
              className="w-full bg-white border border-forest/10 rounded-2xl px-5 py-4 text-lg text-left text-forest hover:border-sage hover:bg-sage-light/50 transition-colors"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'injection') {
    return (
      <div className="flex flex-col justify-center min-h-screen p-8 max-w-md mx-auto">
        <h2 className="font-display text-2xl font-semibold mb-2">When do you inject?</h2>
        <p className="text-forest/60 mb-8">We'll track where you are in your weekly cycle.</p>
        <div className="space-y-3">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day}
              onClick={() => handleInjectionDay(day)}
              className="w-full bg-white border border-forest/10 rounded-2xl px-5 py-4 text-lg text-left text-forest hover:border-sage hover:bg-sage-light/50 transition-colors"
            >
              {day}
            </button>
          ))}
        </div>
        <button
          onClick={() => handleInjectionDay(null)}
          className="mt-4 text-forest/40 text-sm hover:text-forest/60 transition-colors"
        >
          Skip — I'll set this later
        </button>
      </div>
    );
  }

  if (step === 'sleep') {
    return (
      <div className="flex flex-col justify-center min-h-screen p-8 max-w-md mx-auto">
        <h2 className="font-display text-2xl font-semibold mb-2">Track sleep?</h2>
        <p className="text-forest/60 mb-8">
          Logging bed and wake times helps us spot how sleep affects your side effects — especially fatigue.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => handleSleepChoice(true)}
            className="w-full bg-white border border-forest/10 rounded-2xl px-5 py-4 text-lg text-left text-forest hover:border-sage hover:bg-sage-light/50 transition-colors"
          >
            Yes, track my sleep
          </button>
          <button
            onClick={() => handleSleepChoice(false)}
            className="w-full bg-white border border-forest/10 rounded-2xl px-5 py-4 text-lg text-left text-forest hover:border-sage hover:bg-sage-light/50 transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    );
  }

  return null;
}
