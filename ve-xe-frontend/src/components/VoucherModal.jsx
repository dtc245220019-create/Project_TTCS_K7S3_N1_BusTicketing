import React from 'react';

function VoucherModal({ isOpen, onClose, onSelect, vouchers = [] }) {
  // Nếu state isOpen = false thì không hiển thị gì cả
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
      }}
      onClick={onClose} // Click ra ngoài để đóng modal
    >
      {/* Khung Modal */}
      <div 
        style={{
          backgroundColor: 'white',
          width: '90%',
          maxWidth: '450px',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh'
        }}
        onClick={(e) => e.stopPropagation()} // Ngăn chặn sự kiện click lan ra ngoài
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e3a8a' }}>
            🎟️ Chọn Mã Ưu Đãi
          </h3>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}
          >
            &times;
          </button>
        </div>

        {/* Danh sách Voucher */}
        <div style={{ overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {vouchers.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '20px 0' }}>Bạn chưa có mã ưu đãi nào.</p>
          ) : (
            vouchers.map((voucher) => (
              <div 
                key={voucher.id} 
                style={{
                  border: '1px solid #bfdbfe',
                  backgroundColor: '#eff6ff',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 'bold', color: '#1d4ed8', textTransform: 'uppercase' }}>
                    {voucher.id}
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                    {voucher.title}
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#dc2626', fontWeight: '600' }}>
                    *Đơn tối thiểu: {voucher.minOrder.toLocaleString('vi-VN')}đ
                  </p>
                </div>
                <button
                  onClick={() => onSelect(voucher.id)}
                  style={{
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                    marginLeft: '12px'
                  }}
                >
                  Dùng ngay
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default VoucherModal;