import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageRequestComponent } from './manage-request.component';

describe('RequestComponent', () => {
  let component: ManageRequestComponent;
  let fixture: ComponentFixture<ManageRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageRequestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
