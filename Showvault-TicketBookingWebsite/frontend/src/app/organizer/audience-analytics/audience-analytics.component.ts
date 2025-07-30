import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { OrganizerService } from '../../services/organizer.service';
import { ShowService } from '../../services/show.service';
import { Show } from '../../models/show.model';
import { AudienceDemographics } from '../../models/show.model';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-audience-analytics',
  templateUrl: './audience-analytics.component.html',
  styleUrls: ['./audience-analytics.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule]
})
export class AudienceAnalyticsComponent implements OnInit {
  demographics: AudienceDemographics | null = null;
  shows: Show[] = [];
  isLoading = true;
  error = '';
  success = '';
  
  filterForm: FormGroup;
  
  constructor(
    private organizerService: OrganizerService,
    private showService: ShowService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      showId: ['all']
    });
  }

  ngOnInit(): void {
    this.loadShows();
    this.loadDemographics();
    
    // Listen for show selection changes
    this.filterForm.get('showId')?.valueChanges.subscribe(value => {
      this.loadDemographics();
    });
  }

  loadShows(): void {
    this.showService.getMyShows().subscribe({
      next: (shows) => {
        this.shows = shows;
      },
      error: (error) => {
        console.error('Error loading shows:', error);
      }
    });
  }

  loadDemographics(): void {
    this.isLoading = true;
    
    const showId = this.filterForm.value.showId !== 'all' ? +this.filterForm.value.showId : undefined;
    
    this.organizerService.getAudienceDemographics(showId).subscribe({
      next: (demographics) => {
        this.demographics = demographics;
        this.isLoading = false;
        this.success = 'Audience demographics data loaded successfully!';
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.success = '';
        }, 3000);
      },
      error: (error) => {
        this.error = `Failed to load audience demographics: ${error.message}`;
        console.error('Error loading audience demographics:', error);
        this.isLoading = false;
      }
    });
  }

  getAgeGroupPercentage(ageGroup: string): number {
    if (!this.demographics || !this.demographics.ageGroups) return 0;
    return this.demographics.ageGroups[ageGroup] || 0;
  }

  getGenderPercentage(gender: string): number {
    if (!this.demographics || !this.demographics.genderDistribution) return 0;
    return this.demographics.genderDistribution[gender] || 0;
  }

  getLocationPercentage(location: string): number {
    if (!this.demographics || !this.demographics.locationDistribution) return 0;
    return this.demographics.locationDistribution[location] || 0;
  }

  getProgressBarClass(value: number): string {
    if (value >= 70) {
      return 'bg-success';
    } else if (value >= 40) {
      return 'bg-primary';
    } else if (value >= 20) {
      return 'bg-info';
    } else if (value >= 10) {
      return 'bg-warning';
    } else {
      return 'bg-danger';
    }
  }

  exportReport(format: 'pdf' | 'csv' | 'excel'): void {
    // In a real application, this would call a backend API to generate the report
    alert(`Exporting demographics report as ${format.toUpperCase()}... (Not implemented in this demo)`);
  }

  printReport(): void {
    window.print();
  }
}