import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import BusListPage from './pages/BusListPage';
import PaymentPage from './pages/PaymentPage';
import UserDashboard from './pages/UserDashboard';
import TicketVerification from './pages/TicketVerification';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MapPage from './pages/MapPage';
import PaymentResultPage from './pages/PaymentResultPage';
import TicketCancellation from './pages/TicketCancellation';
import MonthlyPassPage from './pages/MonthlyPassPage';
import AdminDashboard from './pages/AdminDashboard';
import FeedbackPage from './pages/FeedbackPage';
import RefundStatusPage from './pages/RefundStatusPage';
import ChatWidget from './components/ChatWidget';
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
            <Route path="/payment-result" element={<PaymentResultPage />} />
            <Route path="/monthly-pass" element={<MonthlyPassPage />} />
            <Route path="/ve-thang" element={<MonthlyPassPage />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/cancellation" element={<UserDashboard defaultTab="exchange-cancel" />} />
            <Route path="/cancel-ticket" element={<UserDashboard defaultTab="exchange-cancel" />} />
            <Route path="/verify-ticket" element={<TicketVerification />} />
            <Route path="/verify" element={<TicketVerification />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/refund-status" element={<RefundStatusPage />} />
            <Route path="/tra-cuu-hoan-tien" element={<RefundStatusPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </main>

        <Footer />
        <ChatWidget />
      </div>
    </Router>
  );
}

export default App;