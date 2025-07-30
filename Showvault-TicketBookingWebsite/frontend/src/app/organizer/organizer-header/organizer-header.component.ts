import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface OrganizerFeature {
  name: string;
  icon: string;
  route: string;
  description: string;
  category: string;
}

@Component({
  selector: 'app-organizer-header',
  templateUrl: './organizer-header.component.html',
  styleUrls: ['./organizer-header.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule]
})
export class OrganizerHeaderComponent implements OnInit {
  @Output() toggleSidebarEvent = new EventEmitter<void>();
  userName: string = 'Organizer';
  userRole: string = 'Event Manager';
  searchControl = new FormControl('');
  searchResults: OrganizerFeature[] = [];
  showSearchResults: boolean = false;
  isSearching: boolean = false;
  
  // Organizer features for search
  organizerFeatures: OrganizerFeature[] = [
    { name: 'Dashboard', icon: 'bi-speedometer2', route: '/organizer/dashboard', description: 'Overview of your shows and performance', category: 'Main' },
    { name: 'Shows Management', icon: 'bi-film', route: '/organizer/dashboard', description: 'Manage your shows and events', category: 'Management' },
    { name: 'Create Show', icon: 'bi-plus-circle', route: '/organizer/shows/create', description: 'Create a new show or event', category: 'Management' },
    { name: 'Sales Report', icon: 'bi-graph-up', route: '/organizer/sales-report', description: 'View sales and revenue reports', category: 'Analytics' },
    { name: 'Audience Analytics', icon: 'bi-people', route: '/organizer/audience-analytics', description: 'Analyze audience demographics and behavior', category: 'Analytics' },
    { name: 'Promotions', icon: 'bi-megaphone', route: '/organizer/promotions', description: 'Create and manage promotional offers', category: 'Management' },
    { name: 'Customer Messages', icon: 'bi-chat-dots', route: '/organizer/customer-messages', description: 'View and respond to customer inquiries', category: 'Communication' }
  ];
  
  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Get user info from auth service if available
    const user = this.authService.getCurrentUserSync();
    if (user) {
      if (user.firstName) {
        this.userName = `${user.firstName} ${user.lastName || ''}`;
      } else if (user.name) {
        this.userName = user.name;
      } else if (user.username) {
        this.userName = user.username;
      }
      
      this.userRole = 'Event Organizer';
    }

    // Setup search with debounce
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm || '');
    });
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
    
    // Filter organizer features based on search term
    const term = searchTerm.toLowerCase();
    this.searchResults = this.organizerFeatures.filter(feature => 
      feature.name.toLowerCase().includes(term) || 
      feature.description.toLowerCase().includes(term) ||
      feature.category.toLowerCase().includes(term)
    );
    
    this.showSearchResults = true;
    this.isSearching = false;
  }

  navigateToFeature(route: string): void {
    // Use setTimeout to ensure this happens after the blur event
    setTimeout(() => {
      this.router.navigate([route]);
      this.searchControl.setValue('');
      this.showSearchResults = false;
    }, 0);
  }

  hideSearchResults(): void {
    // Longer delay to allow click events to register
    setTimeout(() => {
      this.showSearchResults = false;
    }, 300);
  }

  focusSearch(): void {
    if (this.searchControl.value) {
      this.showSearchResults = true;
    }
  }
}