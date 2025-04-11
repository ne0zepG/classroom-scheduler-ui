import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Room, RoomApiService } from '../../services/roomApi';
import { ScheduleApiService } from '../../services/scheduleApi';
import { Router } from '@angular/router';

interface ScheduleDisplay {
  id: number;
  roomId: number;
  purpose: string;
  scheduledBy: string;
  startTime: Date;
  endTime: Date;
  status: string;
}

interface TimeSlot {
  time: string;
  schedule?: ScheduleDisplay;
  isScheduled: boolean;
}

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './statistics.component.html',
  styleUrl: './statistics.component.scss',
})
export class StatisticsComponent implements OnInit {
  buildings: string[] = [];
  rooms: Room[] = [];
  filteredRooms: Room[] = [];
  schedules: ScheduleDisplay[] = [];
  selectedBuilding: string = '';
  selectedRoom: number | null = null;
  selectedDate: string = new Date().toISOString().split('T')[0];
  currentView: 'morning' | 'afternoon' = 'morning';
  morningSlots: TimeSlot[] = [];
  afternoonSlots: TimeSlot[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private scheduleApiService: ScheduleApiService,
    private roomApiService: RoomApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadBuildings();
    this.generateTimeSlots();
  }

  loadBuildings(): void {
    this.isLoading = true;
    this.roomApiService.getAllRooms().subscribe({
      next: (rooms) => {
        // Extract unique buildings
        this.rooms = rooms;
        this.buildings = [
          ...new Set(rooms.map((room) => room.buildingName)),
        ].sort();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading buildings:', error);
        this.errorMessage = 'Failed to load buildings. Please try again later.';
        this.isLoading = false;
      },
    });
  }

  onBuildingChange(): void {
    this.filteredRooms = this.rooms.filter(
      (room) => room.buildingName === this.selectedBuilding
    );
    this.selectedRoom = null; // Reset room selection
    this.resetSchedules();
  }

  onRoomChange(): void {
    if (this.selectedRoom) {
      this.loadSchedules();
    } else {
      this.resetSchedules();
    }
  }

  onDateChange(): void {
    if (this.selectedRoom) {
      this.loadSchedules();
    }
  }

  loadSchedules(): void {
    if (!this.selectedRoom) return;

    this.isLoading = true;

    // Use selectedDate instead of hardcoding today
    const selectedDate = new Date(this.selectedDate);
    selectedDate.setHours(0, 0, 0, 0);

    this.scheduleApiService.getAllSchedules().subscribe({
      next: (schedules) => {
        // Filter schedules for selected room and selected date
        this.schedules = schedules
          .filter((schedule) => schedule.roomId === this.selectedRoom)
          .filter((schedule) => {
            const scheduleDate = new Date(schedule.date);
            scheduleDate.setHours(0, 0, 0, 0);
            return scheduleDate.getTime() === selectedDate.getTime();
          })
          .map((schedule) => ({
            id: schedule.id,
            roomId: schedule.roomId,
            purpose: schedule.purpose,
            scheduledBy: schedule.userName,
            startTime: new Date(schedule.date + 'T' + schedule.startTime),
            endTime: new Date(schedule.date + 'T' + schedule.endTime),
            status: schedule.status,
          }));

        this.updateTimeSlots();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading schedules:', error);
        this.errorMessage = 'Failed to load schedules. Please try again later.';
        this.isLoading = false;
      },
    });
  }

  generateTimeSlots(): void {
    this.morningSlots = [];
    this.afternoonSlots = [];

    // Generate morning slots (7:00 AM - 12:00 PM)
    for (let hour = 7; hour < 12; hour++) {
      this.morningSlots.push({ time: `${hour}:00 AM`, isScheduled: false });
      this.morningSlots.push({ time: `${hour}:30 AM`, isScheduled: false });
    }
    this.morningSlots.push({ time: `12:00 PM`, isScheduled: false });

    // Generate afternoon slots (12:30 PM - 9:00 PM)
    this.afternoonSlots.push({ time: `12:30 PM`, isScheduled: false });
    for (let hour = 1; hour <= 9; hour++) {
      this.afternoonSlots.push({ time: `${hour}:00 PM`, isScheduled: false });
      if (hour < 9) {
        this.afternoonSlots.push({ time: `${hour}:30 PM`, isScheduled: false });
      }
    }
  }

  updateTimeSlots(): void {
    // Reset all slots
    this.generateTimeSlots();
    console.log('Updating time slots with schedules:', this.schedules);

    // Update slots based on schedules
    this.schedules.forEach((schedule) => {
      const startTime = schedule.startTime;
      const endTime = schedule.endTime;

      console.log(`Processing schedule: ${schedule.purpose}`);
      console.log(
        `Start time: ${startTime.toLocaleTimeString()}, End time: ${endTime.toLocaleTimeString()}`
      );

      // Loop through all time slots and check if they fall within schedule time
      [...this.morningSlots, ...this.afternoonSlots].forEach((slot) => {
        const slotTime = this.parseTimeSlot(slot.time, this.selectedDate);

        // Debug - log the comparison
        const isWithinSchedule = slotTime >= startTime && slotTime < endTime;
        if (
          slot.time === '9:00 AM' ||
          slot.time === '9:30 AM' ||
          slot.time === '10:00 AM'
        ) {
          console.log(
            `Slot: ${slot.time}, Time: ${slotTime.toLocaleTimeString()}`
          );
          console.log(
            `Is within schedule ${schedule.purpose}? ${isWithinSchedule}`
          );
        }

        if (isWithinSchedule) {
          slot.isScheduled = true;
          slot.schedule = schedule;
          console.log(
            `Marked slot ${slot.time} as scheduled for ${schedule.purpose}`
          );
        }
      });
    });

    console.log('Morning slots after update:', this.morningSlots);
    console.log('Afternoon slots after update:', this.afternoonSlots);
  }

  parseTimeSlot(timeString: string, dateString: string): Date {
    // Create a date object using the selected date instead of today
    const selectedDate = new Date(dateString);
    const [timePart, meridian] = timeString.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);

    if (meridian === 'PM' && hours !== 12) {
      hours += 12;
    } else if (meridian === 'AM' && hours === 12) {
      hours = 0;
    }

    return new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      hours,
      minutes
    );
  }

  resetSchedules(): void {
    this.schedules = [];
    this.generateTimeSlots();
  }

  switchView(view: 'morning' | 'afternoon'): void {
    this.currentView = view;
  }

  getStatusBadgeClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return 'bg-success';
      case 'REJECTED':
        return 'bg-danger';
      case 'PENDING':
      default:
        return 'bg-warning';
    }
  }

  /**
   * Navigates back to the home page.
   */
  goBack() {
    this.router.navigate(['/home']);
  }
}
