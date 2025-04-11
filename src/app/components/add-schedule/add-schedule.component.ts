import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Room } from '../../services/roomApi';
import {
  FilterByBuildingPipe,
  RoomsByBuildingPipe,
} from '../../utils/roomPipes';
import {
  RecurringScheduleRequest,
  Schedule,
  ScheduleApiService,
} from '../../services/scheduleApi';
import { Course, CourseApiService } from '../../services/courseApi';
import { Department, DepartmentApiService } from '../../services/departmentApi';

@Component({
  selector: 'app-add-schedule',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RoomsByBuildingPipe,
    FilterByBuildingPipe,
  ],
  templateUrl: './add-schedule.component.html',
  styleUrl: './add-schedule.component.scss',
})
export class AddScheduleComponent implements OnInit {
  @Input() rooms: Room[] = [];
  @Input() userId: number = 1; // Default user ID or get from auth service
  @Input() userName: string = 'Current User'; // Default user name or get from auth service
  @Output() scheduleAdded = new EventEmitter<Schedule>();

  @Input() isEditMode = false;
  @Input() existingSchedule: Schedule | null = null;
  @Output() scheduleUpdated = new EventEmitter<Schedule>();

  scheduleForm: FormGroup;
  selectedRoom: Room | null = null;
  courses: Course[] = [];
  departments: Department[] = [];
  selectedDepartment: number | null = null;
  isLoading = false;
  errorMessage = '';
  today = new Date().toISOString().split('T')[0]; // For min date in date picker
  isRecurring = false;
  daysOfWeek = [
    { id: 1, name: 'Monday', selected: false },
    { id: 2, name: 'Tuesday', selected: false },
    { id: 3, name: 'Wednesday', selected: false },
    { id: 4, name: 'Thursday', selected: false },
    { id: 5, name: 'Friday', selected: false },
    { id: 6, name: 'Saturday', selected: false },
    { id: 0, name: 'Sunday', selected: false },
  ];

