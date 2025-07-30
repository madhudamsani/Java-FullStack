import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Promotion {
  id: number;
  code: string;
  name: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxUses: number;
  currentUses: number;
  startDate: string; // LocalDate from backend
  endDate: string; // LocalDate from backend
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  show?: any; // Show object if applicable
  createdBy?: any; // User object
  createdAt?: string;
  updatedAt?: string;
}

export interface PromotionValidationResponse {
  valid: boolean;
  promotion?: Promotion;
  message?: string;
}

export interface DiscountCalculationRequest {
  code: string;
  price: number;
}

export interface DiscountCalculationResponse {
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
}

@Injectable({
  providedIn: 'root'
})
export class PromotionService {
  private apiUrl = `${environment.apiUrl}/promotions`;

  private get httpOptions() {
    // Get the auth token from localStorage
    const token = localStorage.getItem('auth_token');
    
    // Create headers with content type and auth token if available
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
    
    return { headers };
  }

  constructor(private http: HttpClient) { }

  /**
   * Get all active promotions
   * @returns Observable of active promotions
   */
  getActivePromotions(): Observable<Promotion[]> {
    console.log('Fetching active promotions');
    
    // Explicitly set headers without authorization for public endpoint
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    // Use explicit headers to ensure no auth token is sent
    return this.http.get<Promotion[]>(`${this.apiUrl}/active`, { headers }).pipe(
      tap(promotions => {
        console.log('Active promotions fetched:', promotions);
      }),
      catchError(error => {
        console.error('Error fetching active promotions:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch active promotions'));
      })
    );
  }

  /**
   * Get all promotions (admin only)
   * @returns Observable of all promotions
   */
  getAllPromotions(): Observable<Promotion[]> {
    console.log('Fetching all promotions');
    
    return this.http.get<Promotion[]>(this.apiUrl, this.httpOptions).pipe(
      tap(promotions => {
        console.log('All promotions fetched:', promotions);
      }),
      catchError(error => {
        console.error('Error fetching all promotions:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch promotions'));
      })
    );
  }

  /**
   * Get promotion by ID
   * @param id Promotion ID
   * @returns Observable of promotion
   */
  getPromotionById(id: number): Observable<Promotion> {
    console.log('Fetching promotion by ID:', id);
    
    return this.http.get<Promotion>(`${this.apiUrl}/${id}`, this.httpOptions).pipe(
      tap(promotion => {
        console.log('Promotion fetched:', promotion);
      }),
      catchError(error => {
        console.error('Error fetching promotion:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch promotion'));
      })
    );
  }

  /**
   * Validate a promotion code
   * @param code Promotion code
   * @returns Observable of validation response
   */
  validatePromotionCode(code: string): Observable<PromotionValidationResponse> {
    console.log('Validating promotion code:', code);
    
    // Don't include auth headers for public promotion validation endpoint
    return this.http.get<PromotionValidationResponse>(`${this.apiUrl}/validate/${code}`).pipe(
      tap(response => {
        console.log('Promotion validation response:', response);
      }),
      catchError(error => {
        console.error('Error validating promotion code:', error);
        return throwError(() => new Error(error.message || 'Failed to validate promotion code'));
      })
    );
  }

  /**
   * Calculate discount for a promotion code and price
   * @param request Discount calculation request
   * @returns Observable of discount calculation response
   */
  calculateDiscount(request: DiscountCalculationRequest): Observable<DiscountCalculationResponse> {
    console.log('Calculating discount for:', request);
    
    // Don't include auth headers for public discount calculation endpoint
    return this.http.post<DiscountCalculationResponse>(`${this.apiUrl}/calculate`, request).pipe(
      tap(response => {
        console.log('Discount calculation response:', response);
      }),
      catchError(error => {
        console.error('Error calculating discount:', error);
        return throwError(() => new Error(error.message || 'Failed to calculate discount'));
      })
    );
  }

  /**
   * Create a new promotion (admin/organizer only)
   * @param promotion Promotion data
   * @returns Observable of created promotion
   */
  createPromotion(promotion: Partial<Promotion>): Observable<Promotion> {
    console.log('Creating promotion:', promotion);
    
    return this.http.post<Promotion>(this.apiUrl, promotion, this.httpOptions).pipe(
      tap(createdPromotion => {
        console.log('Promotion created:', createdPromotion);
      }),
      catchError(error => {
        console.error('Error creating promotion:', error);
        return throwError(() => new Error(error.message || 'Failed to create promotion'));
      })
    );
  }

  /**
   * Update a promotion (admin/organizer only)
   * @param id Promotion ID
   * @param promotion Updated promotion data
   * @returns Observable of updated promotion
   */
  updatePromotion(id: number, promotion: Partial<Promotion>): Observable<Promotion> {
    console.log('Updating promotion:', id, promotion);
    
    return this.http.put<Promotion>(`${this.apiUrl}/${id}`, promotion, this.httpOptions).pipe(
      tap(updatedPromotion => {
        console.log('Promotion updated:', updatedPromotion);
      }),
      catchError(error => {
        console.error('Error updating promotion:', error);
        return throwError(() => new Error(error.message || 'Failed to update promotion'));
      })
    );
  }

  /**
   * Delete a promotion (admin/organizer only)
   * @param id Promotion ID
   * @returns Observable of deletion result
   */
  deletePromotion(id: number): Observable<any> {
    console.log('Deleting promotion:', id);
    
    return this.http.delete(`${this.apiUrl}/${id}`, this.httpOptions).pipe(
      tap(() => {
        console.log('Promotion deleted successfully');
      }),
      catchError(error => {
        console.error('Error deleting promotion:', error);
        return throwError(() => new Error(error.message || 'Failed to delete promotion'));
      })
    );
  }

  /**
   * Generate a unique promotion code
   * @param length Code length (default: 8)
   * @returns Observable of generated code
   */
  generatePromotionCode(length: number = 8): Observable<string> {
    console.log('Generating promotion code with length:', length);
    
    return this.http.get<string>(`${this.apiUrl}/generate-code?length=${length}`, {
      ...this.httpOptions,
      responseType: 'text' as 'json'
    }).pipe(
      tap(code => {
        console.log('Generated promotion code:', code);
      }),
      catchError(error => {
        console.error('Error generating promotion code:', error);
        return throwError(() => new Error(error.message || 'Failed to generate promotion code'));
      })
    );
  }
}