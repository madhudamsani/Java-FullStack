import * as EnumUtils from './enum-utils';

// Test enum
enum TestEnum {
  VALUE_ONE = 'VALUE_ONE',
  VALUE_TWO = 'VALUE_TWO',
  VALUE_THREE = 'VALUE_THREE'
}

describe('EnumUtils', () => {
  describe('getEnumValues', () => {
    it('should return all enum values', () => {
      const values = EnumUtils.getEnumValues(TestEnum);
      expect(values).toEqual(['VALUE_ONE', 'VALUE_TWO', 'VALUE_THREE']);
    });
  });

  describe('getEnumKeys', () => {
    it('should return all enum keys', () => {
      const keys = EnumUtils.getEnumKeys(TestEnum);
      expect(keys).toEqual(['VALUE_ONE', 'VALUE_TWO', 'VALUE_THREE']);
    });
  });

  describe('fromString', () => {
    it('should convert a string to an enum value', () => {
      expect(EnumUtils.fromString(TestEnum, 'VALUE_ONE', TestEnum.VALUE_THREE)).toBe(TestEnum.VALUE_ONE);
      expect(EnumUtils.fromString(TestEnum, 'value_one', TestEnum.VALUE_THREE)).toBe(TestEnum.VALUE_ONE);
      expect(EnumUtils.fromString(TestEnum, 'Value_One', TestEnum.VALUE_THREE)).toBe(TestEnum.VALUE_ONE);
    });

    it('should return the default value if the string is not a valid enum value', () => {
      expect(EnumUtils.fromString(TestEnum, 'INVALID', TestEnum.VALUE_THREE)).toBe(TestEnum.VALUE_THREE);
      expect(EnumUtils.fromString(TestEnum, '', TestEnum.VALUE_THREE)).toBe(TestEnum.VALUE_THREE);
      expect(EnumUtils.fromString(TestEnum, null, TestEnum.VALUE_THREE)).toBe(TestEnum.VALUE_THREE);
      expect(EnumUtils.fromString(TestEnum, undefined, TestEnum.VALUE_THREE)).toBe(TestEnum.VALUE_THREE);
    });
  });

  describe('isValidEnum', () => {
    it('should return true for valid enum values', () => {
      expect(EnumUtils.isValidEnum(TestEnum, 'VALUE_ONE')).toBe(true);
      expect(EnumUtils.isValidEnum(TestEnum, 'value_one')).toBe(true);
      expect(EnumUtils.isValidEnum(TestEnum, 'Value_One')).toBe(true);
    });

    it('should return false for invalid enum values', () => {
      expect(EnumUtils.isValidEnum(TestEnum, 'INVALID')).toBe(false);
      expect(EnumUtils.isValidEnum(TestEnum, '')).toBe(false);
      expect(EnumUtils.isValidEnum(TestEnum, null)).toBe(false);
      expect(EnumUtils.isValidEnum(TestEnum, undefined)).toBe(false);
    });
  });

  describe('getDisplayName', () => {
    it('should convert enum values to display names', () => {
      expect(EnumUtils.getDisplayName(TestEnum, TestEnum.VALUE_ONE)).toBe('Value One');
      expect(EnumUtils.getDisplayName(TestEnum, TestEnum.VALUE_TWO)).toBe('Value Two');
      expect(EnumUtils.getDisplayName(TestEnum, TestEnum.VALUE_THREE)).toBe('Value Three');
    });
  });
});