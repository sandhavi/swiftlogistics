"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMapsAPI } from '@/app/utils/googleMaps';

interface RouteMapProps {
  packages: Array<{ id: string; address: string; status: string }>;
  driverId: string;
  warehouseLocation: string;
  isHeadingToWarehouse: boolean;
  selectedPackage: { id: string; address: string } | null;
  onLocationUpdate: (location: google.maps.LatLngLiteral) => Promise<void>;
  onPackagePickedUp?: () => void;
}

const WAREHOUSE_LOCATION = { lat: 6.9271, lng: 79.8612 }; // Colombo
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export const RouteMap: React.FC<RouteMapProps> = ({ 
  packages, 
  driverId, 
  isHeadingToWarehouse, 
  selectedPackage, 
  onLocationUpdate,
  onPackagePickedUp
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const warehouseMarkerRef = useRef<google.maps.Marker | null>(null);
  const packageMarkersRef = useRef<google.maps.Marker[]>([]);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const watchIdRef = useRef<number | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<google.maps.LatLngLiteral>(WAREHOUSE_LOCATION);
  const [routeInfo, setRouteInfo] = useState<{
    totalDistance: string;
    totalDuration: string;
    nextDestination: string;
    routeSteps: Array<{
      destination: string;
      distance: string;
      duration: string;
      stepIndex: number;
    }>;
  } | null>(null);

  // Only show packages that are IN_TRANSIT (picked up by driver)
  const inTransitPackages = packages.filter(pkg => pkg.status === 'IN_TRANSIT');

  // Calculate optimized route with two phases: warehouse pickup then delivery
  const calculateOptimizedRoute = useCallback(async () => {
    if (!mapInstanceRef.current || !driverMarkerRef.current || !apiLoaded) {
      return;
    }

    try {
      const directionsService = new google.maps.DirectionsService();
      const geocoder = new google.maps.Geocoder();

      // Clear previous route
      directionsRendererRef.current?.setDirections({ routes: [] } as any);

      // Clear existing package markers
      packageMarkersRef.current.forEach(marker => marker.setMap(null));
      packageMarkersRef.current = [];

      // PHASE 1: If heading to warehouse, show route to warehouse only
      if (isHeadingToWarehouse && selectedPackage) {
        const warehouseRequest: google.maps.DirectionsRequest = {
          origin: currentLocation,
          destination: WAREHOUSE_LOCATION,
          travelMode: google.maps.TravelMode.DRIVING,
          avoidHighways: false,
          avoidTolls: false
        };

        directionsService.route(warehouseRequest, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            directionsRendererRef.current?.setDirections(result);
            
            const route = result.routes[0];
            if (route && route.legs && route.legs.length > 0) {
              const leg = route.legs[0];
              setRouteInfo({
                totalDistance: leg.distance?.text || '0 km',
                totalDuration: leg.duration?.text || '0 min',
                nextDestination: 'Warehouse (Package Pickup)',
                routeSteps: [{
                  destination: 'Central Warehouse - Package Pickup',
                  distance: leg.distance?.text || 'Unknown',
                  duration: leg.duration?.text || 'Unknown',
                  stepIndex: 0
                }]
              });
            }

            // Show warehouse marker
            if (warehouseMarkerRef.current) {
              warehouseMarkerRef.current.setVisible(true);
            }

            // Fit map to show route
            if (route.bounds) {
              mapInstanceRef.current?.fitBounds(route.bounds);
            }
          } else {
            console.error('Warehouse route failed:', { status, error: result });
            setError(`Failed to calculate route to warehouse: ${status}`);
          }
        });
        return;
      }

      // PHASE 2: After pickup, show optimized delivery route
      if (!isHeadingToWarehouse && inTransitPackages.length > 0) {
        // Geocode all IN_TRANSIT package addresses
        const geocodePromises = inTransitPackages.map(async (pkg) => {
          try {
            const result = await geocoder.geocode({ address: pkg.address });
            if (result.results && result.results[0]) {
              return {
                packageId: pkg.id,
                address: pkg.address,
                location: result.results[0].geometry.location,
                status: pkg.status
              };
            }
            return null;
          } catch (error) {
            console.error(`Failed to geocode ${pkg.address}:`, error);
            return null;
          }
        });

        const geocodedPackages = (await Promise.all(geocodePromises)).filter(Boolean);

        if (geocodedPackages.length === 0) {
          setError('Could not geocode any delivery addresses');
          return;
        }

        // Create multi-stop route: Warehouse → All delivery locations (optimized)
        const deliveryWaypoints: google.maps.DirectionsWaypoint[] = geocodedPackages.map(pkg => ({
          location: pkg!.location,
          stopover: true
        }));

        // Start from warehouse, visit all delivery locations in optimized order
        const deliveryRequest: google.maps.DirectionsRequest = {
          origin: WAREHOUSE_LOCATION, // Start from warehouse
          destination: geocodedPackages[geocodedPackages.length - 1]!.location, // End at last delivery
          waypoints: geocodedPackages.length > 1 ? deliveryWaypoints.slice(0, -1) : [], // All but last as waypoints
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true,
          avoidHighways: false,
          avoidTolls: false
        };

        directionsService.route(deliveryRequest, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            directionsRendererRef.current?.setDirections(result);
            
            const route = result.routes[0];
            if (route && route.legs && route.legs.length > 0) {
              // Calculate total distance and duration
              let totalDistance = 0;
              let totalDuration = 0;
              const routeSteps: Array<{
                destination: string;
                distance: string;
                duration: string;
                stepIndex: number;
              }> = [];

              // Add warehouse as first step
              routeSteps.push({
                destination: 'Central Warehouse (Starting Point)',
                distance: '0 km',
                duration: '0 min',
                stepIndex: 0
              });

              route.legs.forEach((leg, index) => {
                if (leg.distance && leg.duration) {
                  totalDistance += leg.distance.value;
                  totalDuration += leg.duration.value;
                  
                  // Determine destination based on waypoint optimization
                  const waypointIndex = route.waypoint_order ? route.waypoint_order[index] : index;
                  const pkg = geocodedPackages[waypointIndex < geocodedPackages.length ? waypointIndex : index];
                  
                  let destination = 'Delivery Stop';
                  if (pkg) {
                    destination = `Package #${pkg.packageId.slice(-6)} - ${pkg.address}`;
                  }

                  routeSteps.push({
                    destination,
                    distance: leg.distance.text || 'Unknown',
                    duration: leg.duration.text || 'Unknown',
                    stepIndex: index + 1
                  });
                }
              });

              setRouteInfo({
                totalDistance: `${(totalDistance / 1000).toFixed(1)} km`,
                totalDuration: `${Math.ceil(totalDuration / 60)} min`,
                nextDestination: routeSteps.length > 1 ? routeSteps[1].destination : 'No destinations',
                routeSteps: routeSteps
              });

              // Create markers for delivery locations with optimized order
              const orderToUse = route.waypoint_order || geocodedPackages.map((_, i) => i);
              
              // Add warehouse marker as stop 1
              if (warehouseMarkerRef.current) {
                warehouseMarkerRef.current.setVisible(true);
              }

              // Add delivery location markers starting from stop 2
              orderToUse.forEach((originalIndex, optimizedIndex) => {
                const pkg = geocodedPackages[originalIndex];
                if (pkg && mapInstanceRef.current) {
                  const stopNumber = optimizedIndex + 2; // Start from 2 (warehouse is 1)
                  const marker = new google.maps.Marker({
                    map: mapInstanceRef.current,
                    position: pkg.location,
                    title: `Stop ${stopNumber}: Package #${pkg.packageId.slice(-6)}\n${pkg.address}`,
                    icon: {
                      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
                          <circle cx="14" cy="14" r="12" fill="#059669" stroke="#ffffff" stroke-width="3"/>
                          <text x="14" y="18" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="bold">${stopNumber}</text>
                        </svg>
                      `),
                      scaledSize: new google.maps.Size(28, 28),
                      anchor: new google.maps.Point(14, 14)
                    }
                  });

                  // Add info window
                  const infoWindow = new google.maps.InfoWindow({
                    content: `
                      <div class="p-3">
                        <h4 class="font-semibold text-sm mb-1">Stop ${stopNumber}: Package #${pkg.packageId.slice(-6)}</h4>
                        <p class="text-xs text-gray-600 mb-1">${pkg.address}</p>
                        <div class="flex items-center justify-between">
                          <p class="text-xs font-medium" style="color: #059669">
                            IN_TRANSIT
                          </p>
                          <p class="text-xs text-gray-500">
                            Order: ${stopNumber}
                          </p>
                        </div>
                      </div>
                    `
                  });

                  marker.addListener('click', () => {
                    infoWindow.open(mapInstanceRef.current, marker);
                  });

                  packageMarkersRef.current.push(marker);
                }
              });

              // Fit map to show entire route
              if (route.bounds) {
                mapInstanceRef.current?.fitBounds(route.bounds);
              }
            }
          } else {
            console.error('Delivery route failed:', { status, error: result });
            setError(`Failed to calculate delivery route: ${status}`);
          }
        });
        return;
      }

      // Default state: no packages or no active delivery
      if (inTransitPackages.length === 0) {
        setRouteInfo({
          totalDistance: '0 km',
          totalDuration: '0 min',
          nextDestination: isHeadingToWarehouse ? 'Warehouse (Package Pickup)' : 'No packages in transit',
          routeSteps: []
        });
        
        // Show only warehouse marker when heading there
        if (warehouseMarkerRef.current && isHeadingToWarehouse) {
          warehouseMarkerRef.current.setVisible(true);
        }
      }

    } catch (error) {
      console.error('Route calculation error:', error);
      setError('Failed to calculate optimized route');
    }
  }, [currentLocation, isHeadingToWarehouse, inTransitPackages, apiLoaded, selectedPackage]);

  // Start location tracking
  const startLocationTracking = useCallback(() => {
    if (!mapInstanceRef.current || !driverMarkerRef.current) return;

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          setCurrentLocation(location);
          
          if (driverMarkerRef.current && mapInstanceRef.current) {
            driverMarkerRef.current.setPosition(location);
            
            // Update location in database
            if (onLocationUpdate) {
              try {
                await onLocationUpdate(location);
              } catch (error) {
                console.warn('Failed to update driver location:', error);
              }
            }
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Use warehouse location as fallback
          const fallbackLocation = WAREHOUSE_LOCATION;
          setCurrentLocation(fallbackLocation);
          if (driverMarkerRef.current) {
            driverMarkerRef.current.setPosition(fallbackLocation);
            onLocationUpdate?.(fallbackLocation);
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
      setCurrentLocation(WAREHOUSE_LOCATION);
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

      // Create driver location marker
      const driverMarker = new google.maps.Marker({
        map,
        position: WAREHOUSE_LOCATION,
        title: 'Your Location (Driver)',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" fill="#1f2937" stroke="#ffffff" stroke-width="3"/>
              <polygon points="16,9 20,15 12,15" fill="#ffffff"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16)
        }
      });
      driverMarkerRef.current = driverMarker;

      // Create warehouse marker
      const warehouseMarker = new google.maps.Marker({
        map,
        position: WAREHOUSE_LOCATION,
        title: 'Stop 1: Warehouse - Package Pickup Location',
        visible: isHeadingToWarehouse, // Only show when heading to warehouse
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
              <rect x="6" y="12" width="20" height="16" fill="#059669" stroke="#ffffff" stroke-width="3" rx="2"/>
              <polygon points="16,4 26,12 6,12" fill="#065f46"/>
              <rect x="12" y="16" width="8" height="8" fill="#ffffff"/>
              <text x="16" y="22" text-anchor="middle" fill="#059669" font-size="10" font-weight="bold">1</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16)
        }
      });
      warehouseMarkerRef.current = warehouseMarker;

      // Add warehouse info window
      const warehouseInfoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-3">
            <h4 class="font-semibold text-sm mb-1">Stop 1: Central Warehouse</h4>
            <p class="text-xs text-gray-600 mb-1">Colombo, Sri Lanka</p>
            <p class="text-xs text-green-600 font-medium">Package Pickup Location</p>
          </div>
        `
      });

      warehouseMarker.addListener('click', () => {
        warehouseInfoWindow.open(map, warehouseMarker);
      });

      // Create directions renderer with custom styling (removed blinking effect)
      const directionsRenderer = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true, // We'll use custom markers
        polylineOptions: {
          strokeColor: "#059669", // Solid green color
          strokeWeight: 4,
          strokeOpacity: 0.8 // Static opacity, no animation
        }
      });
      directionsRendererRef.current = directionsRenderer;

      setIsMapReady(true);
      setIsLoading(false);
      startLocationTracking();

    } catch (error) {
      console.error('Map initialization error:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize map');
      setIsLoading(false);
    }
  }, [apiLoaded, startLocationTracking, isHeadingToWarehouse]);

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
      const timer = setTimeout(() => {
        initializeMap();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [apiLoaded, initializeMap]);

  // Update warehouse marker visibility when heading state changes
  useEffect(() => {
    if (warehouseMarkerRef.current) {
      warehouseMarkerRef.current.setVisible(isHeadingToWarehouse);
    }
  }, [isHeadingToWarehouse]);

  // Calculate route when state changes
  useEffect(() => {
    if (isMapReady && apiLoaded) {
      const timer = setTimeout(() => {
        calculateOptimizedRoute();
      }, 500); // Small delay to ensure map is fully ready

      return () => clearTimeout(timer);
    }
  }, [isMapReady, apiLoaded, inTransitPackages.length, currentLocation, isHeadingToWarehouse, calculateOptimizedRoute]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      packageMarkersRef.current.forEach(marker => marker.setMap(null));
      packageMarkersRef.current = [];
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setMap(null);
        driverMarkerRef.current = null;
      }
      if (warehouseMarkerRef.current) {
        warehouseMarkerRef.current.setMap(null);
        warehouseMarkerRef.current = null;
      }
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
              window.location.reload();
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
          <p className="text-slate-600 font-medium">Loading optimized route map...</p>
          <p className="text-slate-500 text-sm mt-1">Calculating best delivery sequence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Optimized Delivery Route</h3>
        <div className="flex items-center space-x-2 text-sm text-slate-500">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span>GPS Active</span>
        </div>
      </div>

      {/* Route Summary Card */}
      {routeInfo && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-900">Route Summary</h4>
            {isHeadingToWarehouse && onPackagePickedUp && (
              <button
                onClick={onPackagePickedUp}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors"
              >
                Mark Package Picked Up
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{routeInfo.totalDistance}</div>
              <div className="text-sm text-slate-600">Total Distance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{routeInfo.totalDuration}</div>
              <div className="text-sm text-slate-600">Total Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{inTransitPackages.length}</div>
              <div className="text-sm text-slate-600">In Transit</div>
            </div>
          </div>
          <div className="border-t border-blue-200 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Next Stop:</span>
              <span className="font-semibold text-slate-900 text-right max-w-xs truncate">{routeInfo.nextDestination}</span>
            </div>
          </div>
        </div>
      )}

      {/* Route Steps */}
      {routeInfo && routeInfo.routeSteps.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h4 className="font-semibold text-slate-900 mb-3">Delivery Sequence</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {routeInfo.routeSteps.map((step, index) => (
              <div key={index} className={`flex items-center justify-between p-2 rounded-lg ${
                index === 0 ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-blue-600 text-white' : 'bg-slate-400 text-white'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900 truncate max-w-xs">{step.destination}</div>
                    <div className="text-xs text-slate-500">{step.distance} • {step.duration}</div>
                  </div>
                </div>
                {index === 0 && (
                  <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    Next
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div 
        ref={mapRef} 
        className="h-[500px] rounded-xl border border-slate-200 shadow-sm bg-slate-100"
        style={{ minHeight: '500px' }}
      />
      
      <div className="flex items-center justify-between text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
        <span>
          {inTransitPackages.length > 0 
            ? `Showing route for ${inTransitPackages.length} IN_TRANSIT package${inTransitPackages.length > 1 ? 's' : ''}`
            : isHeadingToWarehouse 
            ? 'Navigate to warehouse for package pickup'
            : 'No packages in transit - routes will appear after pickup'}
        </span>
        <button 
          onClick={calculateOptimizedRoute}
          className="text-slate-700 hover:text-slate-900 font-medium disabled:opacity-50"
          disabled={!isMapReady}
        >
          Recalculate Route
        </button>
      </div>
    </div>
  );
};