import { useState } from 'react';

const DEMO_TICKETS = {
  'TKT-8892': {
    ticketCode: 'TKT-8892',
    passenger: 'Nguyễn Văn A',
    phone: '0988 123 456',
    route: 'Hà Nội → Thái Nguyên',
    seat: 'A05',
    departure: '08:30 - 02/10/2026',
    bus: 'SmartBus 01',
    price: 80000,
    status: 'VALID',
  },

  'TICKET-001': {
    ticketCode: 'TICKET-001',
    passenger: 'Trần Thị B',
    phone: '0977 555 666',
    route: 'Thái Nguyên → Hà Nội',
    seat: 'B08',
    departure: '14:00 - 03/10/2026',
    bus: 'SmartBus 02',
    price: 90000,
    status: 'VALID',
  },

  'TICKET-002': {
    ticketCode: 'TICKET-002',
    passenger: 'Lê Văn C',
    phone: '0966 222 333',
    route: 'Hà Nội → Thái Nguyên',
    seat: 'C03',
    departure: '10:00 - 04/10/2026',
    bus: 'SmartBus 03',
    price: 85000,
    status: 'UNPAID',
  },

  'CANCEL-001': {
    ticketCode: 'CANCEL-001',
    passenger: 'Phạm Thị D',
    phone: '0955 444 555',
    route: 'Hà Nội → Thái Nguyên',
    seat: 'A10',
    departure: '16:00 - 05/10/2026',
    bus: 'SmartBus 04',
    price: 80000,
    status: 'CANCELLED',
  },
};

