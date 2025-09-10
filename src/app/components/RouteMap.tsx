"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMapsAPI } from '../utils/googleMaps';

interface Waypoint {
  address: string;
  coordinates?: google.maps.LatLngLiteral;
  isWarehouse?: boolean;
}

interface RouteMapProps {
  packages: Array<{ id: string; address: string; status: string }>;
  driverId: string;
  onLocationUpdate?: (location: google.maps.LatLngLiteral) => void;
}

const WAREHOUSE_LOCATION = { lat: 6.9271, lng: 79.8612 }; // Colombo
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
if (!GOOGLE_MAPS_API_KEY) {
  throw new Error('Google Maps API key is not configured');
}

// Function to load Google Maps API dynamically
// const loadGoogleMapsAPI = (): Promise<typeof google> => {
//   if (window.google && window.google.maps) {
//     return Promise.resolve(window.google);
//   }

//   if (!GOOGLE_MAPS_API_KEY) {
//     return Promise.reject(new Error('Google Maps API key is missing'));
//   }

//   return new Promise((resolve, reject) => {
//     const script = document.createElement('script');
//     script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&v=weekly`;
//     script.async = true;
//     script.defer = true;

//     script.addEventListener('load', () => {
//       if (window.google && window.google.maps) {
//         resolve(window.google);
//       } else {
//         reject(new Error('Google Maps failed to load'));
//       }
//     });

//     script.addEventListener('error', () => {
//       reject(new Error('Failed to load Google Maps script'));
//     });

//     document.head.appendChild(script);
//   });
// };

