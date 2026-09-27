import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import PaymentPage from './pages/PaymentPage';
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
        </Routes>

        <Footer />
      </div>
    </Router>
  );
}

export default App;