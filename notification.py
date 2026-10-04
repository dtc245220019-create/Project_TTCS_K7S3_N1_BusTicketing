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