import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatorInvitationsComponent } from './creator-invitations.component';

describe('CreatorInvitationsComponent', () => {
  let component: CreatorInvitationsComponent;
  let fixture: ComponentFixture<CreatorInvitationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatorInvitationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatorInvitationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
