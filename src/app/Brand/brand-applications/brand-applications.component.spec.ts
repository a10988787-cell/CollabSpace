import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandApplicationsComponent } from './brand-applications.component';

describe('BrandApplicationsComponent', () => {
  let component: BrandApplicationsComponent;
  let fixture: ComponentFixture<BrandApplicationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandApplicationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrandApplicationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
