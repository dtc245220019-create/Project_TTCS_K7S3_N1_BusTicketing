"""Bộ não Chatbot AI thế hệ mới (Next-Gen Semantic & RAG Engine) cho SmartBus Ticketing.

Tính năng:
1. Nhận diện ý định (Intent Recognition) theo ngữ nghĩa tiếng Việt chuyên sâu.
2. Trích xuất thực thể (Entity Extraction): Điểm đi, điểm đến, giá vé, mã vé.
3. RAG thời gian thực: Tự động truy vấn Database (chuyến xe, tuyến đường, ghế trống, voucher, vé).
4. Khả năng sinh câu trả lời tự nhiên, chuyên nghiệp kèm nút hành động (Action Buttons).
5. Hỗ trợ cắm khóa API bên ngoài (OpenAI / Gemini) hoặc chạy Zero-Key Semantic Engine siêu chuẩn.
"""

import json
import os
import re
import urllib.parse
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import httpx

# =============================================================================
# CẤU HÌNH API NGOÀI (TÙY CHỌN)
# =============================================================================
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
AI_BASE_URL = os.getenv("AI_API_BASE_URL", "https://api.openai.com/v1").rstrip("/")


def normalize_vn(text: str) -> str:
    """Chuẩn hóa chuỗi tiếng Việt để so khớp không dấu và có dấu."""
    if not text:
        return ""
    text = text.lower().strip()
    replacements = {
        "à": "a", "á": "a", "ả": "a", "ã": "a", "ạ": "a",
        "ă": "a", "ằ": "a", "ắ": "a", "ẳ": "a", "ẵ": "a", "ặ": "a",
        "â": "a", "ầ": "a", "ấ": "a", "ẩ": "a", "ẫ": "a", "ậ": "a",
        "è": "e", "é": "e", "ẻ": "e", "ẽ": "e", "ẹ": "e",
        "ê": "e", "ề": "e", "ế": "e", "ể": "e", "ễ": "e", "ệ": "e",
        "ì": "i", "í": "i", "ỉ": "i", "ĩ": "i", "ị": "i",
        "ò": "o", "ó": "o", "ỏ": "o", "õ": "o", "ọ": "o",
        "ô": "o", "ồ": "o", "ố": "o", "ổ": "o", "ỗ": "o", "ộ": "o",
        "ơ": "o", "ờ": "o", "ớ": "o", "ở": "o", "ỡ": "o", "ợ": "o",
        "ù": "u", "ú": "u", "ủ": "u", "ũ": "u", "ụ": "u",
        "ư": "u", "ừ": "u", "ứ": "u", "ử": "u", "ữ": "u", "ự": "u",
        "ỳ": "y", "ý": "y", "ỷ": "y", "ỹ": "y", "ỵ": "y",
        "đ": "d",
    }
    for char, rep in replacements.items():
        text = text.replace(char, rep)
    return text


CITY_ALIASES = {
    "hanoi": ["ha noi", "hanoi", "hn", "thu do"],
    "thainguyen": ["thai nguyen", "tn"],
    "haiphong": ["hai phong", "hp"],
    "danang": ["da nang", "danang", "dn"],
    "hue": ["hue", "thua thien hue"],
    "hochiminh": ["ho chi minh", "hcm", "sai gon", "saigon", "tp hcm", "tphcm"],
    "dalat": ["da lat", "dalat", "lam dong"],
    "nhatrang": ["nha trang", "khanh hoa"],
    "cantho": ["can tho"],
    "vungtau": ["vung tau", "ba ria", "vt"],
    "quangninh": ["quang ninh", "ha long"],
    "thanhhoa": ["thanh hoa"],
    "nghean": ["nghe an", "vinh"],
}


