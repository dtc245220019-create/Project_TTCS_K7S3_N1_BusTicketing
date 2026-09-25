// ==========================================
// SCAN PAGE - Frontend 3 (US15)
// Quét QR bằng webcam + nhập tay
// ==========================================

// ---------- MOCK DATA (giống ticket.js + cancel.js) ----------
const MOCK_TICKETS = [
    {
        ticket_id: 1,
        ticket_code: "TKT-2026-0001-XYZ",
        route_name: "Hà Nội - Thái Nguyên",
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
        route_name: "Hà Nội - Hải Phòng",
        departure_time: "2026-10-05T14:30:00",
        arrival_time: "2026-10-05T16:45:00",
        seat_numbers: ["B5"],
        price: 150000,
        status: "PENDING",
        qr_payload: "SMARTBUS|TKT-2026-0002-ABC|HN-HP|05-10-2026-14:30|B5"
    }
];

// ---------- DOM ----------
const btnStartCamera = document.getElementById("btn-start-camera");
const btnStopCamera = document.getElementById("btn-stop-camera");
const cameraPlaceholder = document.getElementById("camera-placeholder");
const manualForm = document.getElementById("manual-form");
const manualCode = document.getElementById("manual-code");
const scanResult = document.getElementById("scan-result");

let html5QrCode = null;
let isScanning = false;

// ==========================================
// CAMERA
// ==========================================

btnStartCamera.addEventListener("click", startCamera);
btnStopCamera.addEventListener("click", stopCamera);

async function startCamera() {
    try {
        html5QrCode = new Html5Qrcode("qr-reader");

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };

        await html5QrCode.start(
            { facingMode: "environment" },  // Camera sau (nếu có)
            config,
            onScanSuccess,
            onScanError  // Bỏ qua lỗi liên tục khi chưa quét được
        );

        // Đổi UI
        isScanning = true;
        cameraPlaceholder.style.display = "none";
        btnStartCamera.style.display = "none";
        btnStopCamera.style.display = "inline-block";

    } catch (err) {
        console.error("Lỗi bật camera:", err);
        alert(
            "Không thể bật camera.\n\n" +
            "Nguyên nhân có thể:\n" +
            "- Trình duyệt chưa được cấp quyền camera\n" +
            "- Không có webcam\n" +
            "- Trang không chạy trên http://localhost hoặc https://\n\n" +
            "Bạn có thể dùng ô 'Nhập mã vé thủ công' ở dưới."
        );
    }
}

async function stopCamera() {
    if (html5QrCode && isScanning) {
        try {
            await html5QrCode.stop();
            html5QrCode.clear();
        } catch (err) {
            console.error("Lỗi tắt camera:", err);
        }
        isScanning = false;
        html5QrCode = null;

        // Đổi UI
        cameraPlaceholder.style.display = "flex";
        btnStartCamera.style.display = "inline-block";
        btnStopCamera.style.display = "none";
    }
}

// ---------- XỬ LÝ KHI QUÉT ĐƯỢC QR ----------
function onScanSuccess(decodedText) {
    console.log("Quét được QR:", decodedText);

    // Rung (nếu thiết bị hỗ trợ)
    if (navigator.vibrate) navigator.vibrate(200);

    // Tạm dừng quét để tránh quét liên tục
    if (html5QrCode && isScanning) {
        html5QrCode.pause(true);
    }

    // Xử lý kết quả
    checkTicket(decodedText);

    // Sau 2 giây, cho quét tiếp
    setTimeout(() => {
        if (html5QrCode && isScanning) {
            html5QrCode.resume();
        }
    }, 2500);
}

function onScanError(errorMessage) {
    // Bỏ qua lỗi khi chưa quét được QR (bình thường, không cần log)
}

// ==========================================
// KIỂM TRA VÉ
// ==========================================

manualForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = manualCode.value.trim().toUpperCase();
    if (!code) return;
    checkTicket(code);
});

