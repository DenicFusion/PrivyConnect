import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { supabase, isSupabaseActive } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Navigation, 
  User, 
  Shield, 
  Zap, 
  ChevronRight, 
  Maximize2, 
  Minimize2,
  Settings,
  Eye,
  EyeOff,
  Locate,
  Compass,
  Search,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fix Leaflet marker icons
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const UserIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="relative w-12 h-12 flex items-center justify-center">
          <div class="absolute inset-0 rounded-full bg-brand-blue/20 animate-ping"></div>
          <div class="w-10 h-10 rounded-full border-2 border-brand-blue bg-brand-dark flex items-center justify-center shadow-lg shadow-brand-blue/40 z-10">
            <div class="flex flex-col items-center">
              <div class="w-2.5 h-2.5 rounded-full bg-brand-blue mb-0.5"></div>
              <span class="text-[7px] font-black text-brand-blue uppercase tracking-tighter">You</span>
            </div>
          </div>
        </div>`,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

const ProfileIcon = (photoUrl: string) => L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="w-12 h-12 rounded-2xl border-2 border-white/20 bg-brand-dark overflow-hidden shadow-xl transition-all hover:scale-110 hover:border-brand-blue group">
          <img src="${photoUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}" class="w-full h-full object-cover" />
        </div>`,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

