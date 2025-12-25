import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { RewardsPage } from './pages/RewardsPage';
import { RewardHistoryPage } from './pages/RewardHistoryPage';
import { AdminPage } from './pages/AdminPage';
import { Navigation } from './components/Navigation';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <Routes>
          <Route path="/" element={<RewardsPage />} />
          <Route path="/history" element={<RewardHistoryPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;