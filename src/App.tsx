import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppDataProvider } from './context/AppDataContext';
import { BottomNav } from './components/BottomNav';
import { ReadConfirmController } from './components/ReadConfirmController';
import { Home } from './pages/Home';
import { Guides } from './pages/Guides';
import { GuideDetail } from './pages/GuideDetail';
import { Review } from './pages/Review';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <AppDataProvider>
      <HashRouter>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/guides" element={<Guides />} />
            <Route path="/guides/:guideId" element={<GuideDetail />} />
            <Route path="/review" element={<Review />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <BottomNav />
        <ReadConfirmController />
      </HashRouter>
    </AppDataProvider>
  );
}
