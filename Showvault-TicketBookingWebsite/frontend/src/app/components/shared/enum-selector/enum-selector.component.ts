import { Component, Input, Output, EventEmitter, OnInit, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl } from '@angular/forms';
import * as EnumUtils from '../../../utils/enum-utils';

/**
 * A reusable component for selecting enum values in forms
 */
@Component({
  selector: 'app-enum-selector',
  templateUrl: './enum-selector.component.html',
  styleUrls: ['./enum-selector.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EnumSelectorComponent),
      multi: true
    }
  ]
})
export class EnumSelectorComponent implements OnInit, ControlValueAccessor {
  /**
   * The enum object to select from
   */
  @Input() enumObject: any;
  
  /**
   * The metadata for the enum values
   */
  @Input() metadata: any;
  
  /**
   * The form control to bind to
   */
  @Input() control!: FormControl;
  
  /**
   * The label for the selector
   */
  @Input() label = 'Select';
  
  /**
   * The placeholder text
   */
  @Input() placeholder = 'Select an option';
  
  /**
   * Whether the field is required
   */
  @Input() required = false;
  
  /**
   * Whether to show icons
   */
  @Input() showIcons = true;
  
  /**
   * Whether to show colors
   */
  @Input() showColors = true;
  
  /**
   * Whether to include an empty option
   */
  @Input() includeEmpty = false;
  
  /**
   * The text for the empty option
   */
  @Input() emptyText = 'None';
  
  /**
   * Event emitted when the selection changes
   */
  @Output() selectionChange = new EventEmitter<any>();
  
  /**
   * The available enum values
   */
  enumValues: any[] = [];
  
  /**
   * The current value
   */
  value: any;
  
  /**
   * Whether the control is disabled
   */
  disabled = false;
  
  /**
   * The change function
   */
  onChange = (_: any) => {};
  
  /**
   * The touch function
   */
  onTouched = () => {};
  
  ngOnInit() {
    this.enumValues = EnumUtils.getEnumValues(this.enumObject);
    
    // Initialize value from control if available
    if (this.control) {
      this.value = this.control.value;
      
      // Subscribe to control value changes
      this.control.valueChanges.subscribe(value => {
        if (this.value !== value) {
          this.value = value;
        }
      });
    }
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
   * Handle selection change
   */
  handleChange(event: any) {
    const value = event.target.value;
    this.value = value;
    this.onChange(value);
    
    // Update the form control if it exists
    if (this.control && this.control.value !== value) {
      this.control.setValue(value);
    }
    
    this.selectionChange.emit(value);
  }
  
  /**
   * Write a new value to the element
   */
  writeValue(value: any): void {
    this.value = value;
  }
  
  /**
   * Set the function to be called when the control receives a change event
   */
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  
  /**
   * Set the function to be called when the control receives a touch event
   */
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  
  /**
   * Set the disabled state
   */
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}