function checkTicket(decodedText) {
    // Chuỗi QR có dạng: SMARTBUS|TKT-2026-0001-XYZ|HN-TN|...
    // Hoặc user nhập trực tiếp mã vé: TKT-2026-0001-XYZ
    // → Cần trích xuất mã vé

    let ticketCode = decodedText;

    if (decodedText.startsWith("SMARTBUS|")) {
        // Tách chuỗi QR
        const parts = decodedText.split("|");
        ticketCode = parts[1];  // Phần tử thứ 2 là mã vé
    }

    // Tìm vé trong mock data
    // Sau này: gọi API POST /api/v1/tickets/verify { ticket_code }
    const ticket = MOCK_TICKETS.find((t) => t.ticket_code === ticketCode);

    if (!ticket) {
        renderResult({
            valid: false,
            reason: "Mã vé không tồn tại trong hệ thống",
            code: ticketCode
        });
        return;
    }

    if (ticket.status === "CANCELLED") {
        renderResult({
            valid: false,
            reason: "Vé đã bị hủy",
            ticket
        });
        return;
    }

    if (ticket.status === "PENDING") {
        renderResult({
            valid: false,
            reason: "Vé chưa được thanh toán",
            ticket
        });
        return;
    }

    // Hợp lệ
    renderResult({
        valid: true,
        ticket
    });
}

// ==========================================
// HIỂN THỊ KẾT QUẢ
// ==========================================

function renderResult({ valid, reason, ticket, code }) {
    scanResult.style.display = "block";
    scanResult.className = "scan-result " + (valid ? "result-valid" : "result-invalid");

    if (valid) {
        const depTime = new Date(ticket.departure_time).toLocaleString("vi-VN");
        scanResult.innerHTML = `
            <div class="result-header">
                <div class="result-icon">✅</div>
                <div class="result-title">
                    <h3>Vé hợp lệ</h3>
                    <p>Cho phép hành khách lên xe</p>
                </div>
            </div>

            <div class="result-detail-grid">
                <div class="result-detail-item">
                    <span class="result-label">Mã vé</span>
                    <span class="result-value">${ticket.ticket_code}</span>
                </div>
                <div class="result-detail-item">
                    <span class="result-label">Tuyến</span>
                    <span class="result-value">${ticket.route_name}</span>
                </div>
                <div class="result-detail-item">
                    <span class="result-label">Khởi hành</span>
                    <span class="result-value">${depTime}</span>
                </div>
                <div class="result-detail-item">
                    <span class="result-label">Ghế</span>
                    <span class="result-value">${ticket.seat_numbers.join(", ")}</span>
                </div>
                <div class="result-detail-item">
                    <span class="result-label">Tổng tiền</span>
                    <span class="result-value price">${ticket.price.toLocaleString("vi-VN")} VNĐ</span>
                </div>
            </div>
        `;
    } else {
        scanResult.innerHTML = `
            <div class="result-header">
                <div class="result-icon">❌</div>
                <div class="result-title">
                    <h3>Vé không hợp lệ</h3>
                    <p>${reason}</p>
                </div>
            </div>

            <div class="result-detail-grid">
                <div class="result-detail-item">
                    <span class="result-label">Mã đã quét</span>
                    <span class="result-value">${code || (ticket && ticket.ticket_code) || "-"}</span>
                </div>
                ${ticket ? `
                    <div class="result-detail-item">
                        <span class="result-label">Trạng thái</span>
                        <span class="result-value" style="color:#dc2626;">
                            ${ticket.status === "CANCELLED" ? "Đã hủy" : "Chờ thanh toán"}
                        </span>
                    </div>
                ` : ""}
            </div>
        `;
    }

    // Cuộn xuống kết quả
    scanResult.scrollIntoView({ behavior: "smooth" });
}

// ==========================================
// CLEANUP khi đóng trang
// ==========================================
window.addEventListener("beforeunload", () => {
    if (html5QrCode && isScanning) {
        html5QrCode.stop().catch(() => {});
    }
});