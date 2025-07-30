import { Component, Input } from '@angular/core';

/**
 * A reusable component for displaying status badges with consistent styling
 */
@Component({
  selector: 'app-status-badge',
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.scss']
})
export class StatusBadgeComponent {
  /**
   * The status value to display
   */
  @Input() status: any;
  
  /**
   * The metadata for the status
   */
  @Input() metadata: any;
  
  /**
   * Whether to show the icon
   */
  @Input() showIcon = true;
  
  /**
   * Whether to show the text
   */
  @Input() showText = true;
  
  /**
   * The size of the badge (sm, md, lg)
   */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  
  /**
   * Get the display name for the status
   */
  get displayName(): string {
    if (!this.status || !this.metadata) {
      return '';
    }
    
    const statusMetadata = this.metadata[this.status];
    return statusMetadata ? statusMetadata.displayName : this.status.toString();
  }
  
  /**
   * Get the color for the status
   */
  get color(): string {
    if (!this.status || !this.metadata) {
      return 'secondary';
    }
    
    const statusMetadata = this.metadata[this.status];
    return statusMetadata ? statusMetadata.color : 'secondary';
  }
  
  /**
   * Get the icon for the status
   */
  get icon(): string {
    if (!this.status || !this.metadata) {
      return '';
    }
    
    const statusMetadata = this.metadata[this.status];
    return statusMetadata ? statusMetadata.icon : '';
  }
}