  constructor(
    private fb: FormBuilder,
    private scheduleApiService: ScheduleApiService,
    private courseApiService: CourseApiService,
    private departmentApiService: DepartmentApiService,
    public activeModal: NgbActiveModal
  ) {
    this.scheduleForm = this.fb.group({
      roomId: ['', Validators.required],
      date: [this.today, Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      courseId: ['', Validators.required],
      departmentId: [''],
      isRecurring: [false],
      endDate: [''],
      daysOfWeek: this.fb.array([]),
    });

    // Update validators based on isRecurring
    this.scheduleForm
      .get('isRecurring')
      ?.valueChanges.subscribe((isRecurring) => {
        this.isRecurring = isRecurring;

        if (isRecurring) {
          this.scheduleForm
            .get('endDate')
            ?.setValidators([Validators.required]);
          // Rename date field label to startDate
        } else {
          this.scheduleForm.get('endDate')?.clearValidators();
        }
        this.scheduleForm.get('endDate')?.updateValueAndValidity();
      });
  }

  // Initialize the component
  ngOnInit(): void {
    // Sort rooms for dropdown (keep this part)
    this.rooms.sort((a, b) => {
      if (a.buildingName !== b.buildingName) {
        return a.buildingName.localeCompare(b.buildingName);
      }
      return a.roomNumber.localeCompare(b.roomNumber);
    });

    // Load departments and courses
    this.loadDepartments();
    this.loadCourses();

    // If in edit mode, populate the form with existing schedule data
    if (this.isEditMode && this.existingSchedule) {
      // Set the selected room
      this.selectedRoom =
        this.rooms.find((room) => room.id === this.existingSchedule!.roomId) ||
        null;

      // Format the date properly for the date input (YYYY-MM-DD)
      let dateValue = this.existingSchedule.date;
      if (typeof dateValue === 'string') {
        // Make sure it's in the right format for the input
        dateValue = new Date(dateValue).toISOString().split('T')[0];
      }

      // Format times for the inputs (HH:MM)
      const startTime = this.existingSchedule.startTime.substring(0, 5);
      const endTime = this.existingSchedule.endTime.substring(0, 5);

      // Update the form with existing values
      this.scheduleForm.patchValue({
        roomId: this.existingSchedule.roomId,
        date: dateValue,
        startTime: startTime,
        endTime: endTime,
        courseId: this.existingSchedule.courseId,
      });

      // For edit mode, store the original user info
      this.userId = this.existingSchedule.userId;
      this.userName = this.existingSchedule.userName;
    }
  }

  loadDepartments(): void {
    this.departmentApiService.getAllDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
      },
      error: (error) => {
        console.error('Error loading departments', error);
        this.errorMessage = 'Failed to load departments';
      },
    });
  }

  loadCourses(): void {
    this.courseApiService.getAllCourses().subscribe({
      next: (courses) => {
        this.courses = courses;
      },
      error: (error) => {
        console.error('Error loading courses', error);
        this.errorMessage = 'Failed to load courses';
      },
    });
  }

  onDepartmentChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const departmentId = Number(selectElement.value);

    if (departmentId) {
      // Load courses for the selected department
      this.courseApiService.getCoursesByDepartment(departmentId).subscribe({
        next: (courses) => {
          this.courses = courses;
        },
        error: (error) => {
          console.error('Error loading courses for department', error);
        },
      });
    } else {
      // Load all courses if no department is selected
      this.loadCourses();
    }
  }

  onRoomChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const roomId = Number(selectElement.value);
    this.selectedRoom = this.rooms.find((room) => room.id === roomId) || null;
  }

  // Handle form submission
  onSubmit(): void {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formValue = this.scheduleForm.value;

    // Format date as YYYY-MM-DD
    let dateObj = new Date(formValue.date);
    const formattedDate = dateObj.toISOString().split('T')[0];
    const startDate = new Date(formValue.date).toISOString().split('T')[0];

    // Format times as HH:MM:00
    const startTime = this.formatTime(formValue.startTime);
    const endTime = this.formatTime(formValue.endTime);

    // Find the selected course to get additional details
    const selectedCourse = this.courses.find(
      (course) => course.id === Number(formValue.courseId)
    );

    if (this.isEditMode && this.existingSchedule) {
      // Prepare updated schedule object
      const updatedSchedule: Schedule = {
        ...this.existingSchedule,
        roomId: Number(formValue.roomId),
        roomNumber: this.selectedRoom?.roomNumber || '',
        date: formattedDate,
        startTime: startTime,
        endTime: endTime,
        courseId: Number(formValue.courseId),
        courseCode: selectedCourse?.courseCode || '',
        courseDescription: selectedCourse?.description || '',
        // Note: status is preserved from the existing schedule
      };

      // Call the update API
      this.scheduleApiService
        .updateSchedule(updatedSchedule.id, updatedSchedule)
        .subscribe({
          next: (result: Schedule | undefined) => {
            this.isLoading = false;
            this.scheduleUpdated.emit(result);
            this.activeModal.close(result);
          },
          error: (error: { message: any }) => {
            this.isLoading = false;
            this.errorMessage = `Failed to update schedule: ${
              error.message || 'Unknown error'
            }`;
          },
        });
    } else {
      if (formValue.isRecurring) {
        // Create recurring schedule
        const endDate = new Date(formValue.endDate).toISOString().split('T')[0];

        // Get selected days
        const selectedDays = this.daysOfWeek
          .filter((day) => day.selected)
          .map((day) => day.id);

        if (selectedDays.length === 0) {
          this.errorMessage = 'Please select at least one day of the week';
          this.isLoading = false;
          return;
        }

        const recurringRequest: RecurringScheduleRequest = {
          baseSchedule: {
            roomId: Number(formValue.roomId),
            roomNumber: this.selectedRoom?.roomNumber || '',
            userId: this.userId,
            userName: this.userName,
            startTime: startTime,
            endTime: endTime,
            courseId: Number(formValue.courseId),
            courseCode: selectedCourse?.courseCode || '',
            courseDescription: selectedCourse?.description || '',
            status: 'PENDING',
          },
          recurrencePattern: {
            startDate: startDate,
            endDate: endDate,
            daysOfWeek: selectedDays,
          },
        };

        this.scheduleApiService
          .createRecurringSchedule(recurringRequest)
          .subscribe({
            next: (createdSchedules) => {
              this.isLoading = false;
              // Emit only the first schedule for backward compatibility
              this.scheduleAdded.emit(createdSchedules[0]);
              this.activeModal.close(createdSchedules);
            },
            error: (error) => {
              this.isLoading = false;
              this.errorMessage = `Failed to create schedules: ${
                error.message || 'Unknown error'
              }`;
            },
          });
      } else {
        // Original add functionality
        const newSchedule: Partial<Schedule> = {
          roomId: Number(formValue.roomId),
          roomNumber: this.selectedRoom?.roomNumber || '',
          userId: this.userId,
          userName: this.userName,
          date: formattedDate,
          startTime: startTime,
          endTime: endTime,
          courseId: Number(formValue.courseId),
          courseCode: selectedCourse?.courseCode || '',
          courseDescription: selectedCourse?.description || '',
          status: 'PENDING',
        };

        this.scheduleApiService
          .createSchedule(newSchedule as Schedule)
          .subscribe({
            next: (createdSchedule) => {
              this.isLoading = false;
              this.scheduleAdded.emit(createdSchedule);
              this.activeModal.close(createdSchedule);
            },
            error: (error) => {
              this.isLoading = false;
              this.errorMessage = `Failed to create schedule: ${
                error.message || 'Unknown error'
              }`;
            },
          });
      }
    }
  }

  toggleDay(day: any): void {
    day.selected = !day.selected;
  }

  areNoDaysSelected(): boolean {
    return this.daysOfWeek.every((d) => !d.selected);
  }

  private formatTime(time: string | { hour: number; minute: number }): string {
    let hours: number;
    let minutes: number;

    if (typeof time === 'string') {
      const parts = time.split(':');
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
    } else {
      hours = time.hour;
      minutes = time.minute;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:00`;
  }
}
