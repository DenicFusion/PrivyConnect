/**
 * Nigerian States Coordinates & Coarse Distance Calculator
 * Privacy-first: coordinates are rounded to 2 decimal places (~1.1 km resolution)
 */
import { db, doc, updateDoc } from './firebase';
import { calculateProfileStrength, recalculateProfileStrengthOnServer } from './stats';

export interface CoarseCoords {
  lat: number;
  lng: number;
  state: string;
  city?: string;
  area?: string;
}

export const NIGERIAN_STATE_COORDS: Record<string, { lat: number; lng: number }> = {
  'Abia': { lat: 5.45, lng: 7.52 },
  'Abuja (FCT)': { lat: 9.07, lng: 7.39 },
  'Adamawa': { lat: 9.32, lng: 12.44 },
  'Akwa Ibom': { lat: 5.03, lng: 7.93 },
  'Anambra': { lat: 6.22, lng: 7.07 },
  'Bauchi': { lat: 10.31, lng: 9.84 },
  'Bayelsa': { lat: 4.77, lng: 6.07 },
  'Benue': { lat: 7.73, lng: 8.52 },
  'Borno': { lat: 11.83, lng: 13.15 },
  'Cross River': { lat: 5.87, lng: 8.59 },
  'Delta': { lat: 5.70, lng: 5.93 },
  'Ebonyi': { lat: 6.26, lng: 8.01 },
  'Edo': { lat: 6.33, lng: 5.62 },
  'Ekiti': { lat: 7.63, lng: 5.22 },
  'Enugu': { lat: 6.45, lng: 7.51 },
  'Gombe': { lat: 10.28, lng: 11.17 },
  'Imo': { lat: 5.49, lng: 7.03 },
  'Jigawa': { lat: 12.23, lng: 9.56 },
  'Kaduna': { lat: 10.52, lng: 7.44 },
  'Kano': { lat: 12.00, lng: 8.59 },
  'Katsina': { lat: 12.99, lng: 7.60 },
  'Kebbi': { lat: 12.45, lng: 4.19 },
  'Kogi': { lat: 7.80, lng: 6.74 },
  'Kwara': { lat: 8.50, lng: 4.55 },
  'Lagos': { lat: 6.52, lng: 3.37 },
  'Nasarawa': { lat: 8.54, lng: 8.52 },
  'Niger': { lat: 9.93, lng: 6.55 },
  'Ogun': { lat: 7.15, lng: 3.35 },
  'Ondo': { lat: 7.25, lng: 5.20 },
  'Osun': { lat: 7.78, lng: 4.56 },
  'Oyo': { lat: 7.37, lng: 3.94 },
  'Plateau': { lat: 9.89, lng: 8.89 },
  'Rivers': { lat: 4.81, lng: 7.04 },
  'Sokoto': { lat: 13.06, lng: 5.24 },
  'Taraba': { lat: 8.89, lng: 11.36 },
  'Yobe': { lat: 12.00, lng: 11.50 },
  'Zamfara': { lat: 12.17, lng: 6.66 }
};

