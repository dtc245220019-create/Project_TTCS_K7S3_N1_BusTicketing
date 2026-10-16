-- =============================================================================
-- SMART BUS TICKETING - HỆ THỐNG ĐẶT VÉ XE BUS THÔNG MINH
-- Database Schema DDL (Chuẩn hóa 100% theo mô hình ERD "Smart_Bus_Ticketing")
-- Tương thích: MySQL 8.0+ / MariaDB / SQLite
-- =============================================================================

-- 1. BẢNG NGƯỜI DÙNG (NGUOI_DUNG)
CREATE TABLE IF NOT EXISTS nguoi_dung (
    ma_nguoi_dung INTEGER PRIMARY KEY AUTOINCREMENT,
    ho_ten VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    so_dien_thoai VARCHAR(20) NOT NULL UNIQUE,
    mat_khau_hash VARCHAR(255) NOT NULL,
    vai_tro VARCHAR(30) NOT NULL DEFAULT 'HanhKhach', -- 'Admin', 'QuanLy', 'TaiXe', 'PhuXe', 'HanhKhach'
    loai_uu_dai VARCHAR(30) NOT NULL DEFAULT 'Khong', -- 'HSSV', 'NguoiCaoTuoi', 'Khong'
    trang_thai_duyet_uu_dai VARCHAR(30) NOT NULL DEFAULT 'ChoDuyet', -- 'ChoDuyet', 'DaDuyet', 'TuChoi'
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG TUYẾN XE (TUYEN_XE)
CREATE TABLE IF NOT EXISTS tuyen_xe (
    ma_tuyen INTEGER PRIMARY KEY AUTOINCREMENT,
    ten_tuyen VARCHAR(255) NOT NULL,
    diem_dau VARCHAR(100) NOT NULL,
    diem_cuoi VARCHAR(100) NOT NULL,
    gia_ve_co_ban DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    khoang_cach_km FLOAT DEFAULT 0.0,
    trang_thai VARCHAR(30) NOT NULL DEFAULT 'HoatDong' -- 'HoatDong', 'TamDung'
);

-- 3. BẢNG TRẠM DỪNG (TRAM_DUNG)
CREATE TABLE IF NOT EXISTS tram_dung (
    ma_tram INTEGER PRIMARY KEY AUTOINCREMENT,
    ten_tram VARCHAR(255) NOT NULL,
    toa_do_lat FLOAT NOT NULL,
    toa_do_lng FLOAT NOT NULL,
    dia_chi VARCHAR(255) NOT NULL
);

-- 4. BẢNG CHI TIẾT TUYẾN TRẠM (CHI_TIET_TUYEN_TRAM)
CREATE TABLE IF NOT EXISTS chi_tiet_tuyen_tram (
    ma_tuyen INTEGER NOT NULL,
    ma_tram INTEGER NOT NULL,
    thu_tu_tram INTEGER NOT NULL,
    khoang_cach_km FLOAT NOT NULL DEFAULT 0.0,
    PRIMARY KEY (ma_tuyen, ma_tram),
    FOREIGN KEY (ma_tuyen) REFERENCES tuyen_xe(ma_tuyen) ON DELETE CASCADE,
    FOREIGN KEY (ma_tram) REFERENCES tram_dung(ma_tram) ON DELETE CASCADE
);

-- 5. BẢNG XE BUÝT (XE_BUYT)
CREATE TABLE IF NOT EXISTS xe_buyt (
    ma_xe INTEGER PRIMARY KEY AUTOINCREMENT,
    bien_so_xe VARCHAR(50) NOT NULL UNIQUE,
    loai_xe VARCHAR(100) DEFAULT 'Giường nằm chất lượng cao',
    so_cho_ngoi INTEGER NOT NULL DEFAULT 36,
    kinh_do_hien_tai FLOAT DEFAULT 0.0,
    vi_do_hien_tai FLOAT DEFAULT 0.0,
    trang_thai VARCHAR(30) NOT NULL DEFAULT 'SanSang' -- 'SanSang', 'DangChay', 'BaoTri'
);

-- 6. BẢNG GHẾ NGỒI (GHE_NGOI)
CREATE TABLE IF NOT EXISTS ghe_ngoi (
    ma_ghe INTEGER PRIMARY KEY AUTOINCREMENT,
    ma_xe INTEGER NOT NULL,
    so_ghe VARCHAR(10) NOT NULL,
    tang_hoac_day VARCHAR(30) DEFAULT 'TangDuoi', -- 'TangDuoi', 'TangTren', 'DayA', 'DayB'
    loai_ghe VARCHAR(30) DEFAULT 'STANDARD',
    UNIQUE (ma_xe, so_ghe),
    FOREIGN KEY (ma_xe) REFERENCES xe_buyt(ma_xe) ON DELETE CASCADE
);

-- 7. BẢNG CHUYẾN XE (CHUYEN_XE)
CREATE TABLE IF NOT EXISTS chuyen_xe (
    ma_chuyen INTEGER PRIMARY KEY AUTOINCREMENT,
    ma_tuyen INTEGER NOT NULL,
    ma_xe INTEGER NOT NULL,
    ma_tai_xe INTEGER,
    ma_phu_xe INTEGER,
    gio_khoi_hanh_du_kien DATETIME NOT NULL,
    gio_den_du_kien DATETIME NOT NULL,
    gio_khoi_hanh_thuc_te DATETIME,
    gia_ve DECIMAL(12, 2) NOT NULL,
    so_cho_trong INTEGER NOT NULL,
    trang_thai VARCHAR(30) NOT NULL DEFAULT 'ChuaChay', -- 'ChuaChay', 'DangChay', 'HoanThanh', 'Huy'
    FOREIGN KEY (ma_tuyen) REFERENCES tuyen_xe(ma_tuyen),
    FOREIGN KEY (ma_xe) REFERENCES xe_buyt(ma_xe),
    FOREIGN KEY (ma_tai_xe) REFERENCES nguoi_dung(ma_nguoi_dung),
    FOREIGN KEY (ma_phu_xe) REFERENCES nguoi_dung(ma_nguoi_dung)
);

-- 8. BẢNG VOUCHER (VOUCHER)
CREATE TABLE IF NOT EXISTS voucher (
    ma_voucher INTEGER PRIMARY KEY AUTOINCREMENT,
    ma_giam_gia VARCHAR(50) NOT NULL UNIQUE,
    phan_tram_giam FLOAT NOT NULL DEFAULT 0.0,
    so_tien_giam_toi_da DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    ngay_het_han DATE NOT NULL,
    trang_thai VARCHAR(30) NOT NULL DEFAULT 'HoatDong'
);

-- 9. BẢNG VÉ ĐIỆN TỬ (VE_DIEN_TU)
CREATE TABLE IF NOT EXISTS ve_dien_tu (
    ma_ve INTEGER PRIMARY KEY AUTOINCREMENT,
    ma_ve_code VARCHAR(50) NOT NULL UNIQUE,
    ma_nguoi_dung INTEGER NOT NULL,
    ma_chuyen INTEGER NOT NULL,
    ma_ghe INTEGER NOT NULL,
    ma_voucher INTEGER,
    ma_qr TEXT NOT NULL,
    gia_ve_thuc_te DECIMAL(12, 2) NOT NULL,
    thoi_gian_giu_cho DATETIME,
    trang_thai_ve VARCHAR(30) NOT NULL DEFAULT 'GiuCho', -- 'GiuCho', 'DaThanhToan', 'DaSoat', 'DaHuy'
    thoi_gian_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_nguoi_dung) REFERENCES nguoi_dung(ma_nguoi_dung),
    FOREIGN KEY (ma_chuyen) REFERENCES chuyen_xe(ma_chuyen),
    FOREIGN KEY (ma_ghe) REFERENCES ghe_ngoi(ma_ghe),
    FOREIGN KEY (ma_voucher) REFERENCES voucher(ma_voucher)
);