function TicketVerification() {
  const [inputCode, setInputCode] = useState('');
  const [result, setResult] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);

  const verifyDemoTicket = (rawCode) => {
    const code = rawCode.trim().toUpperCase();

    if (!code) {
      setResult({
        status: 'EMPTY',
        message: 'Vui lòng nhập mã vé.',
      });
      return;
    }

    const ticket = DEMO_TICKETS[code];

    let newResult;

    if (!ticket) {
      newResult = {
        status: 'INVALID',
        ticketCode: code,
        message: 'Mã vé không tồn tại trong hệ thống.',
      };
    } else if (ticket.status === 'UNPAID') {
      newResult = {
        status: 'UNPAID',
        ticket,
        message: 'Vé chưa được thanh toán, không được phép lên xe.',
      };
    } else if (ticket.status === 'CANCELLED') {
      newResult = {
        status: 'CANCELLED',
        ticket,
        message: 'Vé này đã bị hủy và không còn hiệu lực.',
      };
    } else {
      newResult = {
        status: 'VALID',
        ticket,
        message: 'Vé hợp lệ! Được phép lên xe.',
      };
    }

    setResult(newResult);

    setRecentLogs((prev) => [
      {
        id: Date.now(),
        ticketCode: code,
        result: newResult.status,
        time: new Date().toLocaleTimeString('vi-VN'),
      },
      ...prev,
    ]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    verifyDemoTicket(inputCode);
  };

  const handleQuickTest = (code) => {
    setInputCode(code);
    verifyDemoTicket(code);
  };

  const handleScanQR = () => {
    // Mô phỏng thao tác quét QR ở frontend
    setInputCode('TKT-8892');
    verifyDemoTicket('TKT-8892');
  };

  const getResultTitle = () => {
    switch (result?.status) {
      case 'VALID':
        return 'VÉ HỢP LỆ - CHO PHÉP LÊN XE';
      case 'UNPAID':
        return 'VÉ CHƯA THANH TOÁN';
      case 'CANCELLED':
        return 'VÉ ĐÃ BỊ HỦY';
      case 'INVALID':
        return 'VÉ KHÔNG TỒN TẠI';
      default:
        return 'THÔNG BÁO';
    }
  };

  const getResultIcon = () => {
    switch (result?.status) {
      case 'VALID':
        return '✅';
      case 'UNPAID':
        return '⚠️';
      case 'CANCELLED':
      case 'INVALID':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getResultColor = () => {
    switch (result?.status) {
      case 'VALID':
        return {
          bg: '#f0fdf4',
          border: '#22c55e',
          title: '#166534',
        };
      case 'UNPAID':
        return {
          bg: '#fffbeb',
          border: '#f59e0b',
          title: '#92400e',
        };
      default:
        return {
          bg: '#fef2f2',
          border: '#ef4444',
          title: '#991b1b',
        };
    }
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        background: '#f8fafc',
        padding: '30px 20px 50px',
      }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <span
            style={{
              display: 'inline-block',
              background: '#eff6ff',
              color: '#1d4ed8',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '700',
            }}
          >
            GIAO DIỆN TÀI XẾ & PHỤ XE • US29
          </span>

          <h1
            style={{
              color: '#1e3a8a',
              fontSize: '28px',
              margin: '12px 0 6px',
            }}
          >
            🛡️ Soát Vé QR Điện Tử
          </h1>

          <p style={{ color: '#64748b', margin: 0 }}>
            Quét mã QR hoặc nhập mã vé để kiểm tra trạng thái vé.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.15fr) minmax(300px, 0.85fr)',
            gap: '24px',
          }}
        >

          {/* CỘT TRÁI */}
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 5px 18px rgba(15,23,42,0.06)',
            }}
          >

            {/* QR AREA */}
            <div
              style={{
                border: '2px dashed #93c5fd',
                borderRadius: '14px',
                padding: '24px',
                textAlign: 'center',
                background: '#eff6ff',
              }}
            >
              <div
                style={{
                  fontSize: '60px',
                  marginBottom: '8px',
                }}
              >
                📷
              </div>

              <h3
                style={{
                  margin: '5px 0',
                  color: '#1e3a8a',
                }}
              >
                Quét mã QR vé
              </h3>

              <p
                style={{
                  color: '#64748b',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
              >
                Đưa mã QR trên vé điện tử vào khu vực quét.
              </p>

              <button
                type="button"
                onClick={handleScanQR}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '11px 22px',
                  borderRadius: '9px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                📷 Quét QR
              </button>

              <div
                style={{
                  marginTop: '10px',
                  fontSize: '12px',
                  color: '#64748b',
                }}
              >
                * Demo frontend: quét thử TKT-8892
              </div>
            </div>

            {/* NHẬP MÃ */}
            <div style={{ marginTop: '22px' }}>
              <label
                style={{
                  display: 'block',
                  fontWeight: '700',
                  color: '#334155',
                  marginBottom: '8px',
                }}
              >
                Hoặc nhập mã vé
              </label>

              <form
                onSubmit={handleSubmit}
                style={{
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <input
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="Ví dụ: TKT-8892"
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    border: '2px solid #cbd5e1',
                    borderRadius: '9px',
                    fontFamily: 'monospace',
                    fontWeight: '700',
                    fontSize: '15px',
                    textTransform: 'uppercase',
                  }}
                />

                <button
                  type="submit"
                  style={{
                    background: '#1d4ed8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '9px',
                    padding: '0 20px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Xác thực
                </button>
              </form>
            </div>

            {/* TEST DATA */}
            <div
              style={{
                marginTop: '20px',
                padding: '14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#64748b',
                  marginBottom: '10px',
                }}
              >
                🧪 DỮ LIỆU TEST
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <button
                  onClick={() => handleQuickTest('TKT-8892')}
                  style={{
                    border: '1px solid #86efac',
                    background: '#dcfce7',
                    color: '#166534',
                    padding: '7px 10px',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  🟢 TKT-8892
                </button>

                <button
                  onClick={() => handleQuickTest('TICKET-001')}
                  style={{
                    border: '1px solid #93c5fd',
                    background: '#dbeafe',
                    color: '#1d4ed8',
                    padding: '7px 10px',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  🔵 TICKET-001
                </button>

                <button
                  onClick={() => handleQuickTest('TICKET-002')}
                  style={{
                    border: '1px solid #fcd34d',
                    background: '#fef3c7',
                    color: '#92400e',
                    padding: '7px 10px',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  🟡 TICKET-002
                </button>

                <button
                  onClick={() => handleQuickTest('CANCEL-001')}
                  style={{
                    border: '1px solid #fca5a5',
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: '7px 10px',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  🔴 CANCEL-001
                </button>

                <button
                  onClick={() => handleQuickTest('INVALID-999')}
                  style={{
                    border: '1px solid #fca5a5',
                    background: '#fff1f2',
                    color: '#be123c',
                    padding: '7px 10px',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  ❌ INVALID-999
                </button>
              </div>
            </div>

            {/* RESULT */}
            {result && (
              <div
                style={{
                  marginTop: '20px',
                  padding: '20px',
                  borderRadius: '12px',
                  background: getResultColor().bg,
                  border: `2px solid ${getResultColor().border}`,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '42px' }}>
                  {getResultIcon()}
                </div>

                <h2
                  style={{
                    color: getResultColor().title,
                    fontSize: '20px',
                    margin: '8px 0',
                  }}
                >
                  {getResultTitle()}
                </h2>

                <p
                  style={{
                    color: '#475569',
                    margin: 0,
                  }}
                >
                  {result.message}
                </p>

                {result.ticket && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '15px',
                      background: '#fff',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      textAlign: 'left',
                      lineHeight: '1.8',
                    }}
                  >
                    <div>
                      👤 <b>Hành khách:</b> {result.ticket.passenger}
                    </div>

                    <div>
                      📞 <b>SĐT:</b> {result.ticket.phone}
                    </div>

                    <div>
                      🚌 <b>Tuyến:</b> {result.ticket.route}
                    </div>

                    <div>
                      💺 <b>Số ghế:</b>{' '}
                      <span
                        style={{
                          color: '#2563eb',
                          fontWeight: '700',
                        }}
                      >
                        {result.ticket.seat}
                      </span>
                    </div>

                    <div>
                      🕒 <b>Khởi hành:</b> {result.ticket.departure}
                    </div>

                    <div>
                      🚍 <b>Xe:</b> {result.ticket.bus}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CỘT PHẢI */}
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 5px 18px rgba(15,23,42,0.06)',
            }}
          >
            <h3
              style={{
                margin: '0 0 18px',
                color: '#1e3a8a',
              }}
            >
              📜 Lịch sử soát vé
            </h3>

            {recentLogs.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '50px 10px',
                  color: '#94a3b8',
                }}
              >
                Chưa có lượt soát vé.
                <br />
                <span style={{ fontSize: '12px' }}>
                  Hãy thử một mã vé ở bên trái.
                </span>
              </div>
            ) : (
              <div>
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '13px 0',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <b
                        style={{
                          fontFamily: 'monospace',
                        }}
                      >
                        {log.ticketCode}
                      </b>

                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 7px',
                          borderRadius: '5px',
                          background:
                            log.result === 'VALID'
                              ? '#dcfce7'
                              : log.result === 'UNPAID'
                              ? '#fef3c7'
                              : '#fee2e2',
                          color:
                            log.result === 'VALID'
                              ? '#166534'
                              : log.result === 'UNPAID'
                              ? '#92400e'
                              : '#991b1b',
                        }}
                      >
                        {log.result}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: '5px',
                        fontSize: '12px',
                        color: '#94a3b8',
                      }}
                    >
                      {log.time}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TicketVerification;