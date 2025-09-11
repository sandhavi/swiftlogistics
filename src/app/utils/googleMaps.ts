// app/utils/googleMaps.ts

declare global {
  interface Window {
    google: typeof google;
  }
}

let isLoadingAPI = false;
let apiLoadPromise: Promise<typeof google> | null = null;

export const loadGoogleMapsAPI = (): Promise<typeof google> => {
  // Return existing promise if API is already loading
  if (apiLoadPromise) {
    return apiLoadPromise;
  }

  // Return existing Google object if already loaded
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google);
  }

  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error('Google Maps API key is missing'));
  }

  // Create new loading promise
  apiLoadPromise = new Promise((resolve, reject) => {
    if (!isLoadingAPI) {
      isLoadingAPI = true;
      const script = document.createElement('script');
      const id = 'google-maps-script';

      // Check if script already exists
      if (document.getElementById(id)) {
        isLoadingAPI = false;
        reject(new Error('Google Maps script tag already exists'));
        return;
      }

      script.id = id;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&v=weekly`;
      script.async = true;
      script.defer = true;

      script.addEventListener('load', () => {
        isLoadingAPI = false;
        if (window.google && window.google.maps) {
          resolve(window.google);
        } else {
          reject(new Error('Google Maps failed to load'));
        }
      });

      script.addEventListener('error', () => {
        isLoadingAPI = false;
        apiLoadPromise = null;
        reject(new Error('Failed to load Google Maps script'));
      });

      document.head.appendChild(script);
    }
  });

  return apiLoadPromise;
};

/**
 * Geocodes an address to coordinates
 * @param address The address to geocode
 * @returns Promise with coordinates
 */
export const geocodeAddress = async (address: string): Promise<google.maps.LatLng | null> => {
  try {
    const google = await loadGoogleMapsAPI();
    const geocoder = new google.maps.Geocoder();
    
    return new Promise((resolve, reject) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          resolve(results[0].geometry.location);
        } else {
          console.warn(`Geocoding failed for address "${address}":`, status);
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
};

/**
 * Calculates distance between two coordinates
 * @param origin Starting point
 * @param destination End point
 * @returns Distance in meters
 */
export const calculateDistance = (
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral
): number => {
  if (!window.google || !window.google.maps) {
    return 0;
  }

  const originLatLng = new google.maps.LatLng(origin.lat, origin.lng);
  const destinationLatLng = new google.maps.LatLng(destination.lat, destination.lng);
  
  return google.maps.geometry.spherical.computeDistanceBetween(originLatLng, destinationLatLng);
};