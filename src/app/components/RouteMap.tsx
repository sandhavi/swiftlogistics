"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMapsAPI } from '@/app/utils/googleMaps';

interface RouteMapProps {
  packages: Array<{ id: string; address: string; status: string }>;
  driverId: string;
  warehouseLocation: string;
  isHeadingToWarehouse: boolean;
  selectedPackage: { id: string; address: string } | null;
  selectedPackages: string[];
  onLocationUpdate: (location: google.maps.LatLngLiteral) => Promise<void>;
  onPackagePickedUp?: () => void;
}

const WAREHOUSE_LOCATION = { lat: 6.904, lng: 79.859 }; // Colombo
// const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export const RouteMap: React.FC<RouteMapProps> = function RouteMap({ 
  packages, 
  isHeadingToWarehouse, 
  selectedPackage, 
  selectedPackages,
  onLocationUpdate
}) {
  // Cleanup effect: Remove all stop number markers if there are no packages IN_TRANSIT
  useEffect(() => {
    const inTransitPackages = packages.filter(pkg => (pkg.status || '').toString().toUpperCase() === 'IN_TRANSIT');
    if (inTransitPackages.length === 0) {
      // Remove all package markers (stop number tags)
      if (packageMarkersRef.current && packageMarkersRef.current.length > 0) {
        packageMarkersRef.current.forEach(marker => {
          if (marker) marker.setMap(null);
        });
        packageMarkersRef.current = [];
      }
      // Also remove warehouse marker if needed
      if (warehouseMarkerRef.current) {
        warehouseMarkerRef.current.setMap(null);
      }
      // Clear directions
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      if (warehouseToDeliveryRendererRef.current) {
        warehouseToDeliveryRendererRef.current.setMap(null);
      }
    }
  }, [packages]);
  // DEBUG: Print all props and state on every render
  console.log('[ROUTEMAP RENDER]');
  console.log('Packages prop:', packages);
  console.log('SelectedPackages prop:', selectedPackages);
  console.log('Is heading to warehouse:', isHeadingToWarehouse);
  console.log('InTransit packages:', packages.filter(pkg => (pkg.status || '').toString().toUpperCase() === 'IN_TRANSIT'));
  console.log('Active package:', packages.find(pkg => (pkg.status || '').toString().toUpperCase() === 'IN_TRANSIT') || selectedPackage || null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const warehouseMarkerRef = useRef<google.maps.Marker | null>(null);
  const packageMarkersRef = useRef<google.maps.Marker[]>([]);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const warehouseToDeliveryRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<google.maps.LatLngLiteral>(WAREHOUSE_LOCATION);
  // const [routeInfo, setRouteInfo] = useState<RouteInfoType | null>(null);
  // type RouteInfoType = {
  //   totalDistance: string;
  //   totalDuration: string;
  //   nextDestination: string;
  //   routeSteps: Array<{
  //     destination: string;
  //     distance: string;
  //     duration: string;
  //     stepIndex: number;
  //   }>;
  // };

  // Only show packages that are IN_TRANSIT (picked up by driver)
  const inTransitPackages = packages.filter(pkg => (pkg.status || '').toString().toUpperCase() === 'IN_TRANSIT');

  // Determine active package robustly (case-insensitive). Prefer IN_TRANSIT packages,
  // fallback to selectedPackage prop if provided.
  const activePackage =
    packages.find(pkg => (pkg.status || '').toString().toUpperCase() === 'IN_TRANSIT')
    || selectedPackage
    || null;

  // For debugging
  // (You can remove this log later)
  console.log("Effective selected package (activePackage):", activePackage);

  const calculateOptimizedRoute = useCallback(async () => {
  console.log('--- RouteMap Debug ---');
  console.log('Current location:', currentLocation);
  console.log('Packages prop:', packages);
  console.log('SelectedPackages prop:', selectedPackages);
  console.log('Is heading to warehouse:', isHeadingToWarehouse);
  console.log('InTransit packages:', inTransitPackages);
    if (!mapInstanceRef.current || !driverMarkerRef.current || !apiLoaded) {
      return;
    }

    // Always clear old package markers before recalculating route
    if (packageMarkersRef.current && packageMarkersRef.current.length > 0) {
      packageMarkersRef.current.forEach(marker => {
        if (marker) marker.setMap(null);
      });
      packageMarkersRef.current = [];
    }

    // Debug: log all package statuses
    console.log("All packages:", packages.map(p => ({id: p.id, status: p.status})));
    console.log("InTransit packages:", inTransitPackages);

    // Always use the provided polyline styles for both route segments
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    if (warehouseToDeliveryRendererRef.current) {
      warehouseToDeliveryRendererRef.current.setMap(null);
      warehouseToDeliveryRendererRef.current = null;
    }

    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      map: mapInstanceRef.current,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#065f46", // dark green
        strokeWeight: 5,
        strokeOpacity: 0.9,
      },
    });

    warehouseToDeliveryRendererRef.current = new google.maps.DirectionsRenderer({
      map: mapInstanceRef.current,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#34d399", // light green
        strokeWeight: 4,
        strokeOpacity: 0.6,
      },
    });

    // 1️⃣ Driver → Warehouse
    const directionsService = new google.maps.DirectionsService();
    const geocoder = new google.maps.Geocoder();

    const toWarehouse = {
      origin: currentLocation,
      destination: WAREHOUSE_LOCATION,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsService.route(toWarehouse, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        directionsRendererRef.current?.setDirections(result);
        if (result.routes && result.routes[0] && result.routes[0].bounds) {
          mapInstanceRef.current?.fitBounds(result.routes[0].bounds);
        }
      } else {
        console.error("Driver → Warehouse route failed", status);
      }
    });
    // Always number all selected packages, including failed geocodes
    const deliveryPackages = selectedPackages
      .map(id => packages.find(pkg => pkg.id === id))
      .filter((pkg): pkg is { id: string; address: string; status: string } => !!pkg);
    if (deliveryPackages.length > 0) {
      // Remove old package markers
      packageMarkersRef.current.forEach(marker => marker.setMap(null));
      packageMarkersRef.current = [];

      // Geocode all addresses, but keep track of failures
      type GeocodeResultType = { success: boolean; result: google.maps.GeocoderResult | null; pkg: typeof deliveryPackages[number] };
      const geocodeResults = await Promise.all(deliveryPackages.map(async pkg => {
        return new Promise<GeocodeResultType>(resolve => {
          if (!pkg) {
            resolve({ success: false, result: null, pkg });
            return;
          }
          geocoder.geocode({ address: pkg.address }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
              resolve({ success: true, result: results[0], pkg });
            } else {
              resolve({ success: false, result: null, pkg });
            }
          });
        });
      })) as GeocodeResultType[];

      // Only use successful geocodes for waypoints
      const validLocations = geocodeResults.filter(r => r.success).map(r => r.result!);
      const waypoints = validLocations.map(loc => ({ location: loc.geometry.location, stopover: true }));

      // If a stop was just delivered, start route from its geocoded location
      let routeOrigin = WAREHOUSE_LOCATION;
      // Find the most recently delivered package (if any)
      const deliveredPkgs = packages.filter(pkg => pkg.status?.toUpperCase() === 'DELIVERED');
      if (deliveredPkgs.length > 0) {
        // Geocode the address of the last delivered package
        const lastDelivered = deliveredPkgs[deliveredPkgs.length - 1];
        await new Promise<void>((resolve) => {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ address: lastDelivered.address }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
              const loc = results[0].geometry.location;
              routeOrigin = { lat: loc.lat(), lng: loc.lng() };
            }
            resolve();
          });
        });
      } else {
        routeOrigin = WAREHOUSE_LOCATION;
      }
      const toDeliveries: google.maps.DirectionsRequest = {
        origin: routeOrigin,
        destination: waypoints.length > 0 ? waypoints[waypoints.length - 1].location : routeOrigin,
        waypoints: waypoints.length > 1 ? waypoints.slice(0, -1) : [],
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true,
      };
      directionsService.route(toDeliveries, (result, status) => {
        let markerNum = 1;
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRendererRef.current?.setDirections(result);
          try {
            // Use waypoint_order to reorder valid markers
            const waypointOrder = result.routes[0].waypoint_order || [];
            const markerOrder = waypointOrder.length === 0 ? [0] : waypointOrder;
            // Map valid geocodeResults indices to optimized order
            const validIndices = geocodeResults.map((r, idx) => r.success ? idx : null).filter(idx => idx !== null) as number[];
            // Place numbered markers for all selected packages in selection order
            for (let i = 0; i < geocodeResults.length; i++) {
              const r = geocodeResults[i];
              if (r.success && r.pkg && markerOrder.length > 0) {
                // Find optimized order index for this valid location
                const orderIdx = markerOrder.indexOf(validIndices.indexOf(i));
                const loc = r.result!.geometry.location;
                const marker = new google.maps.Marker({
                  map: mapInstanceRef.current!,
                  position: loc,
                  title: `Stop ${markerNum}: ${r.pkg.address}`,
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r="14" fill="#2563eb" stroke="#ffffff" stroke-width="3"/>
                        <text x="16" y="21" text-anchor="middle" fill="#ffffff" font-size="16" font-weight="bold">${markerNum}</text>
                      </svg>
                    `),
                    scaledSize: new google.maps.Size(32, 32),
                    anchor: new google.maps.Point(16, 16)
                  }
                });
                packageMarkersRef.current.push(marker);
              } else if (!r.success && r.pkg) {
                // Failed geocode: show numbered warning marker at warehouse
                const marker = new google.maps.Marker({
                  map: mapInstanceRef.current!,
                  position: WAREHOUSE_LOCATION,
                  title: `Stop ${markerNum} (Address not found): ${r.pkg.address}`,
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r="14" fill="#f59e42" stroke="#ffffff" stroke-width="3"/>
                        <text x="16" y="21" text-anchor="middle" fill="#ffffff" font-size="16" font-weight="bold">${markerNum}!</text>
                      </svg>
                    `),
                    scaledSize: new google.maps.Size(32, 32),
                    anchor: new google.maps.Point(16, 16)
                  }
                });
                packageMarkersRef.current.push(marker);
              }
              markerNum++;
            }
            // Fit bounds to route
            const bounds = new google.maps.LatLngBounds();
            if (result.routes && result.routes[0]) {
              bounds.union(result.routes[0].bounds);
            }
            mapInstanceRef.current?.fitBounds(bounds);
          } catch {
            // ignore bounding errors
          }
        } else {
          // Even if route fails, show all markers for selected packages
          for (let i = 0; i < geocodeResults.length; i++) {
            const r = geocodeResults[i];
            if (r.pkg) {
              if (r.success) {
                const loc = r.result!.geometry.location;
                const marker = new google.maps.Marker({
                  map: mapInstanceRef.current!,
                  position: loc,
                  title: `Stop ${i + 1}: ${r.pkg.address}`,
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r="14" fill="#2563eb" stroke="#ffffff" stroke-width="3"/>
                        <text x="16" y="21" text-anchor="middle" fill="#ffffff" font-size="16" font-weight="bold">${i + 1}</text>
                      </svg>
                    `),
                    scaledSize: new google.maps.Size(32, 32),
                    anchor: new google.maps.Point(16, 16)
                  }
                });
                packageMarkersRef.current.push(marker);
              } else {
                const marker = new google.maps.Marker({
                  map: mapInstanceRef.current!,
                  position: WAREHOUSE_LOCATION,
                  title: `Stop ${i + 1} (Address not found): ${r.pkg.address}`,
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r="14" fill="#f59e42" stroke="#ffffff" stroke-width="3"/>
                        <text x="16" y="21" text-anchor="middle" fill="#ffffff" font-size="16" font-weight="bold">${i + 1}!</text>
                      </svg>
                    `),
                    scaledSize: new google.maps.Size(32, 32),
                    anchor: new google.maps.Point(16, 16)
                  }
                });
                packageMarkersRef.current.push(marker);
              }
            }
          }
        }
      });
    }
  }, [currentLocation, apiLoaded, selectedPackages, packages, inTransitPackages, isHeadingToWarehouse]);

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
          strokeColor: "#059669", // Solid green color (initial)
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
    if (!mapInstanceRef.current || !driverMarkerRef.current || !apiLoaded) {
      return;
    }
    if (isHeadingToWarehouse) {
      // Show warehouse route only before pickup
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      directionsRendererRef.current = new google.maps.DirectionsRenderer({
        map: mapInstanceRef.current,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: "#065f46", // dark green
          strokeWeight: 5,
          strokeOpacity: 0.9,
        },
      });
      const directionsService = new google.maps.DirectionsService();
      const toWarehouse = {
        origin: currentLocation,
        destination: WAREHOUSE_LOCATION,
        travelMode: google.maps.TravelMode.DRIVING,
      };
      directionsService.route(toWarehouse, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRendererRef.current?.setDirections(result);
          if (result.routes && result.routes[0] && result.routes[0].bounds) {
            mapInstanceRef.current?.fitBounds(result.routes[0].bounds);
          }
        } else {
          console.error("Driver → Warehouse route failed", status);
        }
      });
    } else {
      // After pickup, always show delivery route
      calculateOptimizedRoute();

      // If all selected packages are delivered, clear routes and markers
      if (
        selectedPackages.length > 0 &&
        selectedPackages.every(id => {
          const pkg = packages.find(p => p.id === id);
          return pkg && pkg.status && pkg.status.toUpperCase() === 'DELIVERED';
        })
      ) {
        // Remove all package markers (stop number tags)
        if (packageMarkersRef.current && packageMarkersRef.current.length > 0) {
          packageMarkersRef.current.forEach(marker => {
            if (marker) marker.setMap(null);
          });
          packageMarkersRef.current = [];
        }
        // Also remove warehouse marker if needed
        if (warehouseMarkerRef.current) {
          warehouseMarkerRef.current.setMap(null);
        }
        // Clear directions
        if (directionsRendererRef.current) {
          directionsRendererRef.current.setMap(null);
        }
        if (warehouseToDeliveryRendererRef.current) {
          warehouseToDeliveryRendererRef.current.setMap(null);
        }
      }
    }
  }, [currentLocation, apiLoaded, selectedPackages, packages, isHeadingToWarehouse, calculateOptimizedRoute]);

  return (
    <div>
      {/* Route Steps */}
      {/* {routeInfo && routeInfo.routeSteps.length > 0 && ( */}
      {/*
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h4 className="font-semibold text-slate-900 mb-3">Delivery Sequence</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
          </div>
        </div>
      */}
      <div>
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
    </div>
  );
};
