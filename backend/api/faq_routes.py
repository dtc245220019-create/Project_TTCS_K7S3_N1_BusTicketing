"""FAQ and System Operating Guides router for SmartBus.

Provides:
- Role-based operational guides for all 4 roles: HanhKhach, TaiXe, PhuXe, Admin.
- Category filtering, live keyword search, and vote-helpful endpoints.
- Inquiry submissions from users for continuous FAQ improvement.
"""

from __future__ import annotations

import unicodedata
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from database import get_connection

router = APIRouter(tags=["FAQ & System Guides"])


# =============================================================================
# SCHEMAS
# =============================================================================
class FaqInquiryCreateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=150)
    phone: Optional[str] = Field(None, max_length=20)
    role_target: Optional[str] = Field("HanhKhach", description="Vai trò liên quan")
    category: Optional[str] = Field("Chung", description="Chủ đề câu hỏi")
    question: str = Field(..., min_length=5, max_length=1000)


class FaqItemCreateRequest(BaseModel):
    category: str
    role_target: str = "ALL"
    question: str
    answer: str
    keywords: Optional[str] = ""
    order_num: Optional[int] = 0
    icon: Optional[str] = "💡"


def _clean(text: Optional[str]) -> str:
    """Normalize text without accents for accent-insensitive search."""
    if not text:
        return ""
    s = str(text).replace("đ", "d").replace("Đ", "D")
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower().strip()


# =============================================================================
# ENDPOINTS
# =============================================================================
@router.get("/api/v1/faqs", summary="Lấy danh sách câu hỏi & hướng dẫn vận hành hệ thống")
def list_faqs(
    role: Optional[str] = Query(None, description="Lọc theo role: HanhKhach, TaiXe, PhuXe, Admin hoặc ALL"),
    category: Optional[str] = Query(None, description="Lọc theo nhóm danh mục"),
    search: Optional[str] = Query(None, description="Tìm kiếm từ khóa câu hỏi, câu trả lời"),
    limit: int = Query(100, ge=1, le=200),
):
    """Lấy danh sách các câu hỏi thường gặp và hướng dẫn sử dụng chi tiết theo từng role."""
    with get_connection() as conn:
        query = "SELECT * FROM faqs WHERE is_active = 1"
        params: List[Any] = []

        if role and role.upper() != "ALL":
            query += " AND (role_target = ? OR role_target = 'ALL')"
            params.append(role)

        if category and category.upper() != "ALL":
            query += " AND category = ?"
            params.append(category)

        query += " ORDER BY order_num ASC, helpful_count DESC, id ASC"

        rows = conn.execute(query, params).fetchall()
        results = [dict(r) for r in rows]

        # In-memory filter for accent-insensitive search if search keyword provided
        if search and search.strip():
            clean_search = _clean(search)
            results = [
                r for r in results
                if clean_search in _clean(r.get("question"))
                or clean_search in _clean(r.get("answer"))
                or clean_search in _clean(r.get("keywords"))
                or clean_search in _clean(r.get("category"))
            ]

        return results[:limit]