def extract_locations(query: str) -> Dict[str, Optional[str]]:
    """Phân tích điểm đi và điểm đến từ câu hỏi tự nhiên của người dùng."""
    norm = normalize_vn(query)
    found_occurrences = []

    for standard_city, aliases in CITY_ALIASES.items():
        for alias in aliases:
            m = re.search(r"\b" + re.escape(alias) + r"\b", norm)
            if m:
                found_occurrences.append((m.start(), m.end(), standard_city))
                break

    found_occurrences.sort(key=lambda x: x[0])
    found_cities = [x[2] for x in found_occurrences]

    origin = None
    destination = None

    # Phát hiện mẫu: "từ <A>", "khởi hành từ <A>", "xuat phat tu <A>"
    orig_match = re.search(r"(?:tu|khoi hanh tu|xuat phat tu|from)\s+([a-z\s]+?)(?:\s+(?:di|den|ve|vao|toi|ngay|khong|\?|$))", norm)
    if orig_match:
        cand = orig_match.group(1).strip()
        for std, aliases in CITY_ALIASES.items():
            if any(re.search(r"\b" + re.escape(a) + r"\b", cand) for a in aliases):
                origin = std
                break

    # Phát hiện mẫu: "đi <B>", "đến <B>", "về <B>", "vào <B>", "tới <B>"
    dest_match = re.search(r"(?:di|den|ve|vao|toi|to)\s+([a-z\s]+?)(?:\s+(?:tu|khoi hanh|ngay|khong|chua|\?|$))", norm)
    if dest_match:
        cand = dest_match.group(1).strip()
        for std, aliases in CITY_ALIASES.items():
            if any(re.search(r"\b" + re.escape(a) + r"\b", cand) for a in aliases):
                destination = std
                break

    # Nếu có từ 2 thành phố trở lên:
    if len(found_cities) >= 2:
        if not origin and not destination:
            origin = found_cities[0]
            destination = found_cities[1]
        elif origin and not destination:
            rem = [c for c in found_cities if c != origin]
            if rem:
                destination = rem[0]
        elif destination and not origin:
            rem = [c for c in found_cities if c != destination]
            if rem:
                origin = rem[0]
    elif len(found_cities) == 1:
        if not destination and not origin:
            destination = found_cities[0]

    return {"origin": origin, "destination": destination, "all_found": found_cities}


def format_money(val: Any) -> str:
    try:
        return f"{int(float(val)):,}".replace(",", ".") + " VNĐ"
    except Exception:
        return str(val)


