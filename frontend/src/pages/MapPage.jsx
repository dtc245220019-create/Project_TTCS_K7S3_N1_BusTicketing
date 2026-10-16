import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getMapOverview } from '../api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ROUTE_IMAGES = {
  1: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
  2: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=600&auto=format&fit=crop&q=80',
  3: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=600&auto=format&fit=crop&q=80',
  4: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=600&auto=format&fit=crop&q=80',
};

function MapPage() {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  const [mapData, setMapData] = useState({ routes: [], buses: [] });
  const [selectedRouteId, setSelectedRouteId] = useState(1);
  const [selectedStop, setSelectedStop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMapOverview()
      .then((data) => {
        setMapData(data);
        if (data.routes && data.routes.length > 0) {
          setSelectedRouteId(data.routes[0].id);
        }
      })
      .catch((err) => console.error('Lỗi tải dữ liệu bản đồ:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([16.0, 107.5], 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup || !mapData.routes.length) return;

    layerGroup.clearLayers();

    const currentRoute = mapData.routes.find((r) => r.id === Number(selectedRouteId));
    if (!currentRoute || !currentRoute.stops || currentRoute.stops.length === 0) return;

    const stopCoords = [];

    const createStopIcon = (order, isFirst, isLast) => {
      const color = isFirst ? '#16a34a' : isLast ? '#dc2626' : '#2563eb';
      return L.divIcon({
        className: 'custom-stop-marker',
        html: `<div style="background-color:${color};color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;border:2.5px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.35);">${order}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
    };

    const busIcon = L.divIcon({
      className: 'custom-bus-marker',
      html: `<div style="background:#dc2626;color:white;padding:5px 10px;border-radius:14px;font-size:12px;font-weight:800;display:flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(220,38,38,0.4);border:2px solid white;">🚌 Xe Đang Chạy</div>`,
      iconSize: [120, 32],
      iconAnchor: [60, 16],
    });

    currentRoute.stops.forEach((stop, index) => {
      const latLng = [stop.latitude, stop.longitude];
      stopCoords.push(latLng);

      const isFirst = index === 0;
      const isLast = index === currentRoute.stops.length - 1;
      const marker = L.marker(latLng, { icon: createStopIcon(stop.stop_order, isFirst, isLast) });

      marker.bindPopup(`
        <div style="font-family:sans-serif;padding:6px;min-width:180px;">
          <div style="font-size:11px;font-weight:bold;color:#2563eb;text-transform:uppercase;">Trạm số ${stop.stop_order}</div>
          <h4 style="margin:2px 0 6px 0;color:#0f172a;font-size:14px;font-weight:bold;">${stop.name}</h4>
          <p style="margin:0 0 4px 0;font-size:12px;color:#64748b;">📍 ${stop.address}</p>
          <p style="margin:0;font-size:12px;color:#16a34a;font-weight:bold;">📏 Cách điểm đầu: ${stop.distance_km} km</p>
        </div>
      `);
      marker.on('click', () => setSelectedStop(stop));
      layerGroup.addLayer(marker);
    });

    if (stopCoords.length > 1) {
      const polyline = L.polyline(stopCoords, {
        color: '#2563eb',
        weight: 6,
        opacity: 0.85,
        dashArray: '10, 8',
      });
      layerGroup.addLayer(polyline);
      map.fitBounds(polyline.getBounds(), { padding: [60, 60] });
    }

    if (mapData.buses && mapData.buses.length > 0) {
      const activeBus = mapData.buses[0];
      const midPoint = stopCoords[Math.floor(stopCoords.length / 2)] || [11.2045, 107.3621];
      const busMarker = L.marker(midPoint, { icon: busIcon });
      busMarker.bindPopup(`
        <div style="font-family:sans-serif;padding:6px;">
          <h4 style="margin:0 0 4px 0;color:#dc2626;font-size:14px;font-weight:bold;">Xe Khách: ${activeBus.license_plate}</h4>
          <p style="margin:0 0 4px 0;font-size:12px;color:#334155;">Loại xe: ${activeBus.bus_type}</p>
          <p style="margin:0;font-size:12px;color:#16a34a;font-weight:bold;">🟢 Vận tốc GPS: 65 km/h • Đang lưu thông an toàn</p>
        </div>
      `);
      layerGroup.addLayer(busMarker);
    }
  }, [selectedRouteId, mapData]);

  const currentRoute = mapData.routes.find((r) => r.id === Number(selectedRouteId));
  const currentRouteImg = ROUTE_IMAGES[selectedRouteId] || ROUTE_IMAGES[1];

  const handleBookThisRoute = () => {
    if (currentRoute) {
      navigate(`/buses?origin=${encodeURIComponent(currentRoute.departure_city)}&destination=${encodeURIComponent(currentRoute.arrival_city)}`);
    } else {
      navigate('/buses');
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
          backgroundColor: 'white',
          padding: '20px 28px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 14px rgba(15,23,42,0.04)',
        }}
      >
        <div>
          <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '12px' }}>
            HỆ THỐNG ĐỊNH VỊ GPS
          </span>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '6px 0 2px 0' }}>
            🗺️ Bản Đồ Lộ Trình & Toàn Bộ Trạm Dừng Xe Buýt
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
            Theo dõi danh sách các chặng đón/trả khách, cự ly km và vị trí xe buýt thời gian thực.
          </p>
        </div>

        {/* Route selector dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: '700', color: '#334155', fontSize: '14px' }}>Tuyến Xe:</label>
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(Number(e.target.value))}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              fontWeight: '700',
              color: '#1e3a8a',
              cursor: 'pointer',
              outline: 'none',
              fontSize: '14px',
            }}
          >
            {mapData.routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name} ({route.distance_km} km)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid: Map on Left + Itinerary & Photo on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 370px', gap: '24px', minHeight: '620px' }}>
        {/* Map Container */}
        <div
          ref={mapContainerRef}
          style={{
            height: '100%',
            minHeight: '620px',
            borderRadius: '18px',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
            border: '1px solid #cbd5e1',
            zIndex: 1,
          }}
        />

        {/* Itinerary Panel */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '18px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(15,23,42,0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Scenic Destination Photo */}
          <div style={{ position: 'relative', height: '160px', overflow: 'hidden' }}>
            <img
              src={currentRouteImg}
              alt="Điểm đến tuyến xe"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '12px 16px',
                background: 'linear-gradient(to top, rgba(15,23,42,0.9) 0%, transparent 100%)',
                color: 'white',
              }}
            >
              <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '800', color: '#38bdf8' }}>
                Hành Trình Đến
              </div>
              <div style={{ fontSize: '17px', fontWeight: '800' }}>
                {currentRoute?.arrival_city || 'Điểm Đến'}
              </div>
            </div>
          </div>

          <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {currentRoute ? (
              <>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                    {currentRoute.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                    Tổng cự ly: <b>{currentRoute.distance_km} km</b> • Giá cơ bản: <b>{currentRoute.base_price?.toLocaleString('vi-VN')} VNĐ</b>
                  </div>
                </div>

                <div style={{ fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>
                  Các Chặng Dừng ({currentRoute.stops?.length || 0} Trạm):
                </div>

                {/* Timeline */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', maxHeight: '250px' }}>
                  <div style={{ position: 'relative', paddingLeft: '24px' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '11px',
                        top: '12px',
                        bottom: '12px',
                        width: '2px',
                        backgroundColor: '#cbd5e1',
                      }}
                    />

                    {currentRoute.stops?.map((stop, index) => (
                      <div
                        key={stop.id}
                        onClick={() => setSelectedStop(stop)}
                        style={{
                          position: 'relative',
                          marginBottom: '14px',
                          cursor: 'pointer',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          backgroundColor: selectedStop?.id === stop.id ? '#eff6ff' : 'transparent',
                          border: selectedStop?.id === stop.id ? '1px solid #bfdbfe' : '1px solid transparent',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: '-20px',
                            top: '10px',
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            backgroundColor: index === 0 ? '#16a34a' : index === currentRoute.stops.length - 1 ? '#dc2626' : '#2563eb',
                            border: '2px solid white',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          }}
                        />
                        <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>
                          Trạm {stop.stop_order}: {stop.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{stop.address}</div>
                        <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '700', marginTop: '2px' }}>
                          +{stop.distance_km} km
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action button */}
                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={handleBookThisRoute}
                    style={{
                      width: '100%',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.2)',
                      fontWeight: '800',
                      padding: '12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                      transition: 'all 0.15s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                  >
                    🚌 Đặt Vé Tuyến Này Ngay ➔
                  </button>
                </div>
              </>
            ) : (
              <p style={{ color: '#64748b' }}>Đang nạp dữ liệu tuyến xe...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapPage;
