import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandAnalyticsComponent } from './brand-analytics.component';

describe('BrandAnalyticsComponent', () => {
  let component: BrandAnalyticsComponent;
  let fixture: ComponentFixture<BrandAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandAnalyticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrandAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
