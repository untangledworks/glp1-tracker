import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './hooks/useAuth';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Nutrition from './pages/Nutrition';
import Hydration from './pages/Hydration';
import Symptoms from './pages/Symptoms';
import WeeklySummary from './pages/WeeklySummary';
import Settings from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/onboarding" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="max-w-md mx-auto min-h-screen bg-white">
          <Routes>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/nutrition" element={<ProtectedRoute><Nutrition /></ProtectedRoute>} />
            <Route path="/hydration" element={<ProtectedRoute><Hydration /></ProtectedRoute>} />
            <Route path="/symptoms" element={<ProtectedRoute><Symptoms /></ProtectedRoute>} />
            <Route path="/weekly" element={<ProtectedRoute><WeeklySummary /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
