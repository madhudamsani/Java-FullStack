import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VenueService } from '../../services/venue.service';
import { Venue, VenueSeatCategory } from '../../models/venue.model';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-venue-form',
  templateUrl: './venue-form.component.html',
  styleUrls: ['./venue-form.component.css']
})
export class VenueFormComponent implements OnInit {
  venueForm: FormGroup;
  isEditMode = false;
  currentVenueId: number = 0;
  seatCategories: VenueSeatCategory[] = [];

  constructor(
    private fb: FormBuilder,
    private venueService: VenueService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.venueForm = this.fb.group({
      name: ['', Validators.required],
      location: ['', Validators.required],
      capacity: ['', [Validators.required, Validators.min(1)]],
      seatCategories: this.fb.array([])
    });
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.currentVenueId = params['id'];
        this.loadVenueDetails();
      }
    });
  }

  loadVenueDetails() {
    this.venueService.getVenueById(this.currentVenueId).subscribe(venue => {
      this.venueForm.patchValue(venue);
      this.seatCategories = venue.seatCategories || [];
    });
  }

  onSubmit() {
    if (this.venueForm.valid) {
      const venueData: Venue = {
        ...this.venueForm.value,
        name: this.venueForm.value.name,
        city: this.venueForm.value.location || '',
        country: '',  // Required by the model but not in the form
        capacity: this.venueForm.value.capacity,
        seatCategories: this.seatCategories // Include seat categories
      };

      if (this.isEditMode) {
        this.venueService.updateVenue(this.currentVenueId, venueData)
          .subscribe(() => this.router.navigate(['/venues']));
      } else {
        this.venueService.createVenue(venueData)
          .subscribe(() => this.router.navigate(['/venues']));
      }
    }
  }

  addSeatCategory() {
    this.seatCategories.push({ type: '', capacity: 0, price: 0 });
  }

  removeSeatCategory(index: number) {
    this.seatCategories.splice(index, 1);
  }
}