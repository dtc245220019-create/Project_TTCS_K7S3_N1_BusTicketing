import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getMapOverview } from '../api';

// Fix Leaflet default marker icons issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapPage() {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  const [mapData, setMapData] = useState({ routes: [], buses: [] });
  const [selectedRouteId, setSelectedRouteId] = useState(1);
  const [selectedStop, setSelectedStop] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch map data
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

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([16.0, 107.5], 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Cleanup on unmount if needed
    };
  }, []);

  // Update route markers, polylines, and bus positions when selected route changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup || !mapData.routes.length) return;

    layerGroup.clearLayers();

    const currentRoute = mapData.routes.find((r) => r.id === Number(selectedRouteId));
    if (!currentRoute || !currentRoute.stops || currentRoute.stops.length === 0) return;

    const stopCoords = [];

    // Custom Stop Icon
    const createStopIcon = (order) =>
      L.divIcon({
        className: 'custom-stop-marker',
        html: `<div style="background-color:#2563eb;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${order}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

    // Custom Bus Icon
    const busIcon = L.divIcon({
      className: 'custom-bus-marker',
      html: `<div style="background-color:#dc2626;color:white;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;display:flex;align-items:center;gap:4px;box-shadow:0 2px 8px rgba(0,0,0,0.4);border:2px solid white;">🚌 Xe đang chạy</div>`,
      iconSize: [110, 30],
      iconAnchor: [55, 15],
    });

    // Add Bus Stops to Map
    currentRoute.stops.forEach((stop) => {
      const latLng = [stop.latitude, stop.longitude];
      stopCoords.push(latLng);

      const marker = L.marker(latLng, { icon: createStopIcon(stop.stop_order) });
      marker.bindPopup(`
        <div style="font-family:sans-serif;padding:4px;">
          <h4 style="margin:0 0 4px 0;color:#1e3a8a;font-size:14px;">Trạm ${stop.stop_order}: ${stop.name}</h4>
          <p style="margin:0 0 4px 0;font-size:12px;color:#4b5563;">📍 <b>Địa chỉ:</b> ${stop.address}</p>
          <p style="margin:0;font-size:12px;color:#2563eb;">📏 <b>Khoảng cách chặng:</b> ${stop.distance_km} km</p>
        </div>
      `);
      marker.on('click', () => setSelectedStop(stop));
      layerGroup.addLayer(marker);
    });

    // Draw route path line
    if (stopCoords.length > 1) {
      const polyline = L.polyline(stopCoords, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.8,
        dashArray: '10, 6',
      });
      layerGroup.addLayer(polyline);
      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }

    // Add buses associated with this route or general active buses
    if (mapData.buses && mapData.buses.length > 0) {
      // Find a bus running near the route or show sample active bus
      const activeBus = mapData.buses[0];
      if (activeBus && activeBus.current_lat && activeBus.current_lng) {
        // Place bus along the route or near midpoint
        const midPoint = stopCoords[Math.floor(stopCoords.length / 2)] || [activeBus.current_lat, activeBus.current_lng];
        const busMarker = L.marker(midPoint, { icon: busIcon });
        busMarker.bindPopup(`
          <div style="font-family:sans-serif;padding:4px;">
            <h4 style="margin:0 0 4px 0;color:#dc2626;">Xe khách: ${activeBus.license_plate}</h4>
            <p style="margin:0;font-size:12px;">Loại xe: ${activeBus.bus_type}</p>
            <p style="margin:0;font-size:12px;color:green;">🟢 Trạng thái: Đang vận hành an toàn</p>
          </div>
        `);
        layerGroup.addLayer(busMarker);
      }
    }
  }, [selectedRouteId, mapData]);

  const currentRoute = mapData.routes.find((r) => r.id === Number(selectedRouteId));

  const handleBookThisRoute = () => {
    if (currentRoute) {
      navigate(`/buses?origin=${encodeURIComponent(currentRoute.departure_city)}&destination=${encodeURIComponent(currentRoute.arrival_city)}`);
    } else {
      navigate('/buses');
    }
  };

  return (
    <div className="map-page-wrapper" style={{ padding: '24px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>
            🗺️ Bản Đồ Lộ Trình & Trạm Dừng Xe Buýt Thông Minh
          </h1>
          <p style={{ color: '#4b5563', margin: '4px 0 0 0', fontSize: '14px' }}>
            Xem các chặng dừng (TRAM_DUNG), tọa độ GPS, cự ly km và vị trí xe chạy trực quan trên bản đồ.
          </p>
        </div>

        {/* Route selector dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>Chọn Tuyến Xe:</label>
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(Number(e.target.value))}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: 'white',
              fontWeight: '600',
              color: '#1e3a8a',
              cursor: 'pointer',
              outline: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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

      {/* Grid: Map on Left (70%) + Stops Itinerary on Right (30%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', minHeight: '560px' }}>
        {/* Map Container */}
        <div
          ref={mapContainerRef}
          style={{
            height: '100%',
            minHeight: '560px',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0',
            zIndex: 1,
          }}
        />

        {/* Itinerary Panel */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {currentRoute ? (
            <>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '16px' }}>
                <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px' }}>
                  {currentRoute.departure_city} ➔ {currentRoute.arrival_city}
                </span>
                <h3 style={{ margin: '8px 0 4px 0', fontSize: '18px', color: '#1e293b' }}>{currentRoute.name}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Tổng cự ly: <b>{currentRoute.distance_km} km</b> • Giá cơ bản: <b>{currentRoute.base_price?.toLocaleString('vi-VN')} VNĐ</b>
                </p>
              </div>

              {/* Stop Timeline */}
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '12px', textTransform: 'uppercase' }}>
                Danh Sách Các Chặng Dừng ({currentRoute.stops?.length || 0} trạm):
              </h4>

              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                <div style={{ position: 'relative', paddingLeft: '24px' }}>
                  {/* Vertical line connecting timeline */}
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
                        marginBottom: '16px',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: selectedStop?.id === stop.id ? '#eff6ff' : 'transparent',
                        border: selectedStop?.id === stop.id ? '1px solid #bfdbfe' : '1px solid transparent',
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* Marker dot on line */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '-20px',
                          top: '14px',
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          backgroundColor: index === 0 ? '#16a34a' : index === currentRoute.stops.length - 1 ? '#dc2626' : '#2563eb',
                          border: '2px solid white',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        }}
                      />
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>
                        Trạm {stop.stop_order}: {stop.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{stop.address}</div>
                      <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600', marginTop: '4px' }}>
                        Cách điểm đầu: +{stop.distance_km} km
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Book ticket CTA */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  onClick={handleBookThisRoute}
                  style={{
                    width: '100%',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    fontWeight: 'bold',
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    boxShadow: '0 4px 10px rgba(37,99,235,0.3)',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={(e) => (e.target.style.backgroundColor = '#1d4ed8')}
                  onMouseOut={(e) => (e.target.style.backgroundColor = '#2563eb')}
                >
                  🚌 Tìm & Đặt Vé Tuyến Này Ngay
                </button>
              </div>
            </>
          ) : (
            <p style={{ color: '#64748b' }}>Đang tải dữ liệu tuyến xe...</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapPage;
