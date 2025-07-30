import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ShowTypeMapping {
  frontend: string;
  backend: string;
  display: string;
  category: string;
}

@Injectable({
  providedIn: 'root'
})
export class ShowTypeService {
  private apiUrl = `${environment.apiUrl}/shows/types`;
  
  // Mapping for backward compatibility and better UX
  private typeMapping: ShowTypeMapping[] = [
    { frontend: 'Movie', backend: 'Movie', display: 'Movie', category: 'movies' },
    { frontend: 'Theatrical', backend: 'Theatrical', display: 'Theatrical', category: 'theater' },
    { frontend: 'Concert', backend: 'Concert', display: 'Concert', category: 'concerts' },
    { frontend: 'Event', backend: 'Event', display: 'Event', category: 'events' },
    { frontend: 'Other', backend: 'Other', display: 'Other', category: 'other' }
  ];

  constructor(private http: HttpClient) {}

  /**
   * Get all show types from backend with fallback
   */
  getShowTypes(): Observable<string[]> {
    return this.http.get<string[]>(this.apiUrl).pipe(
      map(types => this.normalizeTypes(types)),
      catchError(() => {
        // Fallback to hardcoded types if API fails
        console.warn('Failed to fetch show types from API, using fallback');
        return of(this.getDefaultTypes());
      })
    );
  }

  /**
   * Get default show types (fallback)
   */
  getDefaultTypes(): string[] {
    return this.typeMapping.map(t => t.frontend);
  }

  /**
   * Normalize types from backend (handle Theater -> Theatrical conversion)
   */
  private normalizeTypes(backendTypes: string[]): string[] {
    return backendTypes.map(type => {
      // Handle backward compatibility: Theater -> Theatrical
      if (type === 'Theater') {
        return 'Theatrical';
      }
      return type;
    });
  }

  /**
   * Convert frontend type to backend type
   */
  toBackendType(frontendType: string): string {
    const mapping = this.typeMapping.find(t => t.frontend === frontendType);
    return mapping ? mapping.backend : frontendType;
  }

  /**
   * Convert backend type to frontend type
   */
  toFrontendType(backendType: string): string {
    // Handle backward compatibility
    if (backendType === 'Theater') {
      return 'Theatrical';
    }
    
    const mapping = this.typeMapping.find(t => t.backend === backendType);
    return mapping ? mapping.frontend : backendType;
  }

  /**
   * Get display name for a type
   */
  getDisplayName(type: string): string {
    const mapping = this.typeMapping.find(t => 
      t.frontend === type || t.backend === type
    );
    return mapping ? mapping.display : type;
  }

  /**
   * Get category for a type
   */
  getCategory(type: string): string {
    const mapping = this.typeMapping.find(t => 
      t.frontend === type || t.backend === type
    );
    return mapping ? mapping.category : 'other';
  }

  /**
   * Check if type is valid
   */
  isValidType(type: string): boolean {
    return this.typeMapping.some(t => 
      t.frontend === type || t.backend === type || type === 'Theater'
    );
  }

  /**
   * Get type mapping for a specific type
   */
  getTypeMapping(type: string): ShowTypeMapping | undefined {
    return this.typeMapping.find(t => 
      t.frontend === type || t.backend === type
    );
  }

  /**
   * Get all type mappings
   */
  getAllTypeMappings(): ShowTypeMapping[] {
    return [...this.typeMapping];
  }
}