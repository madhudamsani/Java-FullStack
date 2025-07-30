export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  googleMapsApiKey: '', // Add your Google Maps API key here for development
  stripePublishableKey: '', // Add your Stripe publishable key here for development
  showMockData: false, // Set to false to use real backend data
  cacheTimeout: 30000, // 30 seconds cache timeout
  maxSeatsPerBooking: 10,
  defaultTheaterLocation: {
    lat: 28.6139,
    lng: 77.2090,
    city: 'New Delhi'
  },
  omdbApiKey: '3e974fca', // OMDb API key (free tier)
  useDefaultImages: false, // Always use OMDb API for movie images
  currency: 'INR', // Default currency for the application
  
  // Enhanced image fallback configuration
  imageConfig: {
    enableOmdbFallback: true, // Enable OMDb API as fallback for movies
    enableLocalAssets: true, // Enable local asset fallback
    enableDefaultImages: true, // Enable default category images
    cacheImages: true, // Cache image validation results
    imageCacheTimeout: 300000, // 5 minutes cache for image validation
    retryFailedImages: true, // Retry failed image loads
    maxRetries: 2, // Maximum retry attempts for failed images
    fallbackOrder: ['existing', 'omdb', 'local', 'default'] // Order of fallback attempts
  }
};