function MapEvents({ onMove }: { onMove: (center: [number, number]) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onMove([center.lat, center.lng]);
    },
  });
  return null;
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function MapDiscovery({ profile }: { profile: any }) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([9.0820, 8.6753]); // Nigeria center
  const [privacyMode, setPrivacyMode] = useState(profile?.location_privacy || 'exact');
  const [radius, setRadius] = useState(10); // Default 10km
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const updateInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchNearbyUsers = useCallback(async (center: [number, number]) => {
    if (!isSupabaseActive || !center) return;
    
    try {
      const { data, error } = await supabase.rpc('search_nearby_users', {
        user_lat: center[0],
        user_lng: center[1],
        radius_km: radius,
        preference: profile?.looking_for || 'everyone'
      });

      if (error) throw error;
      setNearbyUsers(data || []);
    } catch (err) {
      console.error('Error fetching nearby users:', err);
    }
  }, [profile?.id, profile?.looking_for, radius]);

  const updateLocationInDB = async (lat: number, lng: number) => {
    if (!profile?.id || !isSupabaseActive) return;
    
    await supabase.from('profiles').update({
      latitude: lat,
      longitude: lng,
      last_location_update: new Date().toISOString(),
      location: { lat, lng, city: "Detected" }
    }).eq('id', profile.id);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const loc: [number, number] = [latitude, longitude];
        setUserLocation(loc);
        setMapCenter(loc);
        fetchNearbyUsers(loc);
        setLoading(false);
        setLocationError(null);
        setShowPermissionPrompt(false);
        
        if (privacyMode !== 'hidden') {
          updateLocationInDB(latitude, longitude);
        }
      },
      (error) => {
        console.error(error);
        setLoading(false);
        if (error.code === 1) {
          setLocationError("Location access denied. Please enable it in your settings.");
          setShowPermissionPrompt(true);
        } else {
          setLocationError("Could not fetch your location.");
        }
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    requestLocation();
    
    // Periodic update every 60 seconds
    updateInterval.current = setInterval(() => {
      if (navigator.geolocation && privacyMode !== 'hidden') {
        navigator.geolocation.getCurrentPosition((pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation([latitude, longitude]);
          updateLocationInDB(latitude, longitude);
        });
      }
    }, 60000);

    return () => {
      if (updateInterval.current) clearInterval(updateInterval.current);
    };
  }, [profile?.id, privacyMode]);

  useEffect(() => {
    if (userLocation) {
      fetchNearbyUsers(userLocation);
    }
  }, [radius, userLocation, fetchNearbyUsers]);

  const togglePrivacy = async () => {
    const modes: ('exact' | 'approximate' | 'hidden')[] = ['exact', 'approximate', 'hidden'];
    const nextMode = modes[(modes.indexOf(privacyMode) + 1) % modes.length];
    setPrivacyMode(nextMode);
    
    if (profile?.id) {
      await supabase.from('profiles').update({ 
        location_privacy: nextMode,
        location_visible: nextMode !== 'hidden'
      }).eq('id', profile.id);
    }
  };

  const radiusOptions = [
    { label: '1km', value: 1 },
    { label: '5km', value: 5 },
    { label: '10km', value: 10 },
    { label: '50km', value: 50 },
  ];

  return (
    <div className={cn(
      "relative rounded-[40px] overflow-hidden border border-white/10 bg-[#0a0a0a] transition-all duration-500",
      isFullscreen ? "fixed inset-4 z-50" : "h-[700px] w-full"
    )}>
      {/* Map UI Overlay */}
      <div className="absolute top-6 left-6 right-6 z-[1000] flex flex-col gap-4 pointer-events-none">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2 pointer-events-auto">
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-3xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 flex items-center justify-center">
                <Compass className="w-5 h-5 text-brand-blue animate-spin-slow" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest">Discovery Engine</h3>
                <p className="text-[8px] text-white/40 uppercase tracking-widest font-bold">
                  {nearbyUsers.length} users within {radius}km
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pointer-events-auto">
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-4 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl text-white/60 hover:text-white transition-all shadow-xl"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button 
              onClick={togglePrivacy}
              className="p-4 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl text-brand-blue hover:scale-105 transition-all flex items-center gap-2 shadow-xl"
            >
              {privacyMode === 'hidden' ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              <span className="text-[10px] font-bold uppercase tracking-widest">{privacyMode}</span>
            </button>
            <button 
              onClick={requestLocation}
              className="p-4 bg-brand-blue text-brand-dark rounded-2xl hover:scale-105 transition-all shadow-xl"
            >
              <Locate className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Radius Selector */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-1 rounded-2xl flex items-center gap-1">
            {radiusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRadius(opt.value)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                  radius === opt.value 
                    ? "bg-brand-blue text-brand-dark" 
                    : "text-white/40 hover:text-white"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Permission Fallback */}
      <AnimatePresence>
        {locationError && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-8 text-center"
          >
            <div className="max-w-sm space-y-6">
              <div className="w-20 h-20 bg-red-500/10 rounded-[32px] flex items-center justify-center mx-auto border border-red-500/20">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-display uppercase tracking-tighter italic">Location Required</h3>
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold leading-relaxed">
                  {locationError}
                </p>
              </div>
              <button 
                onClick={requestLocation}
                className="w-full py-5 bg-brand-blue text-brand-dark font-bold uppercase tracking-widest text-xs rounded-2xl shadow-xl"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend & Privacy Info */}
      <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-2">
        <div className="px-4 py-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center gap-3 shadow-2xl">
          <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse shadow-[0_0_10px_rgba(0,209,255,0.5)]" />
          <span className="text-[9px] uppercase tracking-widest font-black text-white/80">Your location is always visible to you</span>
        </div>
        <div className="px-4 py-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center gap-3 shadow-2xl">
          <Shield className="w-3 h-3 text-emerald-500" />
          <span className="text-[9px] uppercase tracking-widest font-black text-white/80">Privacy Protected &bull; {privacyMode} mode</span>
        </div>
      </div>

      {/* Map Container */}
      <MapContainer 
        center={mapCenter} 
        zoom={13} 
        style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        <MapEvents onMove={fetchNearbyUsers} />
        <RecenterMap center={mapCenter} />

        {userLocation && privacyMode !== 'hidden' && (
          <Marker position={userLocation} icon={UserIcon}>
            <Popup className="custom-popup">
              <div className="p-2 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-blue">You are here</p>
                <p className="text-[8px] text-white/40 uppercase tracking-widest font-bold mt-1">Live Updates Active</p>
              </div>
            </Popup>
          </Marker>
        )}

        {nearbyUsers.map((u) => (
          <Marker 
            key={u.id} 
            position={[u.latitude, u.longitude]} 
            icon={ProfileIcon(u.photo_url)}
          >
            <Popup className="custom-popup">
              <div className="p-4 min-w-[220px] space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                    <img src={u.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm truncate max-w-[120px]">{u.display_name || u.username}</h4>
                    <div className="flex items-center gap-1">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        u.is_online ? "bg-emerald-500 animate-pulse" : "bg-white/20"
                      )}></div>
                      <span className="text-[8px] uppercase tracking-widest font-bold text-white/40">
                        {u.is_online ? 'Active Now' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-2 py-1 bg-white/5 rounded-lg flex items-center gap-1 border border-white/10">
                    <MapPin className="w-3 h-3 text-brand-blue" />
                    <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest">
                      ~{u.distance.toFixed(1)} km away
                    </span>
                  </div>
                  {u.is_subscribed && (
                    <div className="px-2 py-1 bg-brand-blue/10 rounded-lg flex items-center gap-1 border border-brand-blue/20">
                      <Zap className="w-3 h-3 text-brand-blue" />
                      <span className="text-[8px] font-bold text-brand-blue uppercase tracking-widest">Premium</span>
                    </div>
                  )}
                </div>

                <Link 
                  to={`/u/${u.username}`}
                  className="w-full py-4 bg-brand-blue text-brand-dark font-bold uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-lg"
                >
                  View Profile <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Legend/Status */}
      <div className="absolute bottom-6 left-6 z-[1000] pointer-events-none">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full flex items-center gap-4">
          <div className="flex -space-x-3">
            {nearbyUsers.slice(0, 5).map((u, i) => (
              <div key={u.id} className="w-8 h-8 rounded-full border-2 border-brand-dark overflow-hidden shadow-lg">
                <img src={u.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-white font-bold uppercase tracking-widest">
              Nearby Discovery
            </p>
            <p className="text-[8px] text-white/40 uppercase tracking-widest font-bold">
              {nearbyUsers.length} users matching your preference
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .leaflet-container {
          background: #0a0a0a !important;
        }
        .custom-popup .leaflet-popup-content-wrapper {
          background: #0a0a0a !important;
          color: white !important;
          border-radius: 32px !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          padding: 0 !important;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5) !important;
        }
        .custom-popup .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }
        .custom-popup .leaflet-popup-tip {
          background: #0a0a0a !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .leaflet-bar {
          border: none !important;
          box-shadow: none !important;
        }
        .leaflet-bar a {
          background: rgba(0, 0, 0, 0.6) !important;
          backdrop-filter: blur(12px) !important;
          color: white !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
          margin-bottom: 4px !important;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