export const NIGERIAN_CITY_TO_STATE: Record<string, string> = {
  'port harcourt': 'Rivers',
  'ph': 'Rivers',
  'bonny': 'Rivers',
  'obio-akpor': 'Rivers',
  'benin city': 'Edo',
  'benin': 'Edo',
  'auchi': 'Edo',
  'warri': 'Delta',
  'asaba': 'Delta',
  'sapele': 'Delta',
  'ughelli': 'Delta',
  'enugu': 'Enugu',
  'nsukka': 'Enugu',
  'owerri': 'Imo',
  'orlu': 'Imo',
  'aba': 'Abia',
  'umuahia': 'Abia',
  'onitsha': 'Anambra',
  'awka': 'Anambra',
  'nnewi': 'Anambra',
  'uyo': 'Akwa Ibom',
  'eket': 'Akwa Ibom',
  'calabar': 'Cross River',
  'ibadan': 'Oyo',
  'ogbomosho': 'Oyo',
  'oyo': 'Oyo',
  'abeokuta': 'Ogun',
  'ijebu ode': 'Ogun',
  'sagamu': 'Ogun',
  'ota': 'Ogun',
  'akure': 'Ondo',
  'ondo': 'Ondo',
  'osogbo': 'Osun',
  'ile-ife': 'Osun',
  'ado ekiti': 'Ekiti',
  'ekiti': 'Ekiti',
  'ilorin': 'Kwara',
  'offa': 'Kwara',
  'lokoja': 'Kogi',
  'abuja': 'Abuja (FCT)',
  'garki': 'Abuja (FCT)',
  'wuse': 'Abuja (FCT)',
  'maitama': 'Abuja (FCT)',
  'asokoro': 'Abuja (FCT)',
  'fct': 'Abuja (FCT)',
  'federal capital territory': 'Abuja (FCT)',
  'kaduna': 'Kaduna',
  'zaria': 'Kaduna',
  'kano': 'Kano',
  'jos': 'Plateau',
  'makurdi': 'Benue',
  'gboko': 'Benue',
  'lafia': 'Nasarawa',
  'minna': 'Niger',
  'suleja': 'Niger',
  'bauchi': 'Bauchi',
  'sokoto': 'Sokoto',
  'katsina': 'Katsina',
  'maiduguri': 'Borno',
  'yenagoa': 'Bayelsa',
  'abakaliki': 'Ebonyi',
  'gombe': 'Gombe',
  'jalingo': 'Taraba',
  'damaturu': 'Yobe',
  'dutse': 'Jigawa',
  'birnin kebbi': 'Kebbi',
  'gusau': 'Zamfara',
  'yola': 'Adamawa',
  'jimeta': 'Adamawa',
  'lagos': 'Lagos',
  'ikeja': 'Lagos',
  'lekki': 'Lagos',
  'victoria island': 'Lagos',
  'ikoyi': 'Lagos',
  'surulere': 'Lagos',
  'yaba': 'Lagos',
  'alimosho': 'Lagos'
};

/**
 * Normalize state or city string into one of the 37 official Nigerian states
 */
export function normalizeNigerianState(raw?: string): string {
  if (!raw) return 'Lagos';
  const clean = raw.trim().toLowerCase().replace(/\s*state$/i, '').trim();

  // 1. Direct match with city dictionary
  if (NIGERIAN_CITY_TO_STATE[clean]) {
    return NIGERIAN_CITY_TO_STATE[clean];
  }

  // 2. Direct match with state names
  const directMatch = Object.keys(NIGERIAN_STATE_COORDS).find(
    s => s.toLowerCase() === clean
  );
  if (directMatch) return directMatch;

  // 3. FCT / Abuja variations
  if (clean.includes('abuja') || clean.includes('fct') || clean.includes('federal capital')) {
    return 'Abuja (FCT)';
  }

  // 4. Check if any known city is part of the string
  for (const [city, state] of Object.entries(NIGERIAN_CITY_TO_STATE)) {
    if (clean.includes(city) || city.includes(clean)) {
      return state;
    }
  }

  // 5. Partial match with state names
  const partialMatch = Object.keys(NIGERIAN_STATE_COORDS).find(
    s => s.toLowerCase().includes(clean) || clean.includes(s.toLowerCase())
  );
  if (partialMatch) return partialMatch;

  // Preserve user's actual state/city if non-Nigerian / overseas or custom
  const trimmed = raw.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Get coordinates for a Nigerian state, normalized
 */
export function getStateCoords(stateName?: string): { lat: number; lng: number } {
  if (!stateName) return NIGERIAN_STATE_COORDS['Lagos'];
  const matched = normalizeNigerianState(stateName);
  return NIGERIAN_STATE_COORDS[matched] || NIGERIAN_STATE_COORDS['Lagos'];
}

/**
 * Find the closest Nigerian state given GPS latitude and longitude
 */
export function findClosestNigerianState(lat: number, lng: number): { state: string; distanceKm: number } {
  let closestState = 'Lagos';
  let minDistance = Infinity;

  for (const [state, coords] of Object.entries(NIGERIAN_STATE_COORDS)) {
    const dist = calculateDistanceKm(lat, lng, coords.lat, coords.lng) ?? Infinity;
    if (dist < minDistance) {
      minDistance = dist;
      closestState = state;
    }
  }

  return { state: closestState, distanceKm: minDistance };
}

/**
 * Reverse geocode GPS coordinates to city and state
 */
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<{
  state: string;
  city: string;
  area: string;
}> {
  // 1. Try BigDataCloud client reverse geocoding API
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      let state = data.principalSubdivision || '';
      let city = data.city || data.locality || data.principalSubdivision || '';
      let area = data.locality || '';

      if (state) {
        state = state.replace(/\s*state$/i, '').trim();
        const matchedState = Object.keys(NIGERIAN_STATE_COORDS).find(
          s => s.toLowerCase() === state.toLowerCase() || state.toLowerCase().includes(s.toLowerCase())
        );
        if (matchedState) state = matchedState;
      }

      if (!state) {
        state = findClosestNigerianState(lat, lng).state;
      }
      if (!city) {
        city = state;
      }

      return { state, city, area: area || city };
    }
  } catch (e) {
    // fallback
  }

  // 2. Try OpenStreetMap Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      let state = addr.state || addr.region || '';
      let city = addr.city || addr.town || addr.village || addr.suburb || state;
      let area = addr.suburb || addr.neighbourhood || addr.city_district || city;

      if (state) {
        state = state.replace(/\s*state$/i, '').trim();
        const matchedState = Object.keys(NIGERIAN_STATE_COORDS).find(
          s => s.toLowerCase() === state.toLowerCase() || state.toLowerCase().includes(s.toLowerCase())
        );
        if (matchedState) state = matchedState;
      }

      if (!state) {
        state = findClosestNigerianState(lat, lng).state;
      }

      return { state, city: city || state, area: area || city || state };
    }
  } catch (e) {
    // fallback
  }

  // 3. Fallback to closest state by mathematical distance
  const closest = findClosestNigerianState(lat, lng);
  return {
    state: closest.state,
    city: closest.state,
    area: closest.state
  };
}

