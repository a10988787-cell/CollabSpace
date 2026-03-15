import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatorPortfolioComponent } from './creator-portfolio.component';

describe('CreatorPortfolioComponent', () => {
  let component: CreatorPortfolioComponent;
  let fixture: ComponentFixture<CreatorPortfolioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatorPortfolioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatorPortfolioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
