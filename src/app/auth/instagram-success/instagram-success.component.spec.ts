import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstagramSuccessComponent } from './instagram-success.component';

describe('InstagramSuccessComponent', () => {
  let component: InstagramSuccessComponent;
  let fixture: ComponentFixture<InstagramSuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstagramSuccessComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstagramSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
