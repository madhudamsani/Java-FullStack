import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';



interface AdminFeature {
  name: string;
  icon: string;
  route: string;
  description: string;
  category: string;
}

@Component({
  selector: 'app-admin-header',
  templateUrl: './admin-header.component.html',
  styleUrls: ['./admin-header.component.css']
})
export class AdminHeaderComponent implements OnInit, OnDestroy {
  @Output() toggleSidebarEvent = new EventEmitter<void>();
  userName: string = 'Administrator';
  userRole: string = 'System Admin';
  searchControl = new FormControl('');
  searchResults: AdminFeature[] = [];
  showSearchResults: boolean = false;
  isSearching: boolean = false;
  

  
  // Subject for unsubscribing from observables
  private destroy$ = new Subject<void>();
  
  // Admin features for search
  adminFeatures: AdminFeature[] = [
    { name: 'Dashboard', icon: 'bi-speedometer2', route: '/admin/dashboard', description: 'Overview of system performance', category: 'Main' },
    { name: 'User Management', icon: 'bi-people', route: '/admin/users', description: 'Manage user accounts and permissions', category: 'Management' },
    { name: 'Booking Management', icon: 'bi-ticket-perforated', route: '/admin/bookings', description: 'View and manage bookings', category: 'Management' },
    { name: 'Show Management', icon: 'bi-film', route: '/admin/shows', description: 'Manage shows and events', category: 'Management' },
    { name: 'Reports', icon: 'bi-bar-chart', route: '/admin/reports', description: 'View sales and performance reports', category: 'Analytics' },
    { name: 'System Health', icon: 'bi-heart-pulse', route: '/admin/system-health', description: 'Monitor system performance', category: 'System' },
    { name: 'Platform Settings', icon: 'bi-gear', route: '/admin/settings', description: 'Configure platform settings', category: 'System' },

  ];
  
  constructor(
    private router: Router,
    private authService: AuthService,

  ) { }

  ngOnInit(): void {
    // Get user info from auth service if available
    // Use getCurrentUserSync for synchronous access to user data
    const user = this.authService.getCurrentUserSync();
    if (user) {
      if (user.firstName) {
        this.userName = `${user.firstName} ${user.lastName || ''}`;
      } else if (user.name) {
        this.userName = user.name;
      } else if (user.username) {
        this.userName = user.username;
      }
      
      this.userRole = 'System Admin';
    }

    // Setup search with debounce
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm || '');
    });
    

  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    this.toggleSidebarEvent.emit();
  }
  
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  performSearch(searchTerm: string): void {
    if (!searchTerm.trim()) {
      this.searchResults = [];
      this.showSearchResults = false;
      return;
    }

    this.isSearching = true;
    
    // Filter admin features based on search term
    const term = searchTerm.toLowerCase();
    this.searchResults = this.adminFeatures.filter(feature => 
      feature.name.toLowerCase().includes(term) || 
      feature.description.toLowerCase().includes(term) ||
      feature.category.toLowerCase().includes(term)
    );
    
    this.showSearchResults = true;
    this.isSearching = false;
  }

  navigateToFeature(route: string): void {
    this.router.navigate([route]);
    this.searchControl.setValue('');
    this.showSearchResults = false;
  }

  hideSearchResults(): void {
    // Small delay to allow click events to register
    setTimeout(() => {
      this.showSearchResults = false;
    }, 200);
  }

  focusSearch(): void {
    if (this.searchControl.value) {
      this.showSearchResults = true;
    }
  }
  

}