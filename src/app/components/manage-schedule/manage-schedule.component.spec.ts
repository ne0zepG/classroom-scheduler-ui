import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageScheduleComponent } from './manage-schedule.component';

describe('ScheduleComponent', () => {
  let component: ManageScheduleComponent;
  let fixture: ComponentFixture<ManageScheduleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageScheduleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageScheduleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
