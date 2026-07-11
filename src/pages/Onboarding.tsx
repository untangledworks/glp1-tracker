import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

type Step = 'welcome' | 'signin' | 'diet';

export default function Onboarding() {
  const [step, setStep] = useState<Step>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (isSignUp) {
        await signUp(email, password);
        await signIn(email, password);
      } else {
        await signIn(email, password);
      }
      setStep('diet');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  }

  async function handleDietSelect(preference: string) {
    // Save preference via API (or Amplify Data)
    localStorage.setItem('dietaryPreference', preference);
    navigate('/');
  }

  if (step === 'welcome') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">You're on a GLP-1.</h1>
        <p className="text-lg text-gray-700 mb-2">Your appetite has changed.</p>
        <p className="text-gray-600 mb-6">
          This app helps you make sure you're getting enough of what matters:
        </p>
        <ul className="text-left text-gray-700 space-y-2 mb-8">
          <li><span className="font-medium">Protein</span> — protect muscle</li>
          <li><span className="font-medium">Fiber</span> — support digestion</li>
          <li><span className="font-medium">Hydration</span> — energy & skin</li>
        </ul>
        <p className="text-sm text-gray-500 mb-8">No calorie limits. No judgment.</p>
        <button
          onClick={() => setStep('signin')}
          className="w-full bg-emerald-600 text-white py-3 px-6 rounded-xl text-lg font-medium"
        >
          Let's go
        </button>
      </div>
    );
  }

  if (step === 'signin') {
    return (
      <div className="flex flex-col justify-center min-h-screen p-6">
        <h2 className="text-xl font-bold mb-6">{isSignUp ? 'Create account' : 'Sign in'}</h2>
        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg"
            required
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-emerald-600 text-white py-3 rounded-xl text-lg font-medium"
          >
            {isSignUp ? 'Sign up' : 'Sign in'}
          </button>
        </form>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="mt-4 text-emerald-600 text-sm"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    );
  }

  if (step === 'diet') {
    const options = ['Vegetarian', 'Vegan', 'Pescatarian', 'No restrictions'];
    return (
      <div className="flex flex-col justify-center min-h-screen p-6">
        <h2 className="text-xl font-bold mb-2">Any dietary preferences?</h2>
        <p className="text-gray-600 mb-6">This helps us make better suggestions for you.</p>
        <div className="space-y-3">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => handleDietSelect(option.toLowerCase())}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg text-left hover:border-emerald-500 hover:bg-emerald-50"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
