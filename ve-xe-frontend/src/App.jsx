import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import PaymentPage from './pages/PaymentPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BusListPage from './pages/BusListPage'; // 1. Import trang danh sách xe
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-wrapper">
        <Header />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/buses" element={<BusListPage />} /> {/* 2. Đường dẫn xem danh sách xe & chọn ghế */}
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>

        <Footer />
      </div>
    </Router>
  );
}

export default App;