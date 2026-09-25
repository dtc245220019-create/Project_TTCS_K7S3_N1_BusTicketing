// ==========================================
// TICKET PAGE - Frontend 3 (US04)
// Hiển thị vé điện tử + QR code
// Hiện tại: mock data. Sau này: gọi API GET /api/v1/tickets?user_id=...
// ==========================================

// ---------- MOCK DATA ----------
// Sau này Backend 3 sẽ trả về mảng tickets qua API
const MOCK_TICKETS = [
    {
        ticket_id: 1,
        ticket_code: "TKT-2026-0001-XYZ",
        booking_id: 1,
        route_name: "Hà Nội - Thái Nguyên",
        departure_city: "Hà Nội",
        arrival_city: "Thái Nguyên",
        departure_time: "2026-09-30T08:00:00",
        arrival_time: "2026-09-30T10:00:00",
        seat_numbers: ["A1", "A2"],
        price: 240000,
        status: "CONFIRMED",
        qr_payload: "SMARTBUS|TKT-2026-0001-XYZ|HN-TN|30-09-2026-08:00|A1,A2"
    },
    {
        ticket_id: 2,
        ticket_code: "TKT-2026-0002-ABC",
        booking_id: 2,
        route_name: "Hà Nội - Hải Phòng",
        departure_city: "Hà Nội",
        arrival_city: "Hải Phòng",
        departure_time: "2026-10-05T14:30:00",
        arrival_time: "2026-10-05T16:45:00",
        seat_numbers: ["B5"],
        price: 150000,
        status: "PENDING",
        qr_payload: "SMARTBUS|TKT-2026-0002-ABC|HN-HP|05-10-2026-14:30|B5"
    }
];

// ---------- RENDER ----------
function renderTickets(tickets) {
    const list = document.getElementById("ticket-list");
    const emptyState = document.getElementById("empty-state");

    if (!tickets || tickets.length === 0) {
        list.innerHTML = "";
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";
    list.innerHTML = "";

    tickets.forEach((t) => {
        const card = document.createElement("div");
        card.className = "ticket-card";
        card.dataset.ticketId = t.ticket_id;

        const depTime = new Date(t.departure_time).toLocaleString("vi-VN", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
        const arrTime = new Date(t.arrival_time).toLocaleString("vi-VN", {
            hour: "2-digit", minute: "2-digit"
        });

        const statusMap = {
            CONFIRMED: { label: "Đã xác nhận", cls: "confirmed" },
            PENDING:   { label: "Chờ thanh toán", cls: "pending" },
            CANCELLED: { label: "Đã hủy", cls: "cancelled" }
        };
        const st = statusMap[t.status] || statusMap.PENDING;

        card.innerHTML = `
            <div class="ticket-info">
                <div class="ticket-header">
                    <div>
                        <div class="ticket-route">${t.route_name}</div>
                        <div class="ticket-code">Mã vé: ${t.ticket_code}</div>
                    </div>
                    <span class="ticket-status ${st.cls}">${st.label}</span>
                </div>

                <div class="ticket-info-grid">
                    <div class="info-item">
                        <span class="info-label">Khởi hành</span>
                        <span class="info-value">${depTime}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Đến (dự kiến)</span>
                        <span class="info-value">${arrTime}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Ghế</span>
                        <span class="info-value">${t.seat_numbers.join(", ")}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Tổng tiền</span>
                        <span class="info-value price">${t.price.toLocaleString("vi-VN")} VNĐ</span>
                    </div>
                </div>

                <div class="ticket-actions">
                    <button class="btn-ticket btn-download" onclick="downloadTicket(${t.ticket_id})">
                        📥 Tải vé
                    </button>
                    <button class="btn-ticket btn-cancel"
                            onclick="cancelTicket(${t.ticket_id})"
                            ${t.status === "CANCELLED" ? "disabled" : ""}>
                        ${t.status === "CANCELLED" ? "✕ Đã hủy" : "🚫 Hủy vé"}
                    </button>
                </div>
            </div>

            <div class="ticket-qr">
                <div class="qr-box">
                    <canvas id="qr-${t.ticket_id}"></canvas>
                </div>
                <p class="qr-hint">
                    Quét mã QR để soát vé<br>
                    <strong>${t.ticket_code}</strong>
                </p>
            </div>
        `;

        list.appendChild(card);

        // Sinh QR code cho canvas vừa tạo
        generateQr(t.ticket_id, t.qr_payload);
    });
}

// ---------- SINH QR ----------
function generateQr(ticketId, payload) {
    const canvas = document.getElementById(`qr-${ticketId}`);
    if (!canvas) return;

    // Lấy container cha (qr-box) để chứa QR mới
    const container = canvas.parentElement;

    // Xóa canvas cũ
    container.innerHTML = "";

    // Thư viện qrcodejs tạo QR (khác với qrcode)
    new QRCode(container, {
        text: payload,
        width: 200,
        height: 200,
        colorDark: "#1e293b",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}
// ---------- TẢI VÉ ----------
function downloadTicket(ticketId) {
    const ticket = MOCK_TICKETS.find((t) => t.ticket_id === ticketId);
    if (!ticket) return;

    // Sau này sẽ gọi API: GET /api/v1/tickets/{id}/download
    // Hiện tại: chỉ thông báo
    alert(`📥 Đang tải vé ${ticket.ticket_code}...\n(Sẽ tải file PDF/PNG ở phiên bản hoàn chỉnh)`);
}

// ---------- HỦY VÉ ----------
function cancelTicket(ticketId) {
    const ticket = MOCK_TICKETS.find((t) => t.ticket_id === ticketId);
    if (!ticket) return;

    const confirmed = confirm(
        `Bạn có chắc muốn hủy vé ${ticket.ticket_code}?\n\n` +
        `Lưu ý: Vé đã hủy không thể khôi phục.`
    );

    if (!confirmed) return;

    // Sau này sẽ gọi API: POST /api/v1/tickets/{id}/cancel
    // Hiện tại: cập nhật mock data và render lại
    ticket.status = "CANCELLED";
    renderTickets(MOCK_TICKETS);

    alert("✅ Đã hủy vé thành công.");
}

// ---------- KHỞI CHẠY ----------
// Sau này thay MOCK_TICKETS bằng fetch API:
// fetch("/api/v1/tickets?user_id=1").then(r => r.json()).then(renderTickets)
renderTickets(MOCK_TICKETS);