/**
 * Get device GPS coordinates using browser navigator.geolocation
 */
export function getDeviceGpsCoords(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return resolve(null);
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lng = Number(pos.coords.longitude.toFixed(4));
        resolve({ lat, lng });
      },
      (err) => {
        console.warn('Device GPS permission/error:', err.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Haversine formula to calculate distance between two coordinates in kilometers
 */
export function calculateDistanceKm(
  lat1?: number | null,
  lng1?: number | null,
  lat2?: number | null,
  lng2?: number | null
): number | null {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  if (lat1 === 0 && lng1 === 0) return null;
  if (lat2 === 0 && lng2 === 0) return null;

  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  return Math.round(dist);
}

/**
 * Format distance into a user-friendly string
 */
export function formatDistance(distKm: number | null): string {
  if (distKm == null || isNaN(distKm)) return '';
  if (distKm <= 1) return '< 1 km away';
  return `${distKm} km away`;
}

/**
 * Fast client-side IP-based location detector
 */
export async function detectLocationFromIp(): Promise<{
  state: string;
  city: string;
  lat: number;
  lng: number;
  isDetected: boolean;
}> {
  // 1. Try ipwho.is (free, HTTPS, very accurate for Nigerian states and regions)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false) {
        const rawState = data.region || data.city || '';
        const normState = normalizeNigerianState(rawState);
        const city = data.city || normState;
        const coords = getStateCoords(normState);
        const lat = data.latitude ? Number(Number(data.latitude).toFixed(4)) : coords.lat;
        const lng = data.longitude ? Number(Number(data.longitude).toFixed(4)) : coords.lng;
        return { state: normState, city, lat, lng, isDetected: true };
      }
    }
  } catch {}

  // 2. Try freeipapi.com
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://freeipapi.com/api/json', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const rawState = data.regionName || data.cityName || '';
      const normState = normalizeNigerianState(rawState);
      const city = data.cityName || normState;
      const coords = getStateCoords(normState);
      const lat = data.latitude ? Number(Number(data.latitude).toFixed(4)) : coords.lat;
      const lng = data.longitude ? Number(Number(data.longitude).toFixed(4)) : coords.lng;
      return { state: normState, city, lat, lng, isDetected: true };
    }
  } catch {}

  // 3. Try ipapi.co
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const rawState = data.region || data.city || '';
      const normState = normalizeNigerianState(rawState);
      const city = data.city || normState;
      const coords = getStateCoords(normState);
      const lat = data.latitude ? Number(Number(data.latitude).toFixed(4)) : coords.lat;
      const lng = data.longitude ? Number(Number(data.longitude).toFixed(4)) : coords.lng;
      return { state: normState, city, lat, lng, isDetected: true };
    }
  } catch {}

  // 4. Fallback to server detection
  const serverLoc = await detectLocationFromServer();
  if (serverLoc.isDetected) {
    const norm = normalizeNigerianState(serverLoc.state);
    return {
      state: norm,
      city: serverLoc.city || norm,
      lat: serverLoc.lat,
      lng: serverLoc.lng,
      isDetected: true
    };
  }

  return { state: 'Lagos', city: 'Lagos', lat: 6.52, lng: 3.37, isDetected: false };
}

