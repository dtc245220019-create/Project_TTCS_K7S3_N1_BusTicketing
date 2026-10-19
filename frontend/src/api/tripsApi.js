import { fetchJson } from './client.js';

/**
 * 2. Chuyến xe, Tuyến đường & Sơ đồ ghế (Trips & Routes API)
 */
export function getTrips(params = {}) {
  const query = new URLSearchParams();
  if (params.origin) query.append('origin', params.origin);
  if (params.destination) query.append('destination', params.destination);
  if (params.date) query.append('date', params.date);
  return fetchJson(`/api/v1/trips?${query.toString()}`);
}

export function getTripDetail(tripId) {
  return fetchJson(`/api/v1/trips/${tripId}`);
}

export function getTripSeats(tripId) {
  return fetchJson(`/api/v1/trips/${tripId}/seats`);
}

export function holdSeats(tripId, seatIds, userId = 1) {
  return fetchJson(`/api/v1/trips/${tripId}/hold-seats`, {
    method: 'POST',
    body: JSON.stringify({ seat_ids: seatIds, user_id: userId }),
  });
}

export function getRoutes() {
  return fetchJson('/api/v1/routes');
}

export function getRouteStops(routeId) {
  return fetchJson(`/api/v1/routes/${routeId}/stops`);
}

export function getMapOverview() {
  return fetchJson('/api/v1/map/overview');
}
