import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminFeatureFlagsComponent } from './admin-feature-flags.component';

describe('AdminFeatureFlagsComponent', () => {
  let component: AdminFeatureFlagsComponent;
  let fixture: ComponentFixture<AdminFeatureFlagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFeatureFlagsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminFeatureFlagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
