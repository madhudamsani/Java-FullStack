import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import * as EnumUtils from '../../../utils/enum-utils';

/**
 * A reusable component for filtering lists by enum values
 */
@Component({
  selector: 'app-enum-filter',
  templateUrl: './enum-filter.component.html',
  styleUrls: ['./enum-filter.component.scss']
})
export class EnumFilterComponent implements OnInit {
  /**
   * The enum object to filter by
   */
  @Input() enumObject: any;
  
  /**
   * The metadata for the enum values
   */
  @Input() metadata: any;
  
  /**
   * The currently selected value
   */
  @Input() selectedValue: any = null;
  
  /**
   * The label for the filter
   */
  @Input() label = 'Filter by';
  
  /**
   * Whether to include an "All" option
   */
  @Input() includeAll = true;
  
  /**
   * The text for the "All" option
   */
  @Input() allText = 'All';
  
  /**
   * Whether to show badges instead of a dropdown
   */
  @Input() showAsBadges = false;
  
  /**
   * Whether to show icons
   */
  @Input() showIcons = true;
  
  /**
   * Whether to show counts (if provided)
   */
  @Input() showCounts = false;
  
  /**
   * Counts for each enum value (optional)
   */
  @Input() counts: { [key: string]: number } = {};
  
  /**
   * Event emitted when the filter changes
   */
  @Output() filterChange = new EventEmitter<any>();
  
  /**
   * The available enum values
   */
  enumValues: any[] = [];
  
  /**
   * Whether the dropdown is open (for mobile)
   */
  isOpen = false;
  
  ngOnInit() {
    this.enumValues = EnumUtils.getEnumValues(this.enumObject);
  }
  
  /**
   * Get the display name for an enum value
   */
  getDisplayName(value: any): string {
    if (this.metadata && this.metadata[value]) {
      return this.metadata[value].displayName;
    }
    return EnumUtils.getDisplayName(this.enumObject, value);
  }
  
  /**
   * Get the color for an enum value
   */
  getColor(value: any): string {
    if (this.metadata && this.metadata[value]) {
      return this.metadata[value].color;
    }
    return 'secondary';
  }
  
  /**
   * Get the icon for an enum value
   */
  getIcon(value: any): string {
    if (this.metadata && this.metadata[value]) {
      return this.metadata[value].icon;
    }
    return '';
  }
  
  /**
   * Get the count for an enum value
   */
  getCount(value: any): number {
    return this.counts[value] || 0;
  }
  
  /**
   * Handle filter change
   */
  onFilterChange(value: any) {
    this.selectedValue = value;
    this.filterChange.emit(value);
    
    if (this.showAsBadges) {
      this.isOpen = false;
    }
  }
  
  /**
   * Toggle the dropdown on mobile
   */
  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }
  
  /**
   * Check if a value is selected
   */
  isSelected(value: any): boolean {
    return this.selectedValue === value;
  }
}