export const RouteMap: React.FC<RouteMapProps> = ({ packages, driverId, onLocationUpdate }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);

  const calculateAndDisplayRoute = useCallback(async () => {
    if (!mapInstanceRef.current || !markerRef.current || packages.length === 0 || !apiLoaded) {
      return;
    }

    try {
      const directionsService = new google.maps.DirectionsService();
      const geocoder = new google.maps.Geocoder();

      // Get current location
      const currentLocation = markerRef.current.getPosition()?.toJSON() || WAREHOUSE_LOCATION;

      // Create waypoints array for pending deliveries
      const pendingPackages = packages.filter(pkg => 
        pkg.status !== 'DELIVERED' && pkg.status !== 'FAILED'
      );

      if (pendingPackages.length === 0) {
        // Clear any existing route
        directionsRendererRef.current?.setDirections({ routes: [] } as any);
        return;
      }

      // Geocode addresses with error handling
      const waypoints: google.maps.DirectionsWaypoint[] = [];
      
      for (const pkg of pendingPackages.slice(0, 8)) {
        try {
          const result = await geocoder.geocode({ address: pkg.address });
          if (result.results && result.results[0]) {
            waypoints.push({
              location: result.results[0].geometry.location,
              stopover: true
            });
          }
        } catch (error) {
          console.warn(`Failed to geocode address: ${pkg.address}`, error);
        }
      }

      if (waypoints.length === 0) {
        console.warn('No valid addresses to route to');
        return;
      }

      // Calculate optimized route
      const request: google.maps.DirectionsRequest = {
        origin: currentLocation,
        destination: waypoints.length === 1 ? waypoints[0].location! : WAREHOUSE_LOCATION,
        waypoints: waypoints.length > 1 ? waypoints.slice(0, -1) : [],
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING,
        avoidHighways: false,
        avoidTolls: false
      };

      directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRendererRef.current?.setDirections(result);
        } else {
          console.warn('Directions request failed:', status);
        }
      });
    } catch (error) {
      console.error('Route calculation error:', error);
    }
  }, [packages, apiLoaded]);

  // Start location tracking
  const startLocationTracking = useCallback(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          if (markerRef.current && mapInstanceRef.current) {
            markerRef.current.setPosition(location);
            mapInstanceRef.current.panTo(location);
            onLocationUpdate?.(location);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Use warehouse location as fallback
          if (markerRef.current) {
            markerRef.current.setPosition(WAREHOUSE_LOCATION);
            onLocationUpdate?.(WAREHOUSE_LOCATION);
          }
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
      watchIdRef.current = watchId;
    } else {
      console.warn('Geolocation not supported, using warehouse location');
      onLocationUpdate?.(WAREHOUSE_LOCATION);
    }
  }, [onLocationUpdate]);

  // Initialize map
  const initializeMap = useCallback(async () => {
    if (!mapRef.current || !apiLoaded) return;

    try {
      setError(null);
      setIsLoading(true);

      const mapOptions: google.maps.MapOptions = {
        zoom: 12,
        center: WAREHOUSE_LOCATION,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: false,
        gestureHandling: 'cooperative',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      };

      const map = new google.maps.Map(mapRef.current, mapOptions);
      mapInstanceRef.current = map;

      // Add error boundary for marker creation
      try {
        const marker = new google.maps.Marker({
          map,
          position: WAREHOUSE_LOCATION,
          title: 'Driver Location',
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: "#4B5563",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#ffffff"
          }
        });
        markerRef.current = marker;
      } catch (markerError) {
        console.error('Marker creation failed:', markerError);
        // Continue without marker
      }

      // Add error boundary for directions renderer
      try {
        const directionsRenderer = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: false,
          polylineOptions: {
            strokeColor: "#4B5563",
            strokeWeight: 4,
            strokeOpacity: 0.8
          }
        });
        directionsRendererRef.current = directionsRenderer;
      } catch (directionsError) {
        console.error('Directions renderer failed:', directionsError);
        // Continue without directions
      }

      setIsMapReady(true);
      setIsLoading(false);
      startLocationTracking();

    } catch (error) {
      console.error('Map initialization error:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize map');
      setIsLoading(false);
    }
  }, [apiLoaded, startLocationTracking]);

  // Load Google Maps API
  useEffect(() => {
    let mounted = true;

    const loadAPI = async () => {
      if (!mounted) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        await loadGoogleMapsAPI();
        
        if (mounted) {
          setApiLoaded(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('API loading error:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Failed to load Google Maps API');
          setIsLoading(false);
        }
      }
    };

    loadAPI();

    return () => {
      mounted = false;
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Initialize map when API is loaded
  useEffect(() => {
    if (apiLoaded && mapRef.current && !mapInstanceRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initializeMap();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [apiLoaded, initializeMap]);

  // Calculate route when packages change or map becomes ready
  useEffect(() => {
    if (isMapReady && apiLoaded) {
      calculateAndDisplayRoute();
    }
  }, [packages, isMapReady, apiLoaded, calculateAndDisplayRoute]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup map instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
      // Cleanup marker
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      // Cleanup directions renderer
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-red-50 rounded-xl border border-red-200">
        <div className="flex flex-col items-center text-center p-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-red-600 text-xl">⚠</span>
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Map Loading Failed</h3>
          <p className="text-red-700 text-sm mb-4 max-w-md">{error}</p>
          {error.includes('API key') && (
            <p className="text-red-600 text-xs mb-4">Please check your NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable</p>
          )}
          <button 
            onClick={() => {
              setError(null);
              setIsMapReady(false);
              setIsLoading(true);
              setApiLoaded(false);
              window.location.reload(); // This is enough to reload everything
            }} 
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-slate-50 rounded-xl">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-900 border-t-transparent mb-4"></div>
          <p className="text-slate-600 font-medium">Loading map...</p>
          <p className="text-slate-500 text-sm mt-1">Please wait while we initialize GPS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Live Route Tracking</h3>
        <div className="flex items-center space-x-2 text-sm text-slate-500">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>GPS Active</span>
        </div>
      </div>
      <div 
        ref={mapRef} 
        className="h-[500px] rounded-xl border border-slate-200 shadow-sm bg-slate-100"
        style={{ minHeight: '500px' }}
      />
      <div className="flex items-center justify-between text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
        <span>
          Showing optimized route for {packages.filter(p => p.status !== 'DELIVERED' && p.status !== 'FAILED').length} pending deliveries
        </span>
        <button 
          onClick={calculateAndDisplayRoute}
          className="text-slate-700 hover:text-slate-900 font-medium disabled:opacity-50"
          disabled={!isMapReady}
        >
          Refresh Route
        </button>
      </div>
    </div>
  );
};

export const MapScript = () => null;