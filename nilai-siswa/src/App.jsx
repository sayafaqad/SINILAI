import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './store/AppStore';
import { AuthProvider } from './store/AuthStore';
import LoginGate from './components/auth/LoginGate';
import { ToastProvider } from './components/ui/Toast';
import { AppShell } from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import SchoolsPage from './pages/SchoolsPage';
import ClassesPage from './pages/ClassesPage';
import SubjectsPage from './pages/SubjectsPage';
import StudentsPage from './pages/StudentsPage';
import GradesPage from './pages/GradesPage';
import RecapPage from './pages/RecapPage';
import RankingPage from './pages/RankingPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

/*
 * The published web version uses clean URLs (BrowserRouter). The packaged
 * Android build runs from the device (file://), where history.pushState is
 * blocked, so that build is compiled with VITE_ROUTER=hash and uses HashRouter.
 */
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter;

function App() {
  return (
    <AuthProvider>
      <LoginGate>
        <AppProvider>
          <ToastProvider>
            <Router>
              <AppShell>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/sekolah" element={<SchoolsPage />} />
                  <Route path="/kelas" element={<ClassesPage />} />
                  <Route path="/mapel" element={<SubjectsPage />} />
                  <Route path="/siswa" element={<StudentsPage />} />
                  <Route path="/nilai" element={<GradesPage />} />
                  <Route path="/rekap" element={<RecapPage />} />
                  <Route path="/peringkat" element={<RankingPage />} />
                  <Route path="/pengaturan" element={<SettingsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </AppShell>
            </Router>
          </ToastProvider>
        </AppProvider>
      </LoginGate>
    </AuthProvider>
  );
}

export default App;
