/**
 * Nigerian States Coordinates & Coarse Distance Calculator
 * Privacy-first: coordinates are rounded to 2 decimal places (~1.1 km resolution)
 */

export interface CoarseCoords {
  lat: number;
  lng: number;
  state: string;
  city?: string;
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

/**
 * Get coordinates for a Nigerian state, normalized
 */
export function getStateCoords(stateName?: string): { lat: number; lng: number } {
  if (!stateName) return NIGERIAN_STATE_COORDS['Lagos'];
  const clean = stateName.trim();
  const matched = Object.keys(NIGERIAN_STATE_COORDS).find(
    k => k.toLowerCase() === clean.toLowerCase() || clean.toLowerCase().includes(k.toLowerCase())
  );
  return matched ? NIGERIAN_STATE_COORDS[matched] : NIGERIAN_STATE_COORDS['Lagos'];
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
      if (data && data.state) {
        return {
          state: data.state,
          city: data.city || data.state,
          lat: data.lat || 6.52,
          lng: data.lng || 3.37,
          isDetected: !!data.isDetected
        };
      }
    }
  } catch (e) {
    console.warn('Location detection request failed:', e);
  }

  // Safe fallback to Lagos
  return {
    state: 'Lagos',
    city: 'Lagos',
    lat: 6.52,
    lng: 3.37,
    isDetected: false
  };
}
