import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandContentReviewComponent } from './brand-content-review.component';

describe('BrandContentReviewComponent', () => {
  let component: BrandContentReviewComponent;
  let fixture: ComponentFixture<BrandContentReviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandContentReviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrandContentReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
