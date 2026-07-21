import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { api } from './api/client';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Hydration from './pages/Hydration';
import Symptoms from './pages/Symptoms';
import WeeklySummary from './pages/WeeklySummary';
import Settings from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [settingsChecked, setSettingsChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const alreadyOnboarded = localStorage.getItem('onboardingComplete') === 'true' || localStorage.getItem('dietaryPreference') !== null;
    if (alreadyOnboarded) {
      setSettingsChecked(true);
      return;
    }
    api.getSettings().then(({ settings }) => {
      if (settings && settings.dietaryPreference) {
        localStorage.setItem('onboardingComplete', 'true');
        localStorage.setItem('dietaryPreference', settings.dietaryPreference);
        if (settings.proteinTarget) localStorage.setItem('proteinTarget', String(settings.proteinTarget));
        if (settings.weightLbs) localStorage.setItem('weightLbs', String(settings.weightLbs));
        if (settings.injectionDayOfWeek) localStorage.setItem('injectionDayOfWeek', settings.injectionDayOfWeek);
        if (settings.sleepTrackingEnabled !== undefined) localStorage.setItem('sleepTrackingEnabled', String(settings.sleepTrackingEnabled));
      }
      setSettingsChecked(true);
    }).catch(() => {
      setSettingsChecked(true);
    });
  }, [isAuthenticated]);

  if (isLoading || !settingsChecked) return <div className="flex items-center justify-center h-screen text-forest/50">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/onboarding" />;
  const onboarded = localStorage.getItem('onboardingComplete') === 'true' || localStorage.getItem('dietaryPreference') !== null;
  if (!onboarded) return <Navigate to="/onboarding" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Home />} />
            <Route path="/hydration" element={<Hydration />} />
            <Route path="/symptoms" element={<Symptoms />} />
            <Route path="/weekly" element={<WeeklySummary />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
