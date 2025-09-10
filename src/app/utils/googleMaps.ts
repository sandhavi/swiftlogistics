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