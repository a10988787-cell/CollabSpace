import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatorGrowthComponent } from './creator-growth.component';

describe('CreatorGrowthComponent', () => {
  let component: CreatorGrowthComponent;
  let fixture: ComponentFixture<CreatorGrowthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatorGrowthComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatorGrowthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