@router.get("/api/v1/faqs/roles", summary="Danh sách vai trò (4 Roles) và phạm vi nghiệp vụ hệ thống")
def get_supported_roles() -> List[Dict[str, Any]]:
    """Trả về mô tả 4 vai trò trong hệ thống SmartBus và các quyền năng, nghiệp vụ tương ứng."""
    return [
        {
            "code": "ALL",
            "name": "Tất Cả Vai Trò",
            "badge_color": "#64748b",
            "icon": "🌐",
            "description": "Hướng dẫn chung cho mọi người dùng tham gia hệ thống xe buýt thông minh.",
            "key_features": ["Tra cứu lộ trình", "Bản đồ GPS", "Chatbot AI 24/7", "Liên hệ hỗ trợ"],
        },
        {
            "code": "HanhKhach",
            "name": "Hành Khách (Customer)",
            "badge_color": "#2563eb",
            "icon": "🎒",
            "description": "Người đặt vé xe khách, vé tháng, tra cứu chuyến và quản lý hành trình di chuyển.",
            "key_features": [
                "Tra cứu chuyến xe & chọn ghế 2 tầng",
                "Giữ chỗ 10 phút & thanh toán đa phương thức",
                "Nhận vé điện tử mã QR lên xe tức thì",
                "Đăng ký vé tháng ưu đãi HSSV (30-50%)",
                "Hủy vé, đổi chuyến & nhận hoàn tiền tự động",
                "Theo dõi xe buýt thời gian thực trên bản đồ GPS",
            ],
        },
        {
            "code": "TaiXe",
            "name": "Tài Xế (Driver)",
            "badge_color": "#d97706",
            "icon": "🚌",
            "description": "Người điều khiển phương tiện, vận hành chuyến xe và soát vé hành khách tại cửa xe.",
            "key_features": [
                "Xem lịch trình xe chạy và danh sách trạm dừng",
                "Quét mã QR soát vé tại cửa xe buýt (Boarding check-in)",
                "Điểm danh hành khách đã lên xe và vắng mặt",
                "Báo cáo sự cố phương tiện hoặc giao thông khẩn cấp",
            ],
        },
        {
            "code": "PhuXe",
            "name": "Phụ Xe / Soát Vé (Conductor)",
            "badge_color": "#7c3aed",
            "icon": "🎫",
            "description": "Nhân viên hỗ trợ hành khách, kiểm tra vé, bán vé quầy trực tiếp và xử lý tại chỗ.",
            "key_features": [
                "Soát vé QR bằng camera hoặc tra cứu SĐT/Mã vé khi khách hết pin",
                "Bán vé trực tiếp cho khách lên xe tại trạm dừng",
                "Kiểm tra thẻ vé tháng sinh viên/người cao tuổi",
                "Hỗ trợ đổi chỗ và hướng dẫn vị trí tầng 1, tầng 2",
            ],
        },
        {
            "code": "Admin",
            "name": "Quản Trị Viên (System Admin)",
            "badge_color": "#dc2626",
            "icon": "👑",
            "description": "Quản lý toàn bộ hệ sinh thái: tuyến đường, phương tiện, nhân sự, tài chính và bảo mật.",
            "key_features": [
                "Điều phối chuyến xe và phân công tài xế, phụ xe",
                "Xét duyệt hồ sơ ưu đãi vé tháng HSSV (US23)",
                "Thẩm định & phê duyệt hoàn tiền hủy vé (US08)",
                "Phát hành mã Voucher khuyến mãi & cấu hình phụ phí",
                "Báo cáo doanh thu thời gian thực & tỷ lệ lấp đầy ghế",
                "Giám sát nhật ký kiểm toán hệ thống (Audit Logs)",
                "Xuất dữ liệu thống kê ra file Excel / CSV",
            ],
        },
    ]


@router.get("/api/v1/faqs/categories", summary="Danh sách danh mục hướng dẫn và số lượng câu hỏi")
def get_faq_categories():
    """Trả về danh sách các nhóm chủ đề với số lượng câu hỏi tương ứng."""
    category_meta = {
        "DAT_VE": {"name": "Đặt Vé & Chọn Ghế", "icon": "💺", "color": "#2563eb"},
        "THANH_TOAN": {"name": "Thanh Toán & Cổng Online", "icon": "💳", "color": "#16a34a"},
        "VE_THANG": {"name": "Vé Tháng & Ưu Đãi HSSV", "icon": "🎫", "color": "#d97706"},
        "DOI_HUY_VE": {"name": "Đổi Ghế, Hủy Vé & Hoàn Tiền", "icon": "💸", "color": "#dc2626"},
        "SOAT_VE_BOARDING": {"name": "Soát Vé & Lên Xe (Boarding)", "icon": "📱", "color": "#7c3aed"},
        "QUAN_TRI": {"name": "Quản Trị Hệ Thống & Nghiệp Vụ", "icon": "👑", "color": "#0284c7"},
        "KY_THUAT": {"name": "Kỹ Thuật & Hỗ Trợ 24/7", "icon": "🛠️", "color": "#475569"},
    }

    with get_connection() as conn:
        counts = conn.execute(
            "SELECT category, COUNT(*) as cnt FROM faqs WHERE is_active = 1 GROUP BY category"
        ).fetchall()
        counts_dict = {r["category"]: r["cnt"] for r in counts}

    result = []
    for cat_code, meta in category_meta.items():
        result.append({
            "code": cat_code,
            "name": meta["name"],
            "icon": meta["icon"],
            "color": meta["color"],
            "count": counts_dict.get(cat_code, 0),
        })

    return result


