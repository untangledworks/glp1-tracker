import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Hydration from './pages/Hydration';
import Symptoms from './pages/Symptoms';
import WeeklySummary from './pages/WeeklySummary';
import Settings from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen text-forest/50">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/onboarding" />;
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