-- 10. BẢNG THANH TOÁN (THANH_TOAN)
CREATE TABLE IF NOT EXISTS thanh_toan (
    ma_giao_dich INTEGER PRIMARY KEY AUTOINCREMENT,
    ma_giao_dich_code VARCHAR(100) NOT NULL UNIQUE,
    ma_ve INTEGER NOT NULL,
    phuong_thuc VARCHAR(50) NOT NULL DEFAULT 'SANDBOX', -- 'MoMo', 'VNPay', 'ZaloPay', 'Bank', 'SANDBOX'
    so_tien DECIMAL(12, 2) NOT NULL,
    thoi_gian_giao_dich DATETIME DEFAULT CURRENT_TIMESTAMP,
    trang_thai_giao_dich VARCHAR(30) NOT NULL DEFAULT 'ThanhCong', -- 'ThanhCong', 'ThatBai', 'DaHoanTien', 'ChoThanhToan'
    ma_hoa_don_dien_tu VARCHAR(100),
    FOREIGN KEY (ma_ve) REFERENCES ve_dien_tu(ma_ve)
);

-- 11. BẢNG VÉ THÁNG (VE_THANG)
CREATE TABLE IF NOT EXISTS ve_thang (
    ma_ve_thang INTEGER PRIMARY KEY AUTOINCREMENT,
    ma_nguoi_dung INTEGER NOT NULL,
    ma_tuyen INTEGER NOT NULL,
    ngay_bat_dau DATE NOT NULL,
    ngay_ket_thuc DATE NOT NULL,
    trang_thai VARCHAR(30) NOT NULL DEFAULT 'ConHan', -- 'ConHan', 'HetHan'
    FOREIGN KEY (ma_nguoi_dung) REFERENCES nguoi_dung(ma_nguoi_dung),
    FOREIGN KEY (ma_tuyen) REFERENCES tuyen_xe(ma_tuyen)
);

