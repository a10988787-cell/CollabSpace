import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatorSocialComponent } from './creator-social.component';

describe('CreatorSocialComponent', () => {
  let component: CreatorSocialComponent;
  let fixture: ComponentFixture<CreatorSocialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatorSocialComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatorSocialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
