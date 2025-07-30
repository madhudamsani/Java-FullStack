import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  let component: StatusBadgeComponent;
  let fixture: ComponentFixture<StatusBadgeComponent>;

  // Test enum and metadata
  enum TestStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    PENDING = 'PENDING'
  }

  const TEST_STATUS_METADATA = {
    [TestStatus.ACTIVE]: {
      value: TestStatus.ACTIVE,
      displayName: 'Active',
      color: 'success',
      icon: 'check-circle'
    },
    [TestStatus.INACTIVE]: {
      value: TestStatus.INACTIVE,
      displayName: 'Inactive',
      color: 'danger',
      icon: 'times-circle'
    },
    [TestStatus.PENDING]: {
      value: TestStatus.PENDING,
      displayName: 'Pending',
      color: 'warning',
      icon: 'clock'
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StatusBadgeComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StatusBadgeComponent);
    component = fixture.componentInstance;
    component.status = TestStatus.ACTIVE;
    component.metadata = TEST_STATUS_METADATA;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should get the correct display name', () => {
    component.status = TestStatus.ACTIVE;
    expect(component.displayName).toBe('Active');

    component.status = TestStatus.INACTIVE;
    expect(component.displayName).toBe('Inactive');

    component.status = TestStatus.PENDING;
    expect(component.displayName).toBe('Pending');
  });

  it('should get the correct color', () => {
    component.status = TestStatus.ACTIVE;
    expect(component.color).toBe('success');

    component.status = TestStatus.INACTIVE;
    expect(component.color).toBe('danger');

    component.status = TestStatus.PENDING;
    expect(component.color).toBe('warning');
  });

  it('should get the correct icon', () => {
    component.status = TestStatus.ACTIVE;
    expect(component.icon).toBe('check-circle');

    component.status = TestStatus.INACTIVE;
    expect(component.icon).toBe('times-circle');

    component.status = TestStatus.PENDING;
    expect(component.icon).toBe('clock');
  });

  it('should handle missing status', () => {
    component.status = null;
    expect(component.displayName).toBe('');
    expect(component.color).toBe('secondary');
    expect(component.icon).toBe('');
  });

  it('should handle missing metadata', () => {
    component.metadata = null;
    expect(component.displayName).toBe('');
    expect(component.color).toBe('secondary');
    expect(component.icon).toBe('');
  });

  it('should handle unknown status', () => {
    component.status = 'UNKNOWN';
    expect(component.displayName).toBe('UNKNOWN');
    expect(component.color).toBe('secondary');
    expect(component.icon).toBe('');
  });
});