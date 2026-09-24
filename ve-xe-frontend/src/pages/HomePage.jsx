import SearchForm from '../components/SearchForm';

function HomePage() {
  return (
    <div>
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
    </div>
  );
}

export default HomePage;