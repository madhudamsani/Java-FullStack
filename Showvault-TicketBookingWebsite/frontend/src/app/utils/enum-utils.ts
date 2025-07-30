/**
 * Utility functions for working with enums in TypeScript
 */

/**
 * Get all values from a TypeScript enum
 * @param enumObject The enum object
 * @returns Array of enum values
 */
export function getEnumValues<T extends object>(enumObject: T): Array<T[keyof T]> {
  return Object.keys(enumObject)
    .filter(key => isNaN(Number(key)))
    .map(key => enumObject[key as keyof T]);
}

/**
 * Get all keys from a TypeScript enum
 * @param enumObject The enum object
 * @returns Array of enum keys
 */
export function getEnumKeys<T extends object>(enumObject: T): Array<keyof T> {
  return Object.keys(enumObject)
    .filter(key => isNaN(Number(key)))
    .map(key => key as keyof T);
}

/**
 * Convert a string to an enum value
 * @param enumObject The enum object
 * @param value The string value to convert
 * @param defaultValue The default value to return if conversion fails
 * @returns The enum value if found, defaultValue otherwise
 */
export function fromString<T extends object>(
  enumObject: T,
  value: string | undefined | null,
  defaultValue: T[keyof T]
): T[keyof T] {
  if (!value) {
    return defaultValue;
  }

  const upperValue = value.toUpperCase();
  
  // Check if the value is a valid enum key
  for (const key of getEnumKeys(enumObject)) {
    if (key.toString().toUpperCase() === upperValue) {
      return enumObject[key];
    }
  }
  
  // Check if the value is a valid enum value
  for (const enumValue of getEnumValues(enumObject)) {
    if (String(enumValue).toUpperCase() === upperValue) {
      return enumValue;
    }
  }
  
  return defaultValue;
}

/**
 * Check if a string is a valid enum value
 * @param enumObject The enum object
 * @param value The string value to check
 * @returns true if valid, false otherwise
 */
export function isValidEnum<T extends object>(enumObject: T, value: string | undefined | null): boolean {
  if (!value) {
    return false;
  }

  const upperValue = value.toUpperCase();
  
  // Check if the value is a valid enum key
  for (const key of getEnumKeys(enumObject)) {
    if (key.toString().toUpperCase() === upperValue) {
      return true;
    }
  }
  
  // Check if the value is a valid enum value
  for (const enumValue of getEnumValues(enumObject)) {
    if (String(enumValue).toUpperCase() === upperValue) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get a display name for an enum value
 * @param enumObject The enum object
 * @param value The enum value
 * @returns The display name (formatted enum key)
 */
export function getDisplayName<T extends object>(enumObject: T, value: T[keyof T]): string {
  for (const key of getEnumKeys(enumObject)) {
    if (enumObject[key] === value) {
      // Convert SNAKE_CASE or UPPERCASE to Title Case
      return key.toString()
        .replace(/_/g, ' ')
        .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
    }
  }
  
  return String(value);
}

/**
 * Get a display name for an enum value from metadata
 * @param enumObject The enum object
 * @param value The enum value
 * @param metadata The metadata object containing display names
 * @returns The display name from metadata or formatted enum key
 */
export function getDisplayNameFromMetadata<T extends object>(
  enumObject: T, 
  value: T[keyof T] | string | null | undefined, 
  metadata: Record<string, { displayName: string }>
): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const enumValue = typeof value === 'string' ? fromString(enumObject, value, null as any) : value;
  
  if (enumValue === null) {
    return String(value);
  }
  
  if (metadata && metadata[enumValue as string]?.displayName) {
    return metadata[enumValue as string].displayName;
  }
  
  return getDisplayName(enumObject, enumValue);
}