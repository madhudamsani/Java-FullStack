import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ShowService } from '../../services/show.service';
import { PromotionService, Promotion as ServicePromotion } from '../../services/promotion.service';
import { CommonModule } from '@angular/common';
import { Promotion } from '../../models/show-interfaces.model';

// Using the shared Promotion interface from show-interfaces.model.ts

@Component({
  selector: 'app-promotions',
  templateUrl: './promotions.component.html',
  styleUrls: ['./promotions.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule]
})
export class PromotionsComponent implements OnInit {
  promotions: Promotion[] = [];
  showId: number | null = null;
  isLoading = true;
  error = '';
  successMessage = '';
  
  // For creating/editing promotions
  promotionForm: FormGroup;
  isEditing = false;
  selectedPromotionId: number | null = null;
  showPromotionModal = false;
  
  // For filtering
  statusFilter: string = 'all';
  searchQuery = '';
  
  // Add the filteredPromotions property
  get filteredPromotions(): Promotion[] {
    return this.getFilteredPromotions();
  }

  constructor(
    private showService: ShowService,
    private promotionService: PromotionService,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.promotionForm = this.fb.group({
      name: ['', [Validators.required]],
      code: ['', [Validators.required, Validators.pattern('^[A-Z0-9]{4,10}$')]],
      description: [''],
      discountType: ['PERCENTAGE', [Validators.required]],
      discountValue: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
      startDate: [new Date(), [Validators.required]],
      endDate: [this.getDefaultEndDate(), [Validators.required]],
      maxUses: [100, [Validators.required, Validators.min(1)]],

      status: ['ACTIVE', [Validators.required]]
    }, { validator: this.dateRangeValidator });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.showId = +params['id'];
        this.loadPromotions(this.showId);
      } else {
        this.loadAllPromotions();
      }
    });
  }

  getDefaultEndDate(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date;
  }

  dateRangeValidator(form: FormGroup) {
    const startDate = form.get('startDate')?.value;
    const endDate = form.get('endDate')?.value;
    
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      form.get('endDate')?.setErrors({ dateRange: true });
      return { dateRange: true };
    }
    
    return null;
  }

  loadPromotions(showId: number): void {
    this.isLoading = true;
    this.showService.getPromotions(showId).subscribe({
      next: (promotions) => {
        this.promotions = promotions;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = `Failed to load promotions for show #${showId}. Please try again.`;
        this.isLoading = false;
        console.error('Error loading promotions:', error);
      }
    });
  }

  loadAllPromotions(): void {
    this.isLoading = true;
    this.promotionService.getAllPromotions().subscribe({
      next: (promotions) => {
        // Transform ServicePromotion to Promotion interface
        this.promotions = promotions.map(p => this.transformServicePromotionToPromotion(p));
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load promotions. Please try again.';
        this.isLoading = false;
        console.error('Error loading all promotions:', error);
      }
    });
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.selectedPromotionId = null;
    this.promotionForm.reset({
      name: '',
      code: this.generatePromoCode(),
      discountType: 'PERCENTAGE',
      discountValue: 10,
      startDate: new Date(),
      endDate: this.getDefaultEndDate(),
      maxUses: 100,
      status: 'ACTIVE',
      description: ''
    });
    this.showPromotionModal = true;
  }

  openEditModal(promotion: Promotion): void {
    this.isEditing = true;
    this.selectedPromotionId = promotion.id || null;
    this.promotionForm.patchValue({
      name: promotion.name,
      code: promotion.code,
      discountType: promotion.discountType || (promotion.type === 'FIXED_AMOUNT' ? 'FIXED' : promotion.type),
      discountValue: promotion.discountValue || promotion.value,
      startDate: new Date(promotion.startDate),
      endDate: new Date(promotion.endDate),
      maxUses: promotion.maxUses,
      status: promotion.status,
      description: promotion.description || ''
    });
    this.showPromotionModal = true;
  }

  closePromotionModal(): void {
    this.showPromotionModal = false;
  }

  savePromotion(): void {
    if (this.promotionForm.invalid) return;
    
    const formValue = this.promotionForm.value;
    const promotionData: Promotion = {
      name: formValue.name,
      code: formValue.code,
      description: formValue.description || '',
      discountType: formValue.discountType,
      discountValue: formValue.discountValue,
      type: formValue.discountType === 'FIXED' ? 'FIXED_AMOUNT' : formValue.discountType, // Map to both fields for compatibility
      value: formValue.discountValue, // Map to both fields for compatibility
      startDate: formValue.startDate,
      endDate: formValue.endDate,
      maxUses: formValue.maxUses,
      currentUses: 0,

      status: formValue.status,
      active: formValue.status === 'ACTIVE',
      ...(this.showId ? { showId: this.showId } : {})
    };
    
    if (this.isEditing && this.selectedPromotionId) {
      // Update existing promotion
      if (this.showId) {
        this.showService.updatePromotion(this.showId, this.selectedPromotionId, promotionData).subscribe({
          next: (updatedPromotion) => {
            // Update the promotion in the local array
            const index = this.promotions.findIndex(p => p.id === this.selectedPromotionId);
            if (index !== -1) {
              this.promotions[index] = updatedPromotion;
            }
            
            this.successMessage = 'Promotion updated successfully.';
            this.closePromotionModal();
            
            // Clear success message after 3 seconds
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          },
          error: (error) => {
            this.error = 'Failed to update promotion. Please try again.';
            console.error('Error updating promotion:', error);
          }
        });
      } else {
        // Update global promotion using PromotionService
        const servicePromotionData = this.transformPromotionToServicePromotion(promotionData);
        this.promotionService.updatePromotion(this.selectedPromotionId, servicePromotionData).subscribe({
          next: (updatedPromotion) => {
            // Update the promotion in the local array
            const index = this.promotions.findIndex(p => p.id === this.selectedPromotionId);
            if (index !== -1) {
              this.promotions[index] = this.transformServicePromotionToPromotion(updatedPromotion);
            }
            
            this.successMessage = 'Global promotion updated successfully.';
            this.closePromotionModal();
            
            // Clear success message after 3 seconds
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          },
          error: (error) => {
            this.error = 'Failed to update global promotion. Please try again.';
            console.error('Error updating global promotion:', error);
          }
        });
      }
    } else {
      // Create new promotion
      this.onCreatePromotion(promotionData);
    }
  }

  onCreatePromotion(promotionData: Promotion): void {
    if (this.showId) {
      // Create show-specific promotion
      this.showService.createPromotion(this.showId, promotionData).subscribe({
        next: (newPromotion) => {
          this.promotions = [...this.promotions, newPromotion];
          this.successMessage = 'Promotion created successfully.';
          this.closePromotionModal();
          
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          this.error = 'Failed to create promotion. Please try again.';
          console.error('Error creating promotion:', error);
        }
      });
    } else {
      // Create global promotion using PromotionService
      const servicePromotionData = this.transformPromotionToServicePromotion(promotionData);
      this.promotionService.createPromotion(servicePromotionData).subscribe({
        next: (newPromotion) => {
          this.promotions = [...this.promotions, this.transformServicePromotionToPromotion(newPromotion)];
          this.successMessage = 'Global promotion created successfully.';
          this.closePromotionModal();
          
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          this.error = 'Failed to create global promotion. Please try again.';
          console.error('Error creating global promotion:', error);
        }
      });
    }
  }

  deletePromotion(promotionId: number): void {
    if (confirm('Are you sure you want to delete this promotion? This action cannot be undone.')) {
      if (this.showId) {
        // Delete show-specific promotion
        this.showService.deletePromotion(this.showId, promotionId).subscribe({
          next: () => {
            this.promotions = this.promotions.filter(p => p.id !== promotionId);
            this.successMessage = 'Promotion deleted successfully.';
            
            // Clear success message after 3 seconds
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          },
          error: (error) => {
            this.error = 'Failed to delete promotion. Please try again.';
            console.error('Error deleting promotion:', error);
          }
        });
      } else {
        // Delete global promotion
        this.promotionService.deletePromotion(promotionId).subscribe({
          next: () => {
            this.promotions = this.promotions.filter(p => p.id !== promotionId);
            this.successMessage = 'Global promotion deleted successfully.';
            
            // Clear success message after 3 seconds
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          },
          error: (error) => {
            this.error = 'Failed to delete global promotion. Please try again.';
            console.error('Error deleting global promotion:', error);
          }
        });
      }
    }
  }

  generatePromoCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  regenerateCode(): void {
    this.promotionForm.patchValue({
      code: this.generatePromoCode()
    });
  }

  getFilteredPromotions(): Promotion[] {
    let filtered = [...this.promotions];

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(promotion => promotion.active === (this.statusFilter === 'active'));
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(promotion =>
        promotion.code.toLowerCase().includes(query) ||
        promotion.description?.toLowerCase().includes(query) ||
        false
      );
    }

    return filtered;
  }

  getStatusClass(status: string | boolean): string {
    if (typeof status === 'boolean') {
      return status ? 'badge bg-success' : 'badge bg-danger';
    }
    
    // Handle string status
    switch(status?.toUpperCase()) {
      case 'ACTIVE':
        return 'badge bg-success';
      case 'INACTIVE':
        return 'badge bg-danger';
      case 'EXPIRED':
        return 'badge bg-secondary';
      case 'SCHEDULED':
        return 'badge bg-info';
      default:
        return 'badge bg-secondary';
    }
  }

  formatDiscount(promotion: Promotion): string {
    if (promotion.type === 'PERCENTAGE') {
      return `${promotion.value}%`;
    } else {
      return `$${promotion.value.toFixed(2)}`;
    }
  }
  
  getDiscountDisplay(promotion: Promotion): string {
    if (promotion.discountType === 'PERCENTAGE') {
      return `${promotion.discountValue}%`;
    } else if (promotion.discountType === 'FIXED' || promotion.discountType === 'FIXED_AMOUNT') {
      return `₹${promotion.discountValue.toFixed(2)}`;
    } else {
      return this.formatDiscount(promotion);
    }
  }

  getFormattedDate(dateString: string | Date): string {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getUsagePercentage(promotion: Promotion): number {
    if (!promotion.currentUses || !promotion.maxUses) return 0;
    return (promotion.currentUses / promotion.maxUses) * 100;
  }

  getUsageClass(promotion: Promotion): string {
    const percentage = this.getUsagePercentage(promotion);
    if (percentage < 50) {
      return 'bg-success';
    } else if (percentage < 80) {
      return 'bg-warning';
    } else {
      return 'bg-danger';
    }
  }

  // Transform ServicePromotion to Promotion interface
  private transformServicePromotionToPromotion(servicePromotion: ServicePromotion): Promotion {
    return {
      id: servicePromotion.id,
      showId: servicePromotion.show?.id, // Get showId from show object if present
      name: servicePromotion.name,
      code: servicePromotion.code,
      type: servicePromotion.discountType === 'FIXED' ? 'FIXED_AMOUNT' : servicePromotion.discountType,
      value: servicePromotion.discountValue,
      startDate: servicePromotion.startDate,
      endDate: servicePromotion.endDate,
      maxUses: servicePromotion.maxUses,
      currentUses: servicePromotion.currentUses,
      minPurchaseAmount: 0, // Backend doesn't have this field
      status: servicePromotion.status,
      description: servicePromotion.description,
      discountType: servicePromotion.discountType === 'FIXED' ? 'FIXED_AMOUNT' : servicePromotion.discountType,
      discountValue: servicePromotion.discountValue,
      active: servicePromotion.status === 'ACTIVE'
    };
  }

  // Transform Promotion to ServicePromotion interface
  private transformPromotionToServicePromotion(promotion: any): Partial<ServicePromotion> {
    return {
      name: promotion.name,
      code: promotion.code,
      description: promotion.description,
      discountType: promotion.discountType === 'FIXED_AMOUNT' ? 'FIXED' : promotion.discountType,
      discountValue: promotion.discountValue,
      maxUses: promotion.maxUses,
      startDate: promotion.startDate instanceof Date ? promotion.startDate.toISOString().split('T')[0] : promotion.startDate,
      endDate: promotion.endDate instanceof Date ? promotion.endDate.toISOString().split('T')[0] : promotion.endDate,
      status: promotion.status,
      currentUses: promotion.currentUses || 0
    };
  }
}