import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import PaymentPage from './pages/PaymentPage';
import UserDashboard from './pages/UserDashboard';
import TicketVerification from './pages/TicketVerification';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-wrapper">
        <Header />

        {/* Cấu hình các tuyến đường (Route) */}
        <Routes>
          {/* Trang chủ: http://localhost:5173/ */}
          <Route path="/" element={<HomePage />} />

          {/* Trang thanh toán: http://localhost:5173/payment */}
          <Route path="/payment" element={<PaymentPage />} />

          {/* Trang Quản Lý Vé (FE4): http://localhost:5173/dashboard */}
          <Route path="/dashboard" element={<UserDashboard />} />

          {/* Trang Soát Vé (FE4): http://localhost:5173/verify-ticket */}
          <Route path="/verify-ticket" element={<TicketVerification />} />
        </Routes>

        <Footer />
      </div>
    </Router>
  );
}

export default App;