-- 12. BẢNG BÁO CÁO SỰ CỐ (BAO_CAO_SU_CO)
CREATE TABLE IF NOT EXISTS bao_cao_su_co (
    ma_su_co INTEGER PRIMARY KEY AUTOINCREMENT,
    ma_chuyen INTEGER NOT NULL,
    ma_tai_xe INTEGER NOT NULL,
    loai_su_co VARCHAR(50) NOT NULL, -- 'KetXe', 'ThuongXayRa', 'HongHoc', 'ThoiTiet'
    mo_ta TEXT,
    thoi_gian_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_chuyen) REFERENCES chuyen_xe(ma_chuyen),
    FOREIGN KEY (ma_tai_xe) REFERENCES nguoi_dung(ma_nguoi_dung)
);

-- 13. BẢNG PHẢN ÁNH / ĐÁNH GIÁ (PHAN_ANH)
CREATE TABLE IF NOT EXISTS phan_anh (
    ma_phan_anh INTEGER PRIMARY KEY AUTOINCREMENT,
    ma_nguoi_dung INTEGER NOT NULL,
    ma_chuyen INTEGER NOT NULL,
    danh_gia_sao INTEGER NOT NULL DEFAULT 5,
    noi_dung TEXT,
    thoi_gian_gui DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_nguoi_dung) REFERENCES nguoi_dung(ma_nguoi_dung),
    FOREIGN KEY (ma_chuyen) REFERENCES chuyen_xe(ma_chuyen)
);

-- 14. BẢNG NHẬT KÝ HOẠT ĐỘNG / SOÁT VÉ (NHAT_KY_HOAT_DONG)
CREATE TABLE IF NOT EXISTS nhat_ky_hoat_dong (
    ma_nhat_ky INTEGER PRIMARY KEY AUTOINCREMENT,
    ma_nguoi_dung INTEGER,
    hanh_dong VARCHAR(255) NOT NULL,
    dia_chi_ip VARCHAR(50) DEFAULT '127.0.0.1',
    chi_tiet TEXT,
    thoi_gian DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_nguoi_dung) REFERENCES nguoi_dung(ma_nguoi_dung)
);
