import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminBrandProfilesComponent } from './admin-brand-profiles.component';

describe('AdminBrandProfilesComponent', () => {
  let component: AdminBrandProfilesComponent;
  let fixture: ComponentFixture<AdminBrandProfilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminBrandProfilesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminBrandProfilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
