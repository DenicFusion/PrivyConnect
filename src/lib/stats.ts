/**
 * Real Profile Stats Calculation & API Client
 * PrivyConnect Real Data Architecture (No Mock Numbers)
 */

export interface ProfileData {
  id?: string;
  gender?: string;
  vibe?: string;
  looking_for?: string;
  preferences?: { vibe?: string; [key: string]: any } | any[];
  state?: string;
  city?: string;
  area?: string;
  location?: any;
  photos?: string[];
  gallery?: string[];
  photo_url?: string;
  bio?: string;
  is_subscribed?: boolean;
  subscription_status?: string;
  views?: number;
  connections?: number;
  strength?: number;
  [key: string]: any;
}

/**
 * Calculate profile completeness score (0 to 100%)
 * 
 * Rules:
 * - Gender chosen: 10
 * - Desired companionship tag chosen: 15
 * - Location set (state and city): 15
 * - Photos: 20 for the first 2, then 5 for each extra photo up to 6 photos (max 40)
 * - Bio filled in (at least 20 characters): 15
 * - Active subscriber: 5
 * Total: 100
 */
export function calculateProfileStrength(profile: ProfileData | null | undefined): number {
  if (!profile) return 0;
  let score = 0;

  // 1. Gender chosen: 10
  if (profile.gender && typeof profile.gender === 'string' && profile.gender.trim() !== '') {
    score += 10;
  }

  // 2. Desired companionship tag chosen: 15
  const vibe = 
    (typeof profile.vibe === 'string' && profile.vibe.trim()) ||
    (typeof profile.looking_for === 'string' && profile.looking_for.trim()) ||
    (profile.preferences && typeof profile.preferences === 'object' && !Array.isArray(profile.preferences) && typeof (profile.preferences as any).vibe === 'string' && (profile.preferences as any).vibe.trim()) ||
    '';
  if (vibe) {
    score += 15;
  }

  // 3. Location set (state and city): 15
  const stateVal = typeof profile.state === 'string' ? profile.state.trim() : '';
  const cityVal = 
    (typeof profile.city === 'string' && profile.city.trim()) ||
    (typeof profile.area === 'string' && profile.area.trim()) ||
    (profile.location && typeof profile.location === 'object' && typeof profile.location.city === 'string' && profile.location.city.trim()) ||
    (typeof profile.location === 'string' && profile.location.trim().toLowerCase() !== stateVal.toLowerCase() ? profile.location.trim() : '') ||
    '';

  if (stateVal !== '' && cityVal !== '') {
    score += 15;
  }

  // 4. Photos: 20 for first 2, then 5 for each extra photo up to 6 photos (max 40)
  const photoSet = new Set<string>();
  if (Array.isArray(profile.photos)) {
    profile.photos.forEach(p => {
      if (typeof p === 'string' && p.trim()) photoSet.add(p.trim());
    });
  }
  if (Array.isArray(profile.gallery)) {
    profile.gallery.forEach(p => {
      if (typeof p === 'string' && p.trim()) photoSet.add(p.trim());
    });
  }
  if (typeof profile.photo_url === 'string' && profile.photo_url.trim()) {
    photoSet.add(profile.photo_url.trim());
  }

  const photoCount = photoSet.size;
  if (photoCount >= 2) {
    score += 20 + Math.min(4, photoCount - 2) * 5;
  } else if (photoCount === 1) {
    score += 10;
  }

  // 5. Bio filled in (at least 20 characters): 15
  if (profile.bio && typeof profile.bio === 'string' && profile.bio.trim().length >= 20) {
    score += 15;
  }

  // 6. Active subscriber: 5
  if (profile.is_subscribed === true || profile.subscription_status === 'active') {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Record a unique daily profile view on the server
 */
export async function recordProfileView(viewerId: string, ownerId: string): Promise<{ incremented: boolean; views?: number }> {
  if (!viewerId || !ownerId || viewerId === ownerId) {
    return { incremented: false };
  }

  try {
    const res = await fetch('/api/profile/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewerId, ownerId })
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('Failed to record profile view via API:', err);
    return { incremented: false };
  }
}

/**
 * Check and evaluate if conversation is connected (both participants sent at least 1 message)
 */
export async function checkAndUpdateConversationConnection(chatId: string): Promise<{ is_connected: boolean; newlyConnected: boolean }> {
  if (!chatId) return { is_connected: false, newlyConnected: false };

  try {
    const res = await fetch('/api/chat/check-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId })
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('Failed to check conversation connection:', err);
    return { is_connected: false, newlyConnected: false };
  }
}

/**
 * Delete a conversation on server, automatically decrementing connections if connected
 */
export async function deleteConversation(chatId: string, requestedByUserId?: string): Promise<{ success: boolean; wasConnected?: boolean }> {
  if (!chatId) return { success: false };
  try {
    const res = await fetch('/api/chat/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, requestedByUserId })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to delete conversation on server:', err);
  }
  return { success: false };
}

/**
 * Delete account on server, automatically decrementing connections for connected partners
 */
export async function deleteAccount(userId: string): Promise<{ success: boolean }> {
  if (!userId) return { success: false };
  try {
    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to delete account on server:', err);
  }
  return { success: false };
}

/**
 * Recalculate and update profile strength on server and daily stats
 */
export async function recalculateProfileStrengthOnServer(userId: string, profileData?: any): Promise<number> {
  if (!userId) return 0;
  try {
    const res = await fetch('/api/profile/recalculate-strength', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, profileData })
    });
    if (res.ok) {
      const data = await res.json();
      return data.strength || 0;
    }
  } catch (err) {
    console.warn('Failed to recalculate profile strength on server:', err);
  }
  return calculateProfileStrength(profileData);
}

export interface ChartPoint {
  label: string;
  date: string;
  value: number;
}

export interface UserStatsResponse {
  points: ChartPoint[];
  totalInRange: number;
  previousPeriodTotal: number;
  delta: number;
  allTimeTotal: number;
  hasActivity: boolean;
}

/**
 * Fetch stats for the private stats chart
 */
export async function fetchUserStats(
  userId: string,
  range: 'week' | 'month' | 'all',
  metric: 'views' | 'connections' | 'strength'
): Promise<UserStatsResponse> {
  try {
    const res = await fetch(`/api/user-stats/${userId}?range=${range}&metric=${metric}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch user stats:', err);
  }

  return {
    points: [],
    totalInRange: 0,
    previousPeriodTotal: 0,
    delta: 0,
    allTimeTotal: 0,
    hasActivity: false
  };
}
