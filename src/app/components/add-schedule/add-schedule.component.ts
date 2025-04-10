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
import { Schedule, ScheduleApiService } from '../../services/scheduleApi';

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
  isLoading = false;
  errorMessage = '';
  today = new Date().toISOString().split('T')[0]; // For min date in date picker

  constructor(
    private fb: FormBuilder,
    private scheduleApiService: ScheduleApiService,
    public activeModal: NgbActiveModal
  ) {
    this.scheduleForm = this.fb.group({
      roomId: ['', Validators.required],
      date: [this.today, Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      purpose: [
        '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(200),
        ],
      ],
    });
  }

  // Initialize the component
  ngOnInit(): void {
    // Sort rooms for dropdown
    this.rooms.sort((a, b) => {
      if (a.building !== b.building) {
        return a.building.localeCompare(b.building);
      }
      return a.roomNumber.localeCompare(b.roomNumber);
    });

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
        purpose: this.existingSchedule.purpose,
      });

      // For edit mode, store the original user info
      this.userId = this.existingSchedule.userId;
      this.userName = this.existingSchedule.userName;
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

    // Format times as HH:MM:00
    const startTime = this.formatTime(formValue.startTime);
    const endTime = this.formatTime(formValue.endTime);

    if (this.isEditMode && this.existingSchedule) {
      // Prepare updated schedule object
      const updatedSchedule: Schedule = {
        ...this.existingSchedule,
        roomId: Number(formValue.roomId),
        roomNumber: this.selectedRoom?.roomNumber || '',
        date: formattedDate,
        startTime: startTime,
        endTime: endTime,
        purpose: formValue.purpose,
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
      // Original add functionality
      const newSchedule: Partial<Schedule> = {
        roomId: Number(formValue.roomId),
        roomNumber: this.selectedRoom?.roomNumber || '',
        userId: this.userId,
        userName: this.userName,
        date: formattedDate,
        startTime: startTime,
        endTime: endTime,
        purpose: formValue.purpose,
        status: 'PENDING',
      };

      this.scheduleApiService.createSchedule(newSchedule as Schedule).subscribe({
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
