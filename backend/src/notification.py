import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# ==========================================
# 1. HÀM GỬI EMAIL XÁC NHẬN DÙNG DỮ LIỆU VÉ THẬT
# ==========================================
def send_email_confirmation(to_email: str, ticket_data: dict):
    """
    Gửi email định dạng HTML chi tiết hóa đơn vé xe khi đặt thành công.
    `ticket_data` chứa: ticket_code, customer_name, route_name, departure_time, seat_number, total_price
    """
    sender_email = "busticketingduan@gmail.com"
    sender_password = "wrykoqvwkzlcxbpx"

    # Trích xuất dữ liệu đồng bộ từ Vé
    ticket_code = ticket_data.get('ticket_code', 'N/A')
    customer_name = ticket_data.get('customer_name', 'Quý khách')
    route_name = ticket_data.get('route_name', 'Chưa xác định')
    departure_time = ticket_data.get('departure_time', 'Chưa xác định')
    seat_number = ticket_data.get('seat_number', 'N/A')
    total_price = ticket_data.get('total_price', 0)

    subject = f"[BusTicket] Xác nhận đặt vé thành công - Mã vé #{ticket_code}"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                <h2 style="color: #2b6cb0; text-align: center; margin-bottom: 20px;">CẢM ƠN BẠN ĐÃ ĐẶT VÉ XE!</h2>
                <p>Xin chào <b>{customer_name}</b>,</p>
                <p>Yêu cầu đặt vé của bạn đã được hệ thống ghi nhận thành công. Dưới đây là thông tin chi tiết:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                    <tr style="background-color: #f7fafc;">
                        <td style="padding: 10px; border: 1px solid #e2e8f0;"><b>Mã vé:</b></td>
                        <td style="padding: 10px; border: 1px solid #e2e8f0; color: #e53e3e; font-weight: bold;">{ticket_code}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #e2e8f0;"><b>Tuyến đường:</b></td>
                        <td style="padding: 10px; border: 1px solid #e2e8f0;">{route_name}</td>
                    </tr>
                    <tr style="background-color: #f7fafc;">
                        <td style="padding: 10px; border: 1px solid #e2e8f0;"><b>Giờ xuất bến:</b></td>
                        <td style="padding: 10px; border: 1px solid #e2e8f0;">{departure_time}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #e2e8f0;"><b>Số ghế:</b></td>
                        <td style="padding: 10px; border: 1px solid #e2e8f0;">{seat_number}</td>
                    </tr>
                    <tr style="background-color: #f7fafc;">
                        <td style="padding: 10px; border: 1px solid #e2e8f0;"><b>Tổng tiền:</b></td>
                        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #2b6cb0;">{total_price:,} VNĐ</td>
                    </tr>
                </table>

                <p style="margin-top: 20px; font-size: 13px; color: #718096; text-align: center;">
                    Vui lòng có mặt tại bến xe trước 15 phút so với giờ xuất bến. Trân trọng!
                </p>
            </div>
        </body>
    </html>
    """

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(html_content, 'html'))

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, to_email, msg.as_string())
        server.quit()
        print(f"[SUCCESS] [EMAIL] Đã gửi thông báo xác nhận thành công tới: {to_email}")
        return True
    except Exception as e:
        print(f"[ERROR] [EMAIL] Lỗi gửi Email: {e}")
        return False


# ==========================================
# 2. HÀM MOCK SMS ĐỒNG BỘ THEO DỮ LIỆU VÉ
# ==========================================
def send_sms_confirmation(phone_number: str, ticket_data: dict):
    """
    Giả lập Gateway gửi SMS thông báo tức thì, hiển thị thông tin vé ngắn gọn lên Console log.
    """
    # Chuẩn hóa số điện thoại người nhận
    formatted_phone = phone_number.strip()
    if formatted_phone.startswith("0"):
        formatted_phone = "+84" + formatted_phone[1:]

    ticket_code = ticket_data.get('ticket_code', 'N/A')
    seat_number = ticket_data.get('seat_number', 'N/A')
    departure_time = ticket_data.get('departure_time', 'N/A')

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    message_content = f"[BusTicket] Dat ve thanh cong! Ma ve: {ticket_code}, Ghe: {seat_number}, Gio chay: {departure_time}. Cam on quy khach!"

    # In Log định dạng bảng đẹp mắt trên Terminal để Báo cáo / Demo
    print("\n" + "="*65)
    print(" 📲 [MOCK SMS GATEWAY - THÔNG BÁO ĐẶT VÉ THÀNH CÔNG]")
    print(f" 🕒 Thời gian gửi : {timestamp}")
    print(f" 📞 Số điện thoại : {formatted_phone}")
    print(f" 🎫 Mã vé đồng bộ : {ticket_code}")
    print(f" 💬 Nội dung SMS  : {message_content}")
    print("="*65 + "\n")

    return True


# ==========================================
# 3. HÀM GỬI EMAIL CHÀO MỪNG ĐĂNG KÝ TÀI KHOẢN
# ==========================================
def send_registration_confirmation(to_email: str, user_data: dict):
    """
    Gửi email chào mừng khi khách hàng / người dùng đăng ký tài khoản thành công qua Gmail SMTP thật.
    `user_data` chứa: full_name, email, phone, role
    """
    sender_email = "busticketingduan@gmail.com"
    sender_password = "wrykoqvwkzlcxbpx"

    full_name = user_data.get('full_name', 'Quý khách')
    phone = user_data.get('phone', 'N/A')
    role = user_data.get('role', 'HanhKhach')
    role_label = {
        'HanhKhach': 'Hành Khách',
        'TaiXe': 'Tài Xế',
        'PhuXe': 'Phụ Xe / Quầy Soát Vé',
        'Admin': 'Quản Trị Viên',
        'QuanTriVien': 'Quản Trị Viên'
    }.get(role, 'Thành Viên')

    now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    subject = f"[SmartBus] Chúc mừng {full_name} đăng ký tài khoản thành công!"

    html_content = f"""
    <html>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
            <div style="max-width: 620px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
                
                <!-- Header Banner -->
                <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0284c7 100%); padding: 36px 30px; text-align: center; color: #ffffff;">
                    <div style="font-size: 40px; margin-bottom: 8px;">🚌</div>
                    <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Chào Mừng Đến Với SmartBus!</h1>
                    <p style="margin: 0; font-size: 14px; color: #bfdbfe;">Hệ Thống Đặt Vé Xe Khách & Vé Tháng Trực Tuyến Thông Minh</p>
                </div>

                <!-- Body Content -->
                <div style="padding: 32px 30px;">
                    <p style="font-size: 16px; margin-top: 0;">Xin chào <b>{full_name}</b>,</p>
                    <p style="font-size: 14px; color: #475569;">
                        Tài khoản của bạn đã được khởi tạo thành công trên hệ thống <b>SmartBus</b>. Bạn có thể sử dụng thông tin này để đăng nhập, tìm kiếm chuyến xe, chọn sơ đồ ghế trực tuyến và đăng ký thẻ vé tháng ưu đãi.
                    </p>

                    <!-- Account Info Box -->
                    <div style="background-color: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 24px 0;">
                        <div style="font-size: 13px; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">
                            📋 Thông Tin Tài Khoản Của Bạn
                        </div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr>
                                <td style="padding: 6px 0; color: #64748b; width: 140px;"><b>Họ và tên:</b></td>
                                <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">{full_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;"><b>Email đăng nhập:</b></td>
                                <td style="padding: 6px 0; color: #2563eb; font-weight: 700; font-family: monospace;">{to_email}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;"><b>Số điện thoại:</b></td>
                                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">{phone}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;"><b>Vai trò hệ thống:</b></td>
                                <td style="padding: 6px 0;"><span style="background-color: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight bold;">{role_label}</span></td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;"><b>Thời gian đăng ký:</b></td>
                                <td style="padding: 6px 0; color: #475569;">{now_str}</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Highlights -->
                    <div style="margin: 24px 0;">
                        <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 10px;">🌟 Tiện ích nổi bật dành cho bạn:</div>
                        <ul style="padding-left: 20px; margin: 0; font-size: 13.5px; color: #475569; line-height: 1.8;">
                            <li><b>Đặt vé giữ chỗ 10 phút:</b> Chọn sơ đồ ghế 2 tầng trực quan, hoàn toàn miễn phí.</li>
                            <li><b>Thanh toán tức thì:</b> Hỗ trợ VietQR, VNPay, ZaloPay, MoMo bảo mật chuẩn Sandbox.</li>
                            <li><b>Vé điện tử mã QR:</b> Lên xe nhanh chóng chỉ với 1 lần quét tại cửa xe.</li>
                            <li><b>Ưu đãi vé tháng:</b> Tiết kiệm tới 20% cho Học sinh / Sinh viên trên toàn mạng lưới.</li>
                        </ul>
                    </div>

                    <div style="text-align: center; margin: 32px 0 16px 0;">
                        <a href="http://localhost:5173/login" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 10px; font-size: 15px; font-weight: 700; display: inline-block; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
                            🚀 Đăng Nhập Ngay Vào SmartBus
                        </a>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                    <p style="margin: 0 0 6px 0;">Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email hoặc liên hệ tổng đài hỗ trợ.</p>
                    <p style="margin: 0; font-weight: 600; color: #334155;">📞 Hotline hỗ trợ 24/7: <b>1900 6868</b> • 📧 Email: <b>support@smartbus.vn</b></p>
                    <p style="margin: 6px 0 0 0; color: #94a3b8;">© 2026 SmartBus Ticketing System. All rights reserved.</p>
                </div>
            </div>
        </body>
    </html>
    """

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(html_content, 'html'))

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587, timeout=10)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, to_email, msg.as_string())
        server.quit()
        print(f"[SUCCESS] [EMAIL] Đã gửi thư chào mừng đăng ký thành công tới: {to_email}")
        return True
    except Exception as e:
        print(f"[ERROR] [EMAIL] Lỗi gửi Email chào mừng: {e}")
        return False