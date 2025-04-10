import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin } from 'rxjs';
import { Room, RoomApiService } from '../../services/roomApi';
import {
  Schedule,
  ScheduleApiService,
  ScheduleWithBuilding,
} from '../../services/scheduleApi';
import { searchData } from '../../utils/searchTable';
import { SortColumn, sortData } from '../../utils/sortTable';
import { formatTimeTo12Hour } from '../../utils/timeFormatter';
import { AddScheduleComponent } from '../add-schedule/add-schedule.component';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
})
export class ScheduleComponent implements OnInit {
  schedules: ScheduleWithBuilding[] = [];
  filteredSchedules: ScheduleWithBuilding[] = [];
  rooms: Room[] = [];
  isLoading = true;
  errorMessage = '';

  // Search and sort properties
  searchTerm = '';
  sortColumn: SortColumn = { column: '', direction: 'asc' };
  searchColumns = [
    'roomNumber',
    'building',
    'purpose',
    'date',
    'status',
    'startTime',
    'endTime',
  ];

  constructor(
    private scheduleApiService: ScheduleApiService,
    private roomApiService: RoomApiService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Load schedules and rooms in parallel for better performance
    forkJoin({
      schedules: this.scheduleApiService.getAllSchedules(),
      rooms: this.roomApiService.getAllRooms(),
    }).subscribe({
      next: (result) => {
        this.schedules = result.schedules;
        this.rooms = result.rooms;

        // Enhance schedules with building information for search
        this.schedules = this.schedules.map((schedules) => {
          const room = this.rooms.find((r) => r.id === schedules.roomId);
          return {
            ...schedules,
            building: room?.building || 'N/A',
          };
        });

        // Initialize filteredSchedules with all schedules
        this.filteredSchedules = [...this.schedules];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.errorMessage = 'Failed to load data. Please try again later.';
        this.isLoading = false;
      },
    });
  }

  // Open add schedule modal
  openAddScheduleModal(): void {
    // For debugging and check if rooms are loaded
    console.log('Opening modal...');
    console.log('Rooms available:', this.rooms.length);

    const modalRef = this.modalService.open(AddScheduleComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });

    // Pass the rooms data to the modal component
    modalRef.componentInstance.rooms = this.rooms;