/**
 * Server-side IP location detection
 */
export async function detectLocationFromServer(): Promise<{
  state: string;
  city: string;
  lat: number;
  lng: number;
  isDetected: boolean;
}> {
  try {
    const res = await fetch('/api/detect-location');
    if (res.ok) {
      const data = await res.json();
      if (data && data.state && data.isDetected) {
        const norm = normalizeNigerianState(data.state);
        return {
          state: norm,
          city: data.city || norm,
          lat: data.lat || 6.52,
          lng: data.lng || 3.37,
          isDetected: true
        };
      }
    }
  } catch (e) {
    console.warn('Location detection request failed:', e);
  }

  return {
    state: 'Lagos',
    city: 'Lagos',
    lat: 6.52,
    lng: 3.37,
    isDetected: false
  };
}

/**
 * Automatically detect live location from fast IP or GPS and sync user profile in Firestore
 */
export async function syncUserLiveLocation(userId: string, currentProfile?: any, forceGps: boolean = false): Promise<{
  state: string;
  city: string;
  lat: number;
  lng: number;
  updated: boolean;
}> {
  if (!userId) {
    return { state: 'Lagos', city: 'Lagos', lat: 6.52, lng: 3.37, updated: false };
  }

  let finalState = currentProfile?.state ? normalizeNigerianState(currentProfile.state) : 'Lagos';
  let finalCity = currentProfile?.city || finalState;
  let lat = currentProfile?.coarse_lat || getStateCoords(finalState).lat;
  let lng = currentProfile?.coarse_lng || getStateCoords(finalState).lng;
  let isGps = false;

  // If forceGps requested (e.g. user clicked "Detect now"), try GPS first
  if (forceGps) {
    const gps = await getDeviceGpsCoords();
    if (gps && (gps.lat !== 0 || gps.lng !== 0)) {
      lat = gps.lat;
      lng = gps.lng;
      isGps = true;
      const geocoded = await reverseGeocodeCoords(lat, lng);
      finalState = normalizeNigerianState(geocoded.state);
      finalCity = geocoded.city || finalState;
    }
  }

  // Fast automatic IP detection (user's preferred automatic mode on login)
  if (!isGps) {
    const ipRes = await detectLocationFromIp();
    if (ipRes.isDetected) {
      finalState = ipRes.state;
      finalCity = ipRes.city;
      lat = ipRes.lat;
      lng = ipRes.lng;
    }
  }

  const finalArea = finalCity;

  // Check if profile needs update
  const prevState = currentProfile?.state;
  const prevCity = currentProfile?.city;
  const prevLat = currentProfile?.coarse_lat;
  const prevLng = currentProfile?.coarse_lng;

  const hasChanged = 
    !prevState || 
    prevState.toLowerCase() !== finalState.toLowerCase() ||
    !prevCity ||
    Math.abs((prevLat || 0) - lat) > 0.08 ||
    Math.abs((prevLng || 0) - lng) > 0.08;

  if (hasChanged) {
    try {
      const updates: any = {
        state: finalState,
        city: finalCity,
        area: finalArea,
        coarse_lat: lat,
        coarse_lng: lng,
        location: {
          city: finalCity,
          state: finalState,
          lat,
          lng
        },
        location_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await updateDoc(doc(db, 'profiles', userId), updates);
      await updateDoc(doc(db, 'users', userId), updates).catch(() => {});

      if (currentProfile) {
        const updated = { ...currentProfile, ...updates };
        const newScore = calculateProfileStrength(updated);
        await updateDoc(doc(db, 'profiles', userId), { strength: newScore }).catch(() => {});
        recalculateProfileStrengthOnServer(userId, updated);
      }

      console.log(`Updated user ${userId} location to ${finalCity}, ${finalState} (${lat}, ${lng})`);
      return { state: finalState, city: finalCity, lat, lng, updated: true };
    } catch (err) {
      console.warn('Failed to save updated location to firestore:', err);
    }
  }

  return { state: finalState, city: finalCity, lat, lng, updated: false };
}
