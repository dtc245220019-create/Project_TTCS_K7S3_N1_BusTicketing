import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import BusListPage from './pages/BusListPage';
import PaymentPage from './pages/PaymentPage';
import UserDashboard from './pages/UserDashboard';
import TicketVerification from './pages/TicketVerification';
import TicketCancellation from './pages/TicketCancellation';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MapPage from './pages/MapPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-wrapper">
        <Header />

        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/buses" element={<BusListPage />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/verify-ticket" element={<TicketVerification />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/cancel-ticket" element={<TicketCancellation />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;