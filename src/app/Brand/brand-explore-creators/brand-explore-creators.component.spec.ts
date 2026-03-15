import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandExploreCreatorsComponent } from './brand-explore-creators.component';

describe('BrandExploreCreatorsComponent', () => {
  let component: BrandExploreCreatorsComponent;
  let fixture: ComponentFixture<BrandExploreCreatorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandExploreCreatorsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrandExploreCreatorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
