// ==========================================
// CANCEL PAGE - Frontend 3 (US05)
// Tra cứu vé + Hủy vé
// Hiện tại: mock data. Sau này: gọi API Backend 3
// ==========================================

// ---------- MOCK DATA (giống ticket.js) ----------
const MOCK_TICKETS = [
    {
        ticket_id: 1,
        ticket_code: "TKT-2026-0001-XYZ",
        route_name: "Hà Nội - Thái Nguyên",
        departure_time: "2026-09-30T08:00:00",
        seat_numbers: ["A1", "A2"],
        price: 240000,
        status: "CONFIRMED"
    },
    {
        ticket_id: 2,
        ticket_code: "TKT-2026-0002-ABC",
        route_name: "Hà Nội - Hải Phòng",
        departure_time: "2026-10-05T14:30:00",
        seat_numbers: ["B5"],
        price: 150000,
        status: "PENDING"
    }
];

// ---------- DOM ----------
const searchForm = document.getElementById("search-ticket-form");
const ticketCodeInput = document.getElementById("ticket-code");
const searchError = document.getElementById("search-error");
const btnSearch = document.getElementById("btn-search");
const ticketResult = document.getElementById("ticket-result");
const successBox = document.getElementById("success-box");
const btnCancelConfirm = document.getElementById("btn-cancel-confirm");
const btnReset = document.getElementById("btn-reset");

let currentTicket = null;

// ---------- XỬ LÝ TRA CỨU ----------
searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    searchError.textContent = "";
    ticketResult.style.display = "none";
    successBox.style.display = "none";

    const code = ticketCodeInput.value.trim().toUpperCase();

    if (!code) {
        searchError.textContent = "Vui lòng nhập mã vé.";
        return;
    }

    // Giả lập gọi API (sau này thay bằng fetch)
    btnSearch.disabled = true;
    btnSearch.textContent = "Đang tra cứu...";

    setTimeout(() => {
        // Tìm vé trong mock data
        // Sau này: gọi API GET /api/v1/tickets/code/{code}
        const ticket = MOCK_TICKETS.find((t) => t.ticket_code === code);

        btnSearch.disabled = false;
        btnSearch.textContent = "🔍 Tra cứu";

        if (!ticket) {
            searchError.textContent = "❌ Không tìm thấy vé với mã này.";
            return;
        }

        if (ticket.status === "CANCELLED") {
            searchError.textContent = "⚠️ Vé này đã bị hủy trước đó.";
            return;
        }

        // Hiển thị kết quả
        currentTicket = ticket;
        renderTicketDetail(ticket);
    }, 500);
});

// ---------- HIỂN THỊ CHI TIẾT VÉ ----------
function renderTicketDetail(ticket) {
    document.getElementById("r-code").textContent = ticket.ticket_code;
    document.getElementById("r-route").textContent = ticket.route_name;

    const depTime = new Date(ticket.departure_time).toLocaleString("vi-VN");
    document.getElementById("r-departure").textContent = depTime;
    document.getElementById("r-seats").textContent = ticket.seat_numbers.join(", ");
    document.getElementById("r-price").textContent =
        ticket.price.toLocaleString("vi-VN") + " VNĐ";

    // Trạng thái
    const statusEl = document.getElementById("r-status");
    if (ticket.status === "CONFIRMED") {
        statusEl.textContent = "Đã xác nhận";
        statusEl.className = "detail-value status-active";
    } else if (ticket.status === "PENDING") {
        statusEl.textContent = "Chờ thanh toán";
        statusEl.className = "detail-value";
        statusEl.style.color = "#f59e0b";
    }

    ticketResult.style.display = "block";
    ticketResult.scrollIntoView({ behavior: "smooth" });
}

// ---------- XỬ LÝ HỦY VÉ ----------
btnCancelConfirm.addEventListener("click", () => {
    if (!currentTicket) return;

    const confirmed = confirm(
        `Bạn có chắc muốn hủy vé ${currentTicket.ticket_code}?\n\n` +
        `Số tiền ${currentTicket.price.toLocaleString("vi-VN")} VNĐ sẽ được hoàn lại.\n` +
        `Hành động này không thể hoàn tác.`
    );

    if (!confirmed) return;

    // Giả lập gọi API hủy vé
    // Sau này: fetch POST /api/v1/tickets/{id}/cancel
    btnCancelConfirm.disabled = true;
    btnCancelConfirm.textContent = "Đang xử lý...";

    setTimeout(() => {
        // Cập nhật status trong mock data
        currentTicket.status = "CANCELLED";

        // Ẩn form kết quả, hiện thông báo thành công
        ticketResult.style.display = "none";
        document.getElementById("success-message").textContent =
            `Vé ${currentTicket.ticket_code} đã được hủy. ` +
            `Số tiền ${currentTicket.price.toLocaleString("vi-VN")} VNĐ sẽ được hoàn trong 3-5 ngày làm việc.`;
        successBox.style.display = "block";
        successBox.scrollIntoView({ behavior: "smooth" });

        // Reset nút
        btnCancelConfirm.disabled = false;
        btnCancelConfirm.textContent = "🚫 Xác nhận hủy vé";
    }, 800);
});

// ---------- NÚT "TRA CỨU VÉ KHÁC" ----------
btnReset.addEventListener("click", () => {
    ticketCodeInput.value = "";
    ticketResult.style.display = "none";
    successBox.style.display = "none";
    searchError.textContent = "";
    currentTicket = null;
    ticketCodeInput.focus();
});

// ---------- KHỞI CHẠY ----------
ticketCodeInput.focus();