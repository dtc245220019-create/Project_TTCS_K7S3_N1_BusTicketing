import React, { useState } from 'react';

export default function TicketVerification() {
  const [inputCode, setInputCode] = useState('');
  const [result, setResult] = useState(null);

  const handleVerify = (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    if (inputCode.toUpperCase() === 'TKT-8892') {
      setResult({
        status: 'SUCCESS',
        message: 'Vé Hợp Lệ! Cho phép lên xe.',
        details: { customer: 'Nguyễn Văn A', route: 'Hà Nội - Thái Nguyên', seat: 'A12' }
      });
    } else {
      setResult({
        status: 'ERROR',
        message: 'Mã vé không tồn tại hoặc đã được sử dụng!'
      });
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white rounded-xl shadow-lg border">
      <h1 className="text-xl font-bold text-center text-blue-900 mb-4">Màn Hình Soát Vé (Tài Xế)</h1>
      
      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nhập / Quét mã vé QR:</label>
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Ví dụ: TKT-8892"
            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center font-mono font-bold"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition"
        >
          Xác Thực Vé
        </button>
      </form>

      {result && (
        <div className={`mt-6 p-4 rounded-lg text-center ${result.status === 'SUCCESS' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <h2 className={`font-bold text-lg ${result.status === 'SUCCESS' ? 'text-green-700' : 'text-red-700'}`}>
            {result.message}
          </h2>
          {result.details && (
            <div className="mt-3 text-sm text-gray-700 text-left bg-white p-3 rounded border">
              <p>👤 <b>Hành khách:</b> {result.details.customer}</p>
              <p>🚌 <b>Tuyến:</b> {result.details.route}</p>
              <p>💺 <b>Số ghế:</b> {result.details.seat}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}