import Header from './components/Header';
import SearchForm from './components/SearchForm';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <div className="app-wrapper">
      {/* Gọi các mảnh ghép vào */}
      <Header />
      <SearchForm />

      <section className="features">
        <div className="feature-item">
          <h4>Đặt vé tức thì</h4>
          <p>Xác nhận nhanh qua email</p>
        </div>
        <div className="feature-item">
          <h4>Thanh toán an toàn</h4>
          <p>Nhiều phương thức linh hoạt</p>
        </div>
        <div className="feature-item">
          <h4>Hỗ trợ 24/7</h4>
          <p>Luôn sẵn sàng đồng hành</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default App;