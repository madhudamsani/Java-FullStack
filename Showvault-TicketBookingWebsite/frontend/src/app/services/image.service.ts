import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private defaultImages: Record<string, string> = {
    // General show image
    show: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?q=80&w=600&auto=format&fit=crop',
    
    // Movie related images
    movie: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop',
    action: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?q=80&w=600&auto=format&fit=crop',
    comedy: 'https://images.unsplash.com/photo-1543584756-31dc18f1c41d?q=80&w=600&auto=format&fit=crop',
    drama: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=600&auto=format&fit=crop',
    horror: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=600&auto=format&fit=crop',
    scifi: 'https://images.unsplash.com/photo-1506901437675-cde80ff9c746?q=80&w=600&auto=format&fit=crop',
    
    // Concert related images
    concert: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=600&auto=format&fit=crop',
    rock: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=600&auto=format&fit=crop',
    pop: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=600&auto=format&fit=crop',
    jazz: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?q=80&w=600&auto=format&fit=crop',
    classical: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=600&auto=format&fit=crop',
    
    // Theater related images
    theater: 'https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=600&auto=format&fit=crop',
    musical: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=600&auto=format&fit=crop',
    play: 'https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=600&auto=format&fit=crop',
    ballet: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?q=80&w=600&auto=format&fit=crop',
    opera: 'https://images.unsplash.com/photo-1522776851755-3125a4c71c8c?q=80&w=600&auto=format&fit=crop',
    
    // Event related images
    event: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=600&auto=format&fit=crop',
    festival: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6a3?q=80&w=600&auto=format&fit=crop',
    conference: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=600&auto=format&fit=crop',
    exhibition: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?q=80&w=600&auto=format&fit=crop',
    
    // User related images
    user: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=600&auto=format&fit=crop',
    profile: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=600&auto=format&fit=crop',
    
    // Venue related images
    venue: 'https://images.unsplash.com/photo-1578944032637-f09897c5233d?q=80&w=600&auto=format&fit=crop',
    stadium: 'https://images.unsplash.com/photo-1577224682124-d0357ebb1e2e?q=80&w=600&auto=format&fit=crop',
    cinema: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=600&auto=format&fit=crop',
    hall: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=600&auto=format&fit=crop'
  };
  
  // OMDb API configuration (Open Movie Database)
  private omdbApiUrl = 'https://www.omdbapi.com/';
  private omdbApiKey = environment.omdbApiKey || '3e974fca'; // Default API key (free tier)
  private useDefaultImages = false; // Always use OMDb API for images
  private omdbApiEnabled = true; // Always enable OMDb API
  
  // Trusted image domains that don't need special handling
  private trustedImageDomains = [
    'upload.wikimedia.org',
    'images.unsplash.com',
    'm.media-amazon.com',
    'image.tmdb.org'
  ];
  
  // Known problematic domains that should be avoided
  private problematicDomains = [
    'assets-in.bmscdn.com', // BookMyShow images that are returning 404
    'file:///'             // Local file URLs that browsers block
  ];
  
  constructor(private http: HttpClient) { }

  /**
   * Get image URL with fallback to appropriate default image
   * @param imageUrl The original image URL
   * @param type The type of content (show, movie, concert, etc.)
   * @param subType Optional subtype for more specific images (action, rock, ballet, etc.)
   * @param title Optional title for searching specific content images
   * @returns A valid image URL
   */
  getImageUrl(imageUrl: string | undefined | null, type: string = 'show', subType: string = '', title: string = ''): string {
    // Check if we have a valid image URL
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
      // Check for problematic domains first
      if (this.problematicDomains.some(domain => imageUrl!.includes(domain))) {
        if (!environment.production) {
          console.debug(`Detected problematic image domain in URL: ${imageUrl}. Using default image.`);
        }
        // Skip to default image selection below
      } else {
        // If the URL is already a full URL (starts with http or https), return it
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          // Check if the URL is from a trusted domain
          if (this.trustedImageDomains.some(domain => imageUrl!.includes(domain))) {
            return imageUrl;
          }
          
          // For other domains, log a warning but still return the URL
          console.warn(`Image from untrusted domain: ${imageUrl}`);
          return imageUrl;
        }
        
        // If it's a relative path and starts with assets, return it as is
        if (imageUrl.startsWith('assets/')) {
          return imageUrl;
        }
        
        // Check if it's a domain without protocol (like images.unsplash.com/...)
        if (imageUrl.includes('.com/') || imageUrl.includes('.org/') || 
            imageUrl.includes('.net/') || imageUrl.includes('.io/')) {
          // Skip known problematic domains even without protocol
          if (this.problematicDomains.some(domain => 
              imageUrl!.includes(domain.replace('https://', '').replace('http://', '')))) {
            if (!environment.production) {
              console.debug(`Detected problematic domain without protocol: ${imageUrl}. Using default image.`);
            }
            // Skip to default image selection below
          } else {
            return `https://${imageUrl}`;
          }
        } else {
          // If it's a relative path and doesn't start with a slash, add one
          if (!imageUrl.startsWith('/')) {
            imageUrl = '/' + imageUrl;
          }
          
          // Otherwise, assume it's a relative path and convert to full URL
          // This would be replaced with your actual API base URL in production
          return `https://images.unsplash.com${imageUrl}`;
        }
      }
    }
    
    // Process types to lowercase for comparison
    const lowerType = type ? type.toLowerCase() : 'show';
    const lowerSubType = subType ? subType.toLowerCase() : '';
    
    // For movies with a title, try to get a specific movie poster from OMDb
    // This is a synchronous method, so we return a default and let the component
    // use getSpecificMovieImage() for the actual OMDb lookup
    if ((lowerType === 'movie' || lowerType === 'film' || lowerType === 'cinema') && 
        title && title.trim() !== '' && !this.useDefaultImages) {
      // Return movie default for now, but signal that OMDb should be used
      if (!environment.production) {
        console.debug(`Movie detected with title "${title}". Use getSpecificMovieImage() for OMDb lookup.`);
      }
      return this.defaultImages['movie'];
    }
    
    // Try to find a specific image based on subtype first
    if (lowerSubType && this.defaultImages[lowerSubType]) {
      return this.defaultImages[lowerSubType];
    }
    
    // Main category mapping with fallbacks
    switch (lowerType) {
      case 'movie':
      case 'film':
      case 'cinema':
        return this.defaultImages['movie'];
        
      case 'action':
      case 'adventure':
        return this.defaultImages['action'];
        
      case 'comedy':
        return this.defaultImages['comedy'];
        
      case 'drama':
        return this.defaultImages['drama'];
        
      case 'horror':
      case 'thriller':
        return this.defaultImages['horror'];
        
      case 'sci-fi':
      case 'scifi':
      case 'science fiction':
        return this.defaultImages['scifi'];
        
      case 'concert':
      case 'music':
        return this.defaultImages['concert'];
        
      case 'rock':
      case 'metal':
        return this.defaultImages['rock'];
        
      case 'pop':
        return this.defaultImages['pop'];
        
      case 'jazz':
      case 'blues':
        return this.defaultImages['jazz'];
        
      case 'classical':
      case 'orchestra':
        return this.defaultImages['classical'];
        
      case 'theater':
      case 'theatre':
        return this.defaultImages['theater'];
        
      case 'musical':
        return this.defaultImages['musical'];
        
      case 'play':
        return this.defaultImages['play'];
        
      case 'ballet':
      case 'dance':
        return this.defaultImages['ballet'];
        
      case 'opera':
        return this.defaultImages['opera'];
        
      case 'event':
        return this.defaultImages['event'];
        
      case 'festival':
        return this.defaultImages['festival'];
        
      case 'conference':
      case 'meeting':
        return this.defaultImages['conference'];
        
      case 'exhibition':
      case 'expo':
        return this.defaultImages['exhibition'];
        
      case 'user':
      case 'profile':
        return this.defaultImages['user'];
        
      case 'venue':
        return this.defaultImages['venue'];
        
      case 'stadium':
      case 'arena':
        return this.defaultImages['stadium'];
        
      case 'cinema':
      case 'theater hall':
        return this.defaultImages['cinema'];
        
      case 'hall':
      case 'auditorium':
        return this.defaultImages['hall'];
        
      default:
        return this.defaultImages['show'];
    }
  }
  
  /**
   * Check if an image URL is valid and accessible
   * @param url The image URL to check
   * @returns Observable with boolean indicating if the image is valid
   */
  isImageValid(url: string): Observable<boolean> {
    return new Observable<boolean>(observer => {
      if (!url || url === 'N/A' || url === '') {
        observer.next(false);
        observer.complete();
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        observer.next(true);
        observer.complete();
      };
      img.onerror = () => {
        observer.next(false);
        observer.complete();
      };
      img.src = url;
    });
  }
  
  /**
   * Search for a movie image by title using OMDb API
   * @param title The movie title to search for
   * @returns Observable with the movie poster URL or null if not found
   */
  searchMovieImage(title: string): Observable<string | null> {
    // Always try to use the OMDB API
    if (!environment.production) {
      console.debug(`Searching for image for "${title}" via OMDb API`);
    }
    
    // Clean up the title for better search results
    const cleanTitle = title.trim().replace(/[^\w\s]/gi, '');
    
    // Make API request to OMDb
    return this.http.get(`${this.omdbApiUrl}?apikey=${this.omdbApiKey}&t=${encodeURIComponent(cleanTitle)}&plot=short&r=json`).pipe(
      map((response: any) => {
        if (response && response.Response === 'True' && response.Poster && response.Poster !== 'N/A') {
          if (!environment.production) {
            console.debug(`Found poster for "${title}" via OMDb API: ${response.Poster}`);
          }
          return response.Poster;
        }
        if (!environment.production) {
          console.debug(`No poster found for "${title}" via OMDb API, using default`);
        }
        return null;
      }),
      catchError(error => {
        console.error(`Error fetching poster for "${title}" from OMDb API:`, error);
        return of(null);
      })
    );
  }
  
  /**
   * Get a specific movie image by title with enhanced fallback system
   * This method implements multiple fallback layers:
   * 1. Existing URL (if valid)
   * 2. OMDb API (for movies)
   * 3. Local assets (if available)
   * 4. Default images (categorized by type/genre)
   * @param title The movie title
   * @param type The content type (movie, show, etc.)
   * @param subType The content subtype (action, comedy, etc.)
   * @param existingUrl Optional existing URL to check first
   * @returns The image URL (either specific or default)
   */
  getSpecificMovieImage(title: string, type: string = 'movie', subType: string = '', existingUrl: string = ''): Observable<string> {
    if (!environment.production) {
      console.debug(`Getting specific movie image for "${title}" (type: ${type}) with enhanced fallback`);
    }
    
    // If useDefaultImages is true, skip OMDb API call and use existing URL or default
    if (this.useDefaultImages) {
      if (!environment.production) {
        console.debug(`Using default images (OMDb disabled). Skipping API call for "${title}"`);
      }
      return this.getImageWithFallbacks(existingUrl, type, subType, title, false);
    }
    
    // Check if the existing URL is already from OMDb (m.media-amazon.com)
    if (existingUrl && existingUrl.includes('m.media-amazon.com')) {
      if (!environment.production) {
        console.debug(`Existing URL for "${title}" is already from OMDb: ${existingUrl}`);
      }
      return of(existingUrl);
    }
    
    // Check if the existing URL is valid and accessible
    if (existingUrl && existingUrl.trim() !== '') {
      // Validate the existing URL
      return this.isImageValid(existingUrl).pipe(
        switchMap(isValid => {
          if (isValid) {
            if (!environment.production) {
              console.debug(`Using existing valid URL for "${title}": ${existingUrl}`);
            }
            return of(existingUrl);
          } else {
            if (!environment.production) {
              console.debug(`Existing URL for "${title}" is invalid, trying fallbacks`);
            }
            // If existing URL is invalid, try fallback chain
            return this.getImageWithFallbacks(existingUrl, type, subType, title, true);
          }
        }),
        catchError(error => {
          console.error(`Error validating image for "${title}":`, error);
          return this.getImageWithFallbacks(existingUrl, type, subType, title, true);
        })
      );
    }
    
    // No existing URL, try fallback chain
    return this.getImageWithFallbacks('', type, subType, title, true);
  }

  /**
   * Enhanced fallback system that tries multiple image sources
   * @param existingUrl The existing URL to validate first
   * @param type Content type
   * @param subType Content subtype
   * @param title Content title
   * @param tryOmdb Whether to try OMDb API
   * @returns Observable with the best available image URL
   */
  private getImageWithFallbacks(existingUrl: string, type: string, subType: string, title: string, tryOmdb: boolean): Observable<string> {
    // Step 1: Try OMDb API for movies (if enabled)
    if (tryOmdb && (type.toLowerCase() === 'movie' || type.toLowerCase() === 'film') && title && title.trim() !== '') {
      return this.searchMovieImage(title).pipe(
        switchMap(omdbUrl => {
          if (omdbUrl) {
            if (!environment.production) {
              console.debug(`Using OMDb image for "${title}": ${omdbUrl}`);
            }
            return of(omdbUrl);
          }
          // Step 2: Try local assets
          return this.tryLocalAssets(title, type, subType);
        }),
        catchError(error => {
          console.error(`Error fetching OMDb image for "${title}":`, error);
          // Step 2: Try local assets on OMDb error
          return this.tryLocalAssets(title, type, subType);
        })
      );
    }
    
    // Step 2: Try local assets directly (if OMDb not applicable)
    return this.tryLocalAssets(title, type, subType);
  }

  /**
   * Try to find local asset images based on title and type
   * @param title Content title
   * @param type Content type
   * @param subType Content subtype
   * @returns Observable with local asset URL or default image
   */
  private tryLocalAssets(title: string, type: string, subType: string): Observable<string> {
    // Check if we have local assets for popular titles
    const localAssetUrl = this.getLocalAssetUrl(title, type);
    
    if (localAssetUrl) {
      // Validate local asset exists
      return this.isImageValid(localAssetUrl).pipe(
        map(isValid => {
          if (isValid) {
            if (!environment.production) {
              console.debug(`Using local asset for "${title}": ${localAssetUrl}`);
            }
            return localAssetUrl;
          }
          // Step 3: Use default image
          const defaultImage = this.getImageUrl(null, type, subType);
          if (!environment.production) {
            console.debug(`Using default image for "${title}": ${defaultImage}`);
          }
          return defaultImage;
        }),
        catchError(() => {
          // Step 3: Use default image on error
          const defaultImage = this.getImageUrl(null, type, subType);
          if (!environment.production) {
            console.debug(`Using default image for "${title}" (local asset failed): ${defaultImage}`);
          }
          return of(defaultImage);
        })
      );
    }
    
    // Step 3: Use default image directly
    const defaultImage = this.getImageUrl(null, type, subType);
    if (!environment.production) {
      console.debug(`Using default image for "${title}": ${defaultImage}`);
    }
    return of(defaultImage);
  }

  /**
   * Get local asset URL for popular titles
   * @param title Content title
   * @param type Content type
   * @returns Local asset URL or null
   */
  private getLocalAssetUrl(title: string, type: string): string | null {
    // Normalize title for comparison
    const normalizedTitle = title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-');
    
    // Define local assets for popular content
    const localAssets: Record<string, string> = {
      // Popular movies
      'avengers-endgame': 'assets/images/movies/avengers-endgame.jpg',
      'spider-man-no-way-home': 'assets/images/movies/spider-man-no-way-home.jpg',
      'the-batman': 'assets/images/movies/the-batman.jpg',
      'top-gun-maverick': 'assets/images/movies/top-gun-maverick.jpg',
      
      // Popular shows/events
      'hamilton': 'assets/images/theater/hamilton.jpg',
      'the-lion-king': 'assets/images/theater/the-lion-king.jpg',
      'coldplay-concert': 'assets/images/concerts/coldplay.jpg',
      'ed-sheeran-tour': 'assets/images/concerts/ed-sheeran.jpg'
    };
    
    return localAssets[normalizedTitle] || null;
  }
}