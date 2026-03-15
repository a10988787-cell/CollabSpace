import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatorNotificationsComponent } from './creator-notifications.component';

describe('CreatorNotificationsComponent', () => {
  let component: CreatorNotificationsComponent;
  let fixture: ComponentFixture<CreatorNotificationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatorNotificationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatorNotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
