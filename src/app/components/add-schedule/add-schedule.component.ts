import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Course, CourseApiService } from '../../services/courseApi';
import { Department, DepartmentApiService } from '../../services/departmentApi';
import { Program, ProgramApiService } from '../../services/programApi';
import { Room } from '../../services/roomApi';
import {
  RecurringScheduleRequest,
  Schedule,
  ScheduleApiService,
} from '../../services/scheduleApi';
import {
  catchError,
  EMPTY,
  forkJoin,
  map,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

@Component({
  selector: 'app-add-schedule',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
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

  @Input() isRequest = false;

  scheduleForm: FormGroup;
  selectedRoom: Room | null = null;
  courses: Course[] = [];
  departments: Department[] = [];
  programs: Program[] = [];
  selectedDepartment: number | null = null;
  selectedBuilding: string = '';
  buildings: string[] = [];
  filteredRooms: Room[] = [];
  buildingTouched = false;
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
    private programApiService: ProgramApiService,
    public activeModal: NgbActiveModal
  ) {
    this.scheduleForm = this.fb.group({
      roomId: ['', Validators.required],
      date: [this.today, Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      departmentId: ['', Validators.required],
      programId: ['', Validators.required],
      courseId: ['', Validators.required],
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

    // Extract unique building names
    this.buildings = [
      ...new Set(this.rooms.map((room) => room.buildingName)),
    ].sort();

    // Load departments
    this.loadDepartments();

    // Set up the form controls
    this.scheduleForm.get('roomId')?.disable();
    this.scheduleForm.get('programId')?.disable();
    this.scheduleForm.get('courseId')?.disable();

    // If in edit mode, populate the form with existing schedule data
    if (this.isEditMode && this.existingSchedule) {
      // Set the selected room
      this.selectedRoom =
        this.rooms.find((room) => room.id === this.existingSchedule!.roomId) ||
        null;

      // Set the selected building based on the selected room
      if (this.selectedRoom) {
        this.selectedBuilding = this.selectedRoom.buildingName;
        this.onBuildingChange(); // Filter rooms for this building
      }

      // Format the date properly for the date input (YYYY-MM-DD)
      let dateValue = this.existingSchedule.date;
      if (typeof dateValue === 'string') {
        // Make sure it's in the right format for the input
        dateValue = new Date(dateValue).toISOString().split('T')[0];
      }

      // Format times for the inputs (HH:MM)
      const startTime = this.existingSchedule.startTime.substring(0, 5);
      const endTime = this.existingSchedule.endTime.substring(0, 5);

      // For edit mode, fetch the course details to get program and department
      this.loadCourseDetails(this.existingSchedule.courseId);

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

  loadProgramsByDepartment(departmentId: number): void {
    this.programApiService.getProgramsByDepartment(departmentId).subscribe({
      next: (programs) => {
        this.programs = programs;
        // Reset program and course selections when department changes
        this.scheduleForm.patchValue({
          programId: '',
          courseId: '',
        });
        this.courses = []; // Clear courses when department changes
      },
      error: (error) => {
        console.error('Error loading programs for department', error);
        this.errorMessage = 'Failed to load programs';
      },
    });
  }

  loadCoursesByProgram(programId: number): void {
    this.courseApiService.getCoursesByProgram(programId).subscribe({
      next: (courses) => {
        this.courses = courses;
      },
      error: (error) => {
        console.error('Error loading courses for program', error);
        this.errorMessage = 'Failed to load courses';
      },
    });
  }

  loadCourseDetails(courseId: number): void {
    // Show loading state if needed
    this.isLoading = true;

    // Get course details
    this.courseApiService
      .getCourseById(courseId)
      .pipe(
        // Handle case where course doesn't exist or has no program
        switchMap((course) => {
          if (!course || !course.programId) {
            return throwError(() => new Error('Invalid course data'));
          }

          // Store programId for later use
          const programId = course.programId;

          // Chain to get program details
          return this.programApiService
            .getProgramById(programId)
            .pipe(map((program) => ({ program, programId, course })));
        }),
        // Process the combined result
        tap(({ program, programId }) => {
          if (!program || !program.departmentId) {
            throw new Error('Invalid program data');
          }

          // First batch: Set department ID and load programs for that department
          const departmentId = program.departmentId;
          this.scheduleForm.get('departmentId')?.setValue(departmentId);

          // Pre-enable fields to avoid visible state changes
          this.scheduleForm.get('programId')?.enable();
          this.scheduleForm.get('courseId')?.enable();

          // Load all dependent data in parallel
          forkJoin({
            programs:
              this.programApiService.getProgramsByDepartment(departmentId),
            courses: this.courseApiService.getCoursesByProgram(programId),
          }).subscribe({
            next: (data) => {
              // Update the data collections
              this.programs = data.programs;
              this.courses = data.courses;

              // Now set the values (after the data is available)
              this.scheduleForm.patchValue({
                programId: programId,
                courseId: courseId,
              });

              // Complete loading
              this.isLoading = false;
            },
            error: (err) => {
              console.error('Error loading dependent data', err);
              this.isLoading = false;
            },
          });
        }),
        catchError((error) => {
          console.error('Error in course loading chain:', error);
          this.isLoading = false;
          return EMPTY;
        })
      )
      .subscribe();
  }

  // Add this method to handle building change
  onBuildingChange(): void {
    this.buildingTouched = true;

    // Filter the rooms to show only those from the selected building
    this.filteredRooms = this.rooms
      .filter((room) => room.buildingName === this.selectedBuilding)
      .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));

    // Enable/disable room control based on building selection
    if (this.selectedBuilding) {
      this.scheduleForm.get('roomId')?.enable();
    } else {
      this.scheduleForm.get('roomId')?.disable();
    }

    // Reset room selection if building is changed
    if (this.scheduleForm.get('roomId')?.value) {
      // Check if selected room is in the new filtered list
      const currentRoomId = Number(this.scheduleForm.get('roomId')?.value);
      const roomExists = this.filteredRooms.some(
        (room) => room.id === currentRoomId
      );

      if (!roomExists) {
        this.scheduleForm.patchValue({ roomId: '' });
        this.selectedRoom = null;
      }
    }
  }

  onDepartmentChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const departmentId = Number(selectElement.value);

    if (departmentId) {
      // Load programs for the selected department
      this.loadProgramsByDepartment(departmentId);
      this.scheduleForm.get('programId')?.enable();
    } else {
      // Clear programs and courses when no department is selected
      this.programs = [];
      this.courses = [];
      this.scheduleForm.get('programId')?.disable();
      this.scheduleForm.get('courseId')?.disable();
      this.scheduleForm.patchValue({
        programId: '',
        courseId: '',
      });
    }
  }

  onProgramChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const programId = Number(selectElement.value);

    if (programId) {
      // Load courses for the selected program
      this.loadCoursesByProgram(programId);
      this.scheduleForm.get('courseId')?.enable();
    } else {
      // Clear courses when no program is selected
      this.courses = [];
      this.scheduleForm.get('courseId')?.disable();
      this.scheduleForm.patchValue({
        courseId: '',
      });
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
        // Handle recurring schedule creation
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
        // Handle single schedule creation
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
