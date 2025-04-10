import { Component, OnInit } from '@angular/core';
import { formatTimeTo12Hour } from '../../utils/timeFormatter';
import {
  Schedule,
  ScheduleApiService,
  ScheduleWithBuilding,
} from '../../services/scheduleApi';
import { Room, RoomApiService } from '../../services/roomApi';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { SortColumn, sortData } from '../../utils/sortTable';
import { searchData } from '../../utils/searchTable';

@Component({
  selector: 'app-request',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HttpClientModule,
    FormsModule,
    NgbDropdownModule,
  ],
  templateUrl: './request.component.html',
  styleUrl: './request.component.scss',
})
export class RequestComponent implements OnInit {
  schedules: ScheduleWithBuilding[] = [];
  rooms: Room[] = [];
  isLoading = true;
  errorMessage = '';
  statusOptions: Array<'PENDING' | 'APPROVED' | 'REJECTED'> = [
    'PENDING',
    'APPROVED',
    'REJECTED',
  ];

  searchTerm = '';
  filteredSchedules: ScheduleWithBuilding[] = [];
  sortColumn: SortColumn = { column: '', direction: 'asc' };
  searchColumns = [
    'roomNumber',
    'building',
    'purpose',
    'userName',
    'date',
    'status',
    'startTime',
    'endTime',
  ];

  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  pageSizeOptions = [10, 20, 30];
  paginatedSchedules: ScheduleWithBuilding[] = [];
  Math = Math;

  constructor(
    private scheduleApiService: ScheduleApiService,
    private roomApiService: RoomApiService,
    private router: Router
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
      next: (result: { schedules: ScheduleWithBuilding[]; rooms: Room[] }) => {
        this.schedules = result.schedules;
        this.rooms = result.rooms;

        // Enhance schedules with building information
        this.schedules = this.schedules.map((schedule) => {
          const room = this.rooms.find((r) => r.id === schedule.roomId);
          return {
            ...schedule,
            building: room?.building || 'N/A',
          };
        });

        // Initialize filteredSchedules with all schedules
        this.filteredSchedules = [...this.schedules];

        // Apply filters to the schedules
        this.applyFilters();

        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading data:', error);
        this.errorMessage = 'Failed to load data. Please try again later.';
        this.isLoading = false;
      },
    });
  }

  updateStatus(
    schedule: Schedule,
    newStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  ): void {
    if (schedule.status === newStatus) return; // No change needed

    this.scheduleApiService
      .updateScheduleStatus(schedule.id, newStatus)
      .subscribe({
        next: (updatedSchedule: { id: any; status: any }) => {
          // Update the schedule in our list
          const index = this.schedules.findIndex(
            (s) => s.id === updatedSchedule.id
          );
          if (index !== -1) {
            this.schedules[index].status = updatedSchedule.status;
          }
        },
        error: (error: { message: any }) => {
          console.error('Error updating status:', error);
          this.errorMessage = `Failed to update status: ${error.message}`;
        },
      });
  }

  /**
   * Get the building name by room ID
   */
  getBuildingByRoomId(roomId: number): string {
    if (!roomId || !this.rooms) return 'N/A';
    const room = this.rooms.find((room) => room.id === roomId);
    return room ? room.building : 'N/A';
  }

  /**
   * Format the date string to a more readable format
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
   */
  formatTime(time: string): string {
    return formatTimeTo12Hour(time);
  }

  /**
   * Get the status badge class based on the schedule status
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

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

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

  applyFilters(): void {
    // Safety check
    if (!this.schedules || !this.schedules.length) {
      this.filteredSchedules = [];
      this.paginatedSchedules = [];
      this.totalPages = 1;
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

    // Update filteredSchedules with the result BEFORE calculating pagination
    this.filteredSchedules = result;

    // Calculate total pages AFTER setting filteredSchedules
    this.totalPages = Math.ceil(
      this.filteredSchedules.length / this.itemsPerPage
    );

    // Ensure current page is valid
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }

    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(
      startIndex + this.itemsPerPage,
      this.filteredSchedules.length
    );
    this.paginatedSchedules = this.filteredSchedules.slice(
      startIndex,
      endIndex
    );
  }

  /**
   * Navigates back to the admin page.
   */
  goBack() {
    this.router.navigate(['/admin']);
  }

  /**
   * Change the current page and reapply filters
   * @param page
   */
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.applyFilters();
    }
  }

  /**
   * Change the number of items per page and reset to first page
   * @param event
   */
  changePageSize(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.itemsPerPage = Number(select.value);
    this.currentPage = 1; // Reset to first page when changing page size
    this.applyFilters();
  }

  /**
   * Get the array of page numbers for pagination
   * @returns Array of page numbers to display
   */
  getPageArray(): number[] {
    const pages = [];
    const maxPagesToShow = 5;

    if (this.totalPages <= maxPagesToShow) {
      // Show all pages if there are 5 or fewer
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show limited pages with current page in middle when possible
      if (this.currentPage <= 3) {
        // Current page is close to the beginning
        for (let i = 1; i <= Math.min(maxPagesToShow, this.totalPages); i++) {
          pages.push(i);
        }
      } else if (this.currentPage >= this.totalPages - 2) {
        // Current page is close to the end
        for (
          let i = this.totalPages - maxPagesToShow + 1;
          i <= this.totalPages;
          i++
        ) {
          pages.push(i);
        }
      } else {
        // Current page is in middle, show pages around it
        for (let i = this.currentPage - 2; i <= this.currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }

    return pages;
  }
}
