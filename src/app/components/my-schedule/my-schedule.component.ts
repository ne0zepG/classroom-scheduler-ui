import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  Schedule,
  ScheduleApiService,
  ScheduleWithBuilding,
} from '../../services/scheduleApi';
import { Room, RoomApiService } from '../../services/roomApi';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SortColumn, sortData } from '../../utils/sortTable';
import { searchData } from '../../utils/searchTable';
import { formatTimeTo12Hour } from '../../utils/timeFormatter';
import { DeleteModalComponent } from '../../modals/delete-modal/delete-modal.component';
import { AddScheduleComponent } from '../add-schedule/add-schedule.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-my-schedule',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule],
  templateUrl: './my-schedule.component.html',
  styleUrl: './my-schedule.component.scss',
})
export class MyScheduleComponent {
  schedules: ScheduleWithBuilding[] = [];
  filteredSchedules: ScheduleWithBuilding[] = [];
  rooms: Room[] = [];
  isLoading = true;
  errorMessage = '';

  // Current user email - hardcoded for now
  currentUserEmail = 'faculty@college.edu';

  // Search and sort properties
  searchTerm = '';
  sortColumn: SortColumn = { column: '', direction: 'asc' };
  searchColumns = [
    'roomNumber',
    'building',
    'courseCode',
    'courseDescription',
    'date',
    'status',
    'startTime',
    'endTime',
  ];

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  pageSizeOptions = [10, 20, 30];
  paginatedSchedules: ScheduleWithBuilding[] = [];
  Math = Math;

  constructor(
    private scheduleApiService: ScheduleApiService,
    private roomApiService: RoomApiService,
    private modalService: NgbModal,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Load schedules by email and rooms in parallel
    forkJoin({
      schedules: this.scheduleApiService.getSchedulesByEmail(
        this.currentUserEmail
      ),
      rooms: this.roomApiService.getAllRooms(),
    }).subscribe({
      next: (result) => {
        this.schedules = result.schedules;
        this.rooms = result.rooms;

        // Enhance schedules with building information for search
        this.schedules = this.schedules.map((schedule) => {
          const room = this.rooms.find((r) => r.id === schedule.roomId);
          return {
            ...schedule,
            building: room?.buildingName || 'N/A',
          };
        });

        // Initialize filteredSchedules with all schedules
        this.filteredSchedules = [...this.schedules];

        // Apply filters to the schedules
        this.applyFilters();

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.errorMessage = 'Failed to load data. Please try again later.';
        this.isLoading = false;
      },
    });
  }

  // Open add schedule modal for requesting a new schedule
  openRequestScheduleModal(): void {
    const modalRef = this.modalService.open(AddScheduleComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });

    // Pass the rooms data to the modal component
    modalRef.componentInstance.rooms = this.rooms;
    modalRef.componentInstance.userId = 1; // This should be dynamic based on auth
    modalRef.componentInstance.userName = this.currentUserEmail;

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
              building: room?.buildingName || 'N/A',
            };
          });

          this.schedules = [...this.schedules, ...schedulesWithBuilding];
        } else {
          // Handle single schedule
          const room = this.rooms.find((r) => r.id === result.roomId);
          this.schedules = [
            ...this.schedules,
            {
              ...result,
              building: room?.buildingName || 'N/A',
            },
          ];
        }

        this.applyFilters();
      }
    });
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

  /**
   * Get the building name by room ID
   */
  getBuildingByRoomId(roomId: number): string {
    if (!roomId || !this.rooms) return 'N/A';
    const room = this.rooms.find((room) => room.id === roomId);
    return room ? room.buildingName : 'N/A';
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
   * Sort the schedules based on the selected column and direction
   */
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

  /**
   * Get the icon class for the sort indicator
   */
  getSortIcon(column: string): string {
    if (this.sortColumn.column !== column) {
      return 'bi-arrow-down-up';
    }
    return this.sortColumn.direction === 'asc'
      ? 'bi-arrow-down'
      : 'bi-arrow-up';
  }

  /**
   * Handle search input change
   */
  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
    this.applyFilters();
  }

  /**
   * Clear the search input and reset filters
   */
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

    this.filteredSchedules = result;

    // Calculate total pages
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
   * Change the current page and reapply filters
   */
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.applyFilters();
    }
  }

  /**
   * Change the number of items per page and reset to first page
   */
  changePageSize(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.itemsPerPage = Number(select.value);
    this.currentPage = 1; // Reset to first page when changing page size
    this.applyFilters();
  }

  /**
   * Get the array of page numbers for pagination
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

  /**
   * Navigates back to the home page
   */
  goBack() {
    this.router.navigate(['/']);
  }
}
