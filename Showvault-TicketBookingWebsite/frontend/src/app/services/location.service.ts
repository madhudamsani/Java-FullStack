import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private readonly geocodingApiUrl = 'https://maps.googleapis.com/maps/api/geocode/json';

  constructor(private http: HttpClient) {}

  geocodeAddress(address: string): Observable<GeoLocation> {
    // For development, return mock data if API key is not set
    if (!environment.googleMapsApiKey) {
      console.warn('No Google Maps API key found, using mock geocoding data');
      return of(this.getMockGeocodingResult(address));
    }

    return this.http.get<any>(`${this.geocodingApiUrl}`, {
      params: {
        address: address,
        key: environment.googleMapsApiKey
      }
    }).pipe(
      map(response => {
        if (response.status === 'OK' && response.results.length > 0) {
          const result = response.results[0];
          const location = result.geometry.location;
          const components = result.address_components;

          return {
            lat: location.lat,
            lng: location.lng,
            address: result.formatted_address,
            city: this.extractAddressComponent(components, 'locality'),
            state: this.extractAddressComponent(components, 'administrative_area_level_1'),
            country: this.extractAddressComponent(components, 'country')
          };
        }
        throw new Error('No results found');
      }),
      catchError(error => {
        console.error('Geocoding error:', error);
        return throwError(() => new Error('Failed to geocode address'));
      })
    );
  }

  reverseGeocode(lat: number, lng: number): Observable<GeoLocation> {
    if (!environment.googleMapsApiKey) {
      console.warn('No Google Maps API key found, using mock reverse geocoding data');
      return of(this.getMockReverseGeocodingResult(lat, lng));
    }

    return this.http.get<any>(`${this.geocodingApiUrl}`, {
      params: {
        latlng: `${lat},${lng}`,
        key: environment.googleMapsApiKey
      }
    }).pipe(
      map(response => {
        if (response.status === 'OK' && response.results.length > 0) {
          const result = response.results[0];
          const components = result.address_components;

          return {
            lat: lat,
            lng: lng,
            address: result.formatted_address,
            city: this.extractAddressComponent(components, 'locality'),
            state: this.extractAddressComponent(components, 'administrative_area_level_1'),
            country: this.extractAddressComponent(components, 'country')
          };
        }
        throw new Error('No results found');
      }),
      catchError(error => {
        console.error('Reverse geocoding error:', error);
        return throwError(() => new Error('Failed to reverse geocode location'));
      })
    );
  }

  private extractAddressComponent(components: any[], type: string): string {
    const component = components.find(comp => comp.types.includes(type));
    return component ? component.long_name : '';
  }

  private getMockGeocodingResult(address: string): GeoLocation {
    // Return mock data for development
    return {
      lat: 40.7128,
      lng: -74.0060,
      address: address,
      city: 'New York',
      state: 'NY',
      country: 'USA'
    };
  }

  private getMockReverseGeocodingResult(lat: number, lng: number): GeoLocation {
    return {
      lat: lat,
      lng: lng,
      address: '123 Broadway, New York, NY 10001',
      city: 'New York',
      state: 'NY',
      country: 'USA'
    };
  }
}