    // Subscribe to the result when modal is closed
    modalRef.closed.subscribe((result: Schedule | Schedule[]) => {
      if (result) {
        console.log('New schedule(s) added:', result);

        if (Array.isArray(result)) {
          // Handle array of schedules
          const schedulesWithBuilding = result.map((schedule) => {
            const room = this.rooms.find((r) => r.id === schedule.roomId);
            return {
              ...schedule,
              building: room?.building || 'N/A',
            };
          });

          this.schedules = [...this.schedules, ...schedulesWithBuilding];
        } else {
          // Handle single schedule (backwards compatibility)
          const room = this.rooms.find((r) => r.id === result.roomId);
          this.schedules = [
            ...this.schedules,
            {
              ...result,
              building: room?.building || 'N/A',
            },
          ];
        }

        this.applyFilters();
      }
    });
  }

  // Open edit schedule modal
  openEditScheduleModal(schedule: ScheduleWithBuilding): void {
    console.log('Opening edit modal for schedule:', schedule.id);

    // Create a clean schedule object without the building property
    const cleanSchedule: Schedule = {
      id: schedule.id,
      roomId: schedule.roomId,
      roomNumber: schedule.roomNumber,
      userId: schedule.userId,
      userName: schedule.userName,
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      purpose: schedule.purpose,
      status: schedule.status,
    };

    const modalRef = this.modalService.open(AddScheduleComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });

    // Pass data to the modal component
    modalRef.componentInstance.rooms = this.rooms;
    modalRef.componentInstance.isEditMode = true;
    modalRef.componentInstance.existingSchedule = cleanSchedule;

    // Handle the result when modal is closed
    modalRef.closed.subscribe((updatedSchedule: Schedule) => {
      if (updatedSchedule) {
        console.log('Schedule updated:', updatedSchedule);

        // Find and update the schedule in the list
        const index = this.schedules.findIndex(
          (b) => b.id === updatedSchedule.id
        );
        if (index !== -1) {
          // Update with building info for search
          const room = this.rooms.find((r) => r.id === updatedSchedule.roomId);
          this.schedules[index] = {
            ...updatedSchedule,
            building: room?.building || 'N/A',
          };
          this.applyFilters();
        }
      }
    });
  }

  // Delete schedule method
  deleteSchedule(id: number): void {
    const schedule = this.schedules.find((b) => b.id === id);
    if (!schedule) return;

    const modalRef = this.modalService.open(DeleteModalComponent, {
      centered: true,
      backdrop: 'static',
    });

    // Pass data to the delete modal
    modalRef.componentInstance.itemId = id;
    modalRef.componentInstance.itemName = schedule.purpose;
    modalRef.componentInstance.roomNumber = schedule.roomNumber;
    modalRef.componentInstance.building = this.getBuildingByRoomId(
      schedule.roomId
    );
    modalRef.componentInstance.date = this.formatDate(schedule.date);
    modalRef.componentInstance.startTime = this.formatTime(schedule.startTime);
    modalRef.componentInstance.endTime = this.formatTime(schedule.endTime);

    // Handle the result when modal is closed
    modalRef.closed.subscribe((confirmedId: number) => {
      if (confirmedId === id) {
        this.scheduleApiService.deleteSchedule(id).subscribe({
          next: () => {
            // Update the main schedules array
            this.schedules = this.schedules.filter(
              (schedule) => schedule.id !== id
            );

            // If no search or sort is applied, directly update filtered schedules too
            if (!this.searchTerm && !this.sortColumn.column) {
              this.filteredSchedules = [...this.schedules];
            } else {
              // Otherwise apply filters to get the updated list
              this.applyFilters();
            }
          },
          error: (error: any) => {
            console.error('Error deleting schedule:', error);
            this.errorMessage = 'Failed to delete schedule. Please try again.';
          },
        });
      }
    });
  }

  /**
   * Get the status badge class based on the schedule status
   * @param status
   * @returns
   */
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
   * Get the building name by room ID
   * @param roomId
   * @returns
   */
  getBuildingByRoomId(roomId: number): string {
    if (!roomId || !this.rooms) return 'N/A';
    const room = this.rooms.find((room) => room.id === roomId);
    return room ? room.building : 'N/A';
  }

  /**
   * Format the date string to a more readable format
   * @param dateString
   * @returns
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  }

  /**
   * Format the time string to a 12-hour format
   * @param time
   * @returns
   */
  formatTime(time: string): string {
    return formatTimeTo12Hour(time);
  }

  // Sort and search methods
  sort(column: string): void {
    if (this.sortColumn.column === column) {
      // Toggle direction if same column is clicked
      this.sortColumn.direction =
        this.sortColumn.direction === 'asc' ? 'desc' : 'asc';
    } else {
      // Default to ascending for new column
      this.sortColumn = { column, direction: 'asc' };
    }
    this.applyFilters();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn.column !== column) {
      return 'bi-arrow-down-up';
    }
    return this.sortColumn.direction === 'asc'
      ? 'bi-arrow-down'
      : 'bi-arrow-up';
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  /**
   * Apply filters to the schedules based on search term and sort column
   */
  applyFilters(): void {
    // Safety check to ensure schedules exists
    if (!this.schedules || !this.schedules.length) {
      this.filteredSchedules = [];
      return;
    }

    // First search the data
    let result = [...this.schedules];

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      result = searchData(result, this.searchTerm, this.searchColumns);
    }

    // Then sort the filtered data
    if (this.sortColumn.column) {
      result = sortData(result, this.sortColumn);
    }

    this.filteredSchedules = result;
  }
}