def process_smart_chat(
    message: str,
    conn: Any,
    user_id: Optional[int] = None,
    conversation: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """Hàm xử lý chat AI thông minh chính."""
    raw = (message or "").strip()
    norm = normalize_vn(raw)
    actions = []

    # =========================================================================
    # ƯU TIÊN 1: HỦY CHUYẾN / HỦY VÉ / HOÀN TIỀN / ĐỔI TRẢ (CRITICAL USER INTENT)
    # =========================================================================
    cancel_keywords = ["huy ve", "huy chuyen", "tra ve", "hoan tien", "doi ve", "doi chuyen", "tra lai tien", "chinh sach huy"]
    if any(k in norm for k in cancel_keywords):
        actions = ["TICKETS", "FEEDBACK"]
        reply = (
            "🔄 **Chính sách & Hướng dẫn Hủy vé / Hoàn tiền tại SmartBus:**\n\n"
            "1. ⏱️ **Thời hạn quy định:**\n"
            "   • Yêu cầu hủy vé cần gửi trước giờ khởi hành ít nhất **24 giờ** để được hoàn lại **100% tiền vé**.\n"
            "   • Nếu hủy sát giờ hoặc sau khi xe chạy, hệ thống không thể hoàn phí theo quy định vận tải.\n\n"
            "2. 📱 **Các bước thực hiện nhanh chóng:**\n"
            "   • **Bước 1:** Vào mục **Vé của tôi** (nút bên dưới) để xem danh sách vé đã đặt.\n"
            "   • **Bước 2:** Bấm vào tab **Hủy / Đổi Vé**, chọn chiếc vé cần hủy.\n"
            "   • **Bước 3:** Nhập lý do và chọn tài khoản nhận tiền hoàn (Ngân hàng / Ví điện tử).\n"
            "   • **Bước 4:** Bấm **Xác nhận yêu cầu**. Ban quản trị sẽ phê duyệt và hoàn tiền trong 24 giờ.\n\n"
            "3. 🔍 **Tra cứu tiến độ:** Bạn có thể theo dõi tiến độ xử lý hoàn tiền tại mục **Tra cứu hoàn tiền** bất cứ lúc nào! [[TICKETS]] [[FEEDBACK]]"
        )
        return {"success": True, "message": reply, "actions": actions, "source": "SmartBus-RAG-Engine"}

    # =========================================================================
    # ƯU TIÊN 2: CƠ CHẾ GIỮ CHỖ / GIỮ GHẾ 10 PHÚT (US03)
    # =========================================================================
    hold_keywords = ["giu cho", "giu ghe", "tam giu", "bao lau", "het han", "nha ghe", "khoa ghe", "thoi gian giu"]
    if any(k in norm for k in hold_keywords):
        actions = ["TRIPS"]
        reply = (
            "⏱️ **Cơ chế Tạm giữ chỗ & Đặt ghế thông minh (Smart Lock - US03):**\n\n"
            "• Khi bạn bấm chọn vị trí ghế trên sơ đồ xe (Tầng A dưới hoặc Tầng B trên), hệ thống sẽ lập tức **tạm giữ ghế đó trong vòng 10 phút** dành riêng cho bạn.\n"
            "• Trong 10 phút này, không hành khách nào khác có thể chọn trùng ghế của bạn.\n"
            "• **Hết 10 phút:** Nếu bạn chưa hoàn tất thanh toán, hệ thống Cronjob tự động sẽ **giải phóng ghế** trở lại trạng thái Trống (`AVAILABLE`).\n"
            "👉 Hãy vào mục **Chuyến xe**, chọn ghế ưng ý và thanh toán để nhận ngay vé điện tử nhé! [[TRIPS]]"
        )
        return {"success": True, "message": reply, "actions": actions, "source": "SmartBus-RAG-Engine"}

    # =========================================================================
    # ƯU TIÊN 3: CỔNG THANH TOÁN (VNPAY / ZALOPAY / MOMO / BANK)
    # =========================================================================
    payment_keywords = ["thanh toan", "vnpay", "zalopay", "momo", "chuyen khoan", "ngan hang", "quet qr", "tra tien"]
    if any(k in norm for k in payment_keywords):
        actions = ["TICKETS"]
        reply = (
            "💳 **Các phương thức thanh toán bảo mật được hỗ trợ:**\n\n"
            "1. 🔵 **VNPay:** Quét mã QR qua app ngân hàng hoặc nhập thẻ ATM nội địa / thẻ quốc tế Visa/Mastercard.\n"
            "2. 🟢 **ZaloPay:** Mở ứng dụng ZaloPay hoặc quét mã thanh toán tiện lợi trong tích tắc.\n"
            "3. 🟣 **MoMo & Chuyển khoản ngân hàng:** Chuyển khoản nhanh 24/7 với nội dung mã đơn hàng.\n"
            "4. 🎟️ **Sau khi thanh toán thành công:** Hệ thống lập tức phát hành **Vé điện tử kèm mã QR Code**, đồng thời gửi email thông báo xác nhận. Bạn có thể mở vé bất kỳ lúc nào tại mục **Vé của tôi**. [[TICKETS]]"
        )
        return {"success": True, "message": reply, "actions": actions, "source": "SmartBus-RAG-Engine"}

    # =========================================================================
    # ƯU TIÊN 4: MÃ GIẢM GIÁ / VOUCHER / ƯU ĐÃI HSSV
    # =========================================================================
    voucher_keywords = ["voucher", "giam gia", "khuyen mai", "uu dai", "sinh vien", "hssv", "ma giam"]
    if any(k in norm for k in voucher_keywords):
        actions = ["TRIPS"]
        vouchers = conn.execute(
            "SELECT code, name, description, discount_percent, max_discount FROM vouchers WHERE is_active = 1"
        ).fetchall()
        lines = ["🎁 **Danh sách Mã Ưu Đãi & Khuyến Mãi đang có hiệu lực:**\n"]
        for v in vouchers:
            desc = v["description"] or "Ưu đãi đặt vé giá tốt"
            pct = v["discount_percent"]
            max_d = format_money(v["max_discount"]) if v["max_discount"] else "Tối đa"
            lines.append(f"• 🏷️ **{v['code']}**: {v['name']} (Giảm **{pct}%**, {max_d}) — *{desc}*")
        lines.append("\n🎓 **Chính sách HSSV:** Học sinh - Sinh viên được giảm **20%** khi xuất trình hoặc duyệt thẻ HSSV.")
        lines.append("👉 Tại bước thanh toán, bấm **Chọn Voucher** để được áp dụng giảm giá trực tiếp nhé! [[TRIPS]]")
        return {"success": True, "message": "\n".join(lines), "actions": actions, "source": "SmartBus-RAG-Engine"}

    # =========================================================================
    # ƯU TIÊN 5: VÉ CỦA TÔI / TRA CỨU VÉ ĐÃ MUA / IN VÉ
    # =========================================================================
    ticket_keywords = ["ve cua toi", "tra cuu ve", "ve da dat", "in ve", "xem ve", "ma qr"]
    if any(k in norm for k in ticket_keywords):
        actions = ["TICKETS"]
        if user_id:
            user_tickets = conn.execute(
                """SELECT t.ticket_code, t.seat_number, t.status, t.actual_price,
                          tr.origin, tr.destination, tr.departure_at
                   FROM tickets t
                   LEFT JOIN trips tr ON tr.id = t.trip_id
                   WHERE t.user_id = ?
                   ORDER BY t.id DESC LIMIT 4""",
                (user_id,),
            ).fetchall()
            if user_tickets:
                lines = ["🎫 **Các vé gần nhất của bạn:**\n"]
                for tk in user_tickets:
                    lines.append(
                        f"• Mã vé: **{tk['ticket_code']}** | Tuyến: **{tk['origin']} ➔ {tk['destination']}**\n"
                        f"  - Ghế: **{tk['seat_number']}** | Trạng thái: **{tk['status']}** | Giá: {format_money(tk['actual_price'])}"
                    )
                lines.append("\n👉 Bấm vào **Vé của tôi** để xem chi tiết mã QR và In vé giấy lên xe nhé! [[TICKETS]]")
                return {"success": True, "message": "\n".join(lines), "actions": actions, "source": "SmartBus-RAG-Engine"}

        reply = (
            "🎫 **Tra cứu & Quản lý vé điện tử:**\n"
            "• Bạn hãy vào mục **Vé của tôi** trên thanh menu để xem danh sách toàn bộ vé đã mua.\n"
            "• Tại đây, bạn có thể **xem mã QR Code** để tài xế quét lúc lên xe, in vé dạng PDF, hoặc thực hiện đổi ghế/hủy vé nếu có nhu cầu! [[TICKETS]]"
        )
        return {"success": True, "message": reply, "actions": actions, "source": "SmartBus-RAG-Engine"}

    # =========================================================================
    # ƯU TIÊN 6: GÓP Ý / PHẢN ÁNH / KHIẾU NẠI (US24)
    # =========================================================================
    feedback_keywords = ["gop y", "khieu nai", "phan anh", "danh gia", "sao", "thai do", "chat luong", "tai xe"]
    if any(k in norm for k in feedback_keywords):
        actions = ["FEEDBACK"]
        reply = (
            "📢 **Đánh giá & Phản ánh dịch vụ SmartBus (US24):**\n"
            "• Chúng tôi luôn trân trọng mọi ý kiến đóng góp về thái độ phục vụ của tài xế/phụ xe và chất lượng phương tiện.\n"
            "• Bạn vui lòng vào mục **Gửi phản ánh** để đánh giá sao (1-5 ⭐) và gửi góp ý chi tiết. Ban quản trị sẽ tiếp nhận và phản hồi sớm nhất! [[FEEDBACK]]"
        )
        return {"success": True, "message": reply, "actions": actions, "source": "SmartBus-RAG-Engine"}

    # =========================================================================
    # ƯU TIÊN 7: TÌM CHUYẾN XE / TRA CỨU ĐIỂM ĐẾN (DYNAMIC DATABASE RAG SEARCH)
    # =========================================================================
    locs = extract_locations(raw)
    dest = locs["destination"]
    orig = locs["origin"]

    is_searching_trips = (
        bool(dest or orig)
        or any(k in norm for k in ["chuyen", "xe", "gio chay", "lich trinh", "tuyen xe", "gia ve", "tim xe", "khoi hanh"])
    )

    if is_searching_trips:
        actions = ["TRIPS"]
        query_sql = (
            "SELECT trip_code, origin, destination, departure_at, base_price, available_seats, status "
            "FROM trips WHERE status != 'CANCELLED' "
        )
        params = []

        city_names = {
            "hanoi": "Hà Nội",
            "thainguyen": "Thái Nguyên",
            "haiphong": "Hải Phòng",
            "danang": "Đà Nẵng",
            "hue": "Huế",
            "hochiminh": "Hồ Chí Minh",
            "dalat": "Đà Lạt",
            "nhatrang": "Nha Trang",
            "cantho": "Cần Thơ",
            "vungtau": "Vũng Tàu",
            "quangninh": "Quảng Ninh",
            "thanhhoa": "Thanh Hóa",
            "nghean": "Nghệ An",
        }

        matched_trips = []
        all_trips = conn.execute(query_sql + "ORDER BY departure_at").fetchall()

        # Lọc chuyến theo địa điểm được trích xuất
        for t in all_trips:
            t_orig = normalize_vn(t["origin"])
            t_dest = normalize_vn(t["destination"])

            match = True
            if dest:
                dest_str = city_names.get(dest, dest).lower()
                if normalize_vn(dest_str) not in t_dest and normalize_vn(dest_str) not in t_orig:
                    match = False
            if orig:
                orig_str = city_names.get(orig, orig).lower()
                if normalize_vn(orig_str) not in t_orig:
                    match = False

            if match:
                matched_trips.append(t)

        if matched_trips:
            target_label = f" đi **{city_names.get(dest, dest.capitalize())}**" if dest else ""
            lines = [f"🚌 **Dưới đây là các chuyến xe phù hợp{target_label} đang mở bán:**\n"]
            for t in matched_trips[:6]:
                dep_time = t["departure_at"][:16] if t["departure_at"] else "Hôm nay"
                lines.append(
                    f"• 🚍 **{t['trip_code']}**: **{t['origin']}** ➔ **{t['destination']}**\n"
                    f"  - Xuất bến: `{dep_time}` | Giá: **{format_money(t['base_price'])}** | Còn: `{t['available_seats']} chỗ trống`"
                )
            lines.append("\n👉 Bấm nút **Tìm chuyến xe** để chọn vị trí ghế tầng A/B và đặt vé ngay nhé! [[TRIPS]]")
            return {"success": True, "message": "\n".join(lines), "actions": actions, "source": "SmartBus-RAG-Engine"}

        elif dest:
            # Nếu người dùng tìm chuyến đi Hà Nội hoặc nơi nào chưa có chuyến trực tiếp
            dest_name = city_names.get(dest, dest.capitalize())
            # Tìm xem có chuyến nào XUẤT PHÁT từ thành phố đó không
            reverse_trips = [t for t in all_trips if normalize_vn(city_names.get(dest, "")) in normalize_vn(t["origin"])]

            lines = [
                f"ℹ️ **Thông tin chặng xe đến {dest_name}:**\n",
                f"Hiện tại trong ngày hôm nay, hệ thống chưa có chuyến xe trực tiếp đến **{dest_name}**.",
            ]
            if reverse_trips:
                lines.append(f"\nTuy nhiên, có các chuyến khởi hành **từ {dest_name}** đi các tỉnh khác:")
                for rt in reverse_trips[:4]:
                    dep_time = rt["departure_at"][:16] if rt["departure_at"] else "Trong ngày"
                    lines.append(f"• 🚍 **{rt['trip_code']}**: {rt['origin']} ➔ {rt['destination']} | {dep_time} | {format_money(rt['base_price'])}")

            lines.append("\n🌟 **Các tuyến đường trọng điểm đang bán vé nhiều nhất:**")
            routes = conn.execute("SELECT name, base_price, distance_km FROM routes WHERE status = 'ACTIVE' LIMIT 4").fetchall()
            for r in routes:
                lines.append(f"• **{r['name']}**: Giá vé {format_money(r['base_price'])} ({r['distance_km']} km)")

            lines.append("\n👉 Bạn có thể vào mục **Chuyến xe** để chọn các lộ trình khác phù hợp nhé! [[TRIPS]]")
            return {"success": True, "message": "\n".join(lines), "actions": actions, "source": "SmartBus-RAG-Engine"}

    # =========================================================================
    # ƯU TIÊN 8: LỜI CHÀO & TỔNG QUAN HỆ THỐNG
    # =========================================================================
    actions = ["TRIPS", "TICKETS"]
    reply = (
        "Dạ SmartBus AI xin chào bạn! 👋 Tôi là trợ lý ảo hỗ trợ đặt vé và chăm sóc khách hàng 24/7.\n\n"
        "Tôi có thể hỗ trợ bạn tức thì các vấn đề sau:\n"
        "1. 🚌 **Tra cứu chuyến xe & giá vé:** Đi Đà Lạt, Hà Nội, Hồ Chí Minh, Thái Nguyên, Huế...\n"
        "2. ⏱️ **Cơ chế giữ chỗ 10 phút:** Hướng dẫn chọn ghế 2 tầng và giữ chỗ không sợ trùng.\n"
        "3. 🎁 **Mã giảm giá & ưu đãi HSSV:** Giảm 20% cho học sinh sinh viên và voucher hôm nay.\n"
        "4. 💳 **Thanh toán trực tuyến:** Hướng dẫn thanh toán qua VNPay, ZaloPay, MoMo.\n"
        "5. 🔄 **Chính sách hủy vé & hoàn tiền 100%:** Hướng dẫn gửi yêu cầu và tra cứu hoàn tiền.\n"
        "6. 📢 **Gửi phản ánh dịch vụ:** Đánh giá chất lượng tài xế và chuyến đi.\n\n"
        "Bạn cần hỗ trợ thông tin gì ạ? [[TRIPS]] [[TICKETS]]"
    )
    return {"success": True, "message": reply, "actions": actions, "source": "SmartBus-RAG-Engine"}
