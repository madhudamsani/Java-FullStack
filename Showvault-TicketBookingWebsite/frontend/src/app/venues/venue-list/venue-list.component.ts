import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, Params, RouterModule } from '@angular/router';
import { VenueService } from '../../services/venue.service';
import { Venue } from '../../models/venue.model';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-venue-list',
  templateUrl: './venue-list.component.html',
  styleUrls: ['./venue-list.component.css'],
  imports: [FormsModule, CommonModule, RouterModule],
  standalone: true
})
export class VenueListComponent implements OnInit {
  venues: Venue[] = [];
  currentVenueId: number = 0;
  loading = false;
  error = '';
  cities: string[] = [];
  selectedCity: string = '';
  searchQuery: string = '';
  
  constructor(
    private venueService: VenueService,
    private router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loading = true;
    this.loadCities();
    
    // Check if there's a search query in the URL
    this.route.queryParams.subscribe((params: Params) => {
      if (params['search']) {
        this.searchQuery = params['search'];
        this.searchVenues();
      } else {
        this.loadVenues();
      }
    });
  }

  loadCities() {
    this.venueService.getAllCities().subscribe({
      next: (data) => {
        this.cities = data;
      },
      error: (err) => {
        console.error('Error loading cities:', err);
        this.error = 'Failed to load cities. Please try again later.';
      }
    });
  }

  loadVenues() {
    this.venueService.getAllVenues().subscribe({
      next: (data) => {
        this.venues = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading venues:', err);
        this.error = 'Failed to load theatres. Please try again later.';
        this.loading = false;
      }
    });
  }

  filterByCity(city: string) {
    this.loading = true;
    this.selectedCity = city;
    this.searchQuery = ''; // Clear search when filtering by city
    
    // Close dropdown after selection
    const dropdownElement = document.querySelector('.dropdown-menu.show');
    if (dropdownElement) {
      dropdownElement.classList.remove('show');
    }
    
    if (city) {
      this.venueService.getVenuesByCity(city).subscribe({
        next: (data) => {
          this.venues = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading venues by city:', err);
          this.error = 'Failed to load theatres for the selected city. Please try again later.';
          this.loading = false;
        }
      });
    } else {
      this.loadVenues();
    }
  }
  
  searchVenues() {
    if (!this.searchQuery.trim()) {
      // If search query is empty, reset to default view
      this.selectedCity = '';
      this.loadVenues();
      return;
    }
    
    this.loading = true;
    this.selectedCity = ''; // Clear city filter when searching
    
    this.venueService.searchVenues(this.searchQuery).subscribe({
      next: (data) => {
        this.venues = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error searching venues:', err);
        this.error = 'Failed to search theatres. Please try again later.';
        this.loading = false;
      }
    });
  }

  onSearchInput() {
    // Optional: Add debounced search functionality here if needed
    // For now, we'll keep the manual search trigger
  }

  clearSearch() {
    this.searchQuery = '';
    this.loadVenues();
  }

  clearAllFilters() {
    this.searchQuery = '';
    this.selectedCity = '';
    this.loadVenues();
  }

  trackByCity(index: number, city: string): string {
    return city;
  }

  viewVenueMovies(venueId: number) {
    this.router.navigate(['/venues', venueId, 'movies']);
  }

  deleteVenue(id: number) {
    this.venueService.deleteVenue(id).subscribe({
      next: () => this.venues = this.venues.filter(v => v.id !== id),
      error: (err) => console.error('Error deleting venue:', err)
    });
  }
  
  /**
   * Sanitize image URLs to prevent security issues and fix common URL problems
   * @param url The image URL to sanitize
   * @returns A safe URL string or null if the URL is invalid
   */
  sanitizeImageUrl(url: string | undefined): string | null {
    if (!url) return null;
    
    // Remove file:/// URLs which can't be loaded due to security restrictions
    if (url.startsWith('file:///')) {
      // Return a default venue image instead of null
      return 'assets/images/placeholder.png';
    }
    
    // Check for known problematic domains
    if (url.includes('assets-in.bmscdn.com')) {
      // For BookMyShow URLs that are failing, use a placeholder
      return 'assets/images/placeholder.png';
    }
    
    // Add https:// to URLs that are missing the protocol
    if (!url.startsWith('http://') && !url.startsWith('https://') && 
        (url.includes('.com/') || url.includes('.org/') || 
         url.includes('.net/') || url.includes('.io/'))) {
      url = 'https://' + url;
    }
    
    // Return the sanitized URL
    return url;
  }
}