@router.get("/api/v1/faqs/stats", summary="Thống kê tổng quan trung tâm trợ giúp FAQ")
def get_faq_stats():
    """Thống kê tổng số lượng hướng dẫn, số lượt đánh giá hữu ích."""
    with get_connection() as conn:
        total = conn.execute("SELECT COUNT(*) FROM faqs WHERE is_active = 1").fetchone()[0]
        helpful = conn.execute("SELECT SUM(helpful_count) FROM faqs WHERE is_active = 1").fetchone()[0] or 0
        categories = conn.execute("SELECT COUNT(DISTINCT category) FROM faqs WHERE is_active = 1").fetchone()[0]
        roles = conn.execute("SELECT COUNT(DISTINCT role_target) FROM faqs WHERE is_active = 1").fetchone()[0]

    return {
        "total_faqs": total,
        "total_helpful_votes": helpful,
        "total_categories": categories,
        "total_roles": roles,
        "support_hotline": "1900 6868",
        "support_email": "hotro@smartbus.vn",
    }


@router.get("/api/v1/faqs/{faq_id}", summary="Xem chi tiết một câu hỏi / hướng dẫn")
def get_faq_detail(faq_id: int):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM faqs WHERE id = ? AND is_active = 1", (faq_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi hoặc hướng dẫn này")
        return dict(row)


@router.post("/api/v1/faqs/{faq_id}/helpful", summary="Bình chọn câu trả lời hữu ích")
def vote_helpful(faq_id: int):
    with get_connection() as conn:
        row = conn.execute("SELECT id, helpful_count FROM faqs WHERE id = ?", (faq_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi")
        new_count = (row["helpful_count"] or 0) + 1
        conn.execute("UPDATE faqs SET helpful_count = ? WHERE id = ?", (new_count, faq_id))
        conn.commit()
        return {"id": faq_id, "helpful_count": new_count, "message": "Cảm ơn bạn đã phản hồi!"}


@router.post("/api/v1/faqs", status_code=status.HTTP_201_CREATED, summary="Gửi câu hỏi / Thắc mắc mới về hệ thống")
def submit_inquiry(payload: FaqInquiryCreateRequest):
    """Cho phép người dùng hoặc nhân viên gửi thắc mắc mới cần được ban quản trị giải đáp."""
    with get_connection() as conn:
        # Ghi nhận thông báo vào notifications cho admin
        conn.execute(
            """INSERT INTO notifications (type, recipient, title, message, status)
               VALUES ('EMAIL', 'admin@smartbus.vn', ?, ?, 'SENT')""",
            (
                f"[Thắc mắc FAQ mới từ {payload.full_name}] - {payload.category}",
                f"Người gửi: {payload.full_name} ({payload.email} - {payload.phone or 'N/A'})\n"
                f"Vai trò: {payload.role_target}\n"
                f"Nội dung thắc mắc: {payload.question}",
            ),
        )

        # Lưu câu hỏi vào bảng feedbacks với category là 'FAQ_Inquiry'
        cursor = conn.execute(
            """INSERT INTO feedbacks (user_id, rating, rating_stars, category, comment, content, status)
               VALUES (1, 5, 5, 'FAQ_Inquiry', ?, ?, 'PENDING')""",
            (
                f"[{payload.role_target}] {payload.question}",
                f"Người gửi: {payload.full_name} ({payload.email} - {payload.phone or 'N/A'}). Câu hỏi: {payload.question}",
            ),
        )
        conn.commit()

        return {
            "success": True,
            "message": "Thắc mắc của bạn đã được gửi thành công tới Ban Quản Trị SmartBus. Chúng tôi sẽ phản hồi qua email trong 24h!",
            "inquiry_id": cursor.lastrowid,
        }
