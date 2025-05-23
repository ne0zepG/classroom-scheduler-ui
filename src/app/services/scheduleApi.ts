import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Schedule {
  id: number;
  roomId: number;
  roomNumber: string;
  userId: number;
  userName: string;
  date: string;
  startTime: string;
  endTime: string;
  courseId: number;
  courseCode: string;
  courseDescription: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

// Add a new interface for recurring schedule creation
export interface RecurringScheduleRequest {
  baseSchedule: Omit<Schedule, 'id' | 'date'>;
  recurrencePattern: {
    startDate: string;
    endDate: string;
    daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
  };
}

// Extended interface for UI display purposes
export interface ScheduleWithBuilding extends Schedule {
  building?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ScheduleApiService {
  private apiUrl = 'http://localhost:8080/api/schedules';

  constructor(private http: HttpClient) {}

  // Get all schedules from the API
  getAllSchedules(): Observable<Schedule[]> {
    console.log('Fetching all schedules from API...');
    return this.http
      .get<Schedule[]>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  // Get schedules by ID
  getScheduleById(id: number): Observable<Schedule> {
    return this.http
      .get<Schedule>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Get schedules by user ID
  getSchedulesByEmail(email: string): Observable<Schedule[]> {
    return this.http
      .get<Schedule[]>(`${this.apiUrl}/email/${email}`)
      .pipe(catchError(this.handleError));
  }

  // Create a new schedule
  createSchedule(schedule: Schedule): Observable<Schedule> {
    return this.http
      .post<Schedule>(this.apiUrl, schedule)
      .pipe(catchError(this.handleError));
  }

  // Update an existing schedule
  updateSchedule(id: number, schedule: Schedule): Observable<Schedule> {
    return this.http
      .put<Schedule>(`${this.apiUrl}/${id}`, schedule)
      .pipe(catchError(this.handleError));
  }

  // Update schedule status
  updateScheduleStatus(
    id: number,
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
  ): Observable<Schedule> {
    return this.http
      .patch<Schedule>(`${this.apiUrl}/${id}/status?status=${status}`, {})
      .pipe(catchError(this.handleError));
  }

  // Delete a schedule
  deleteSchedule(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Create a recurring schedule
  createRecurringSchedule(
    recurringRequest: RecurringScheduleRequest
  ): Observable<Schedule[]> {
    return this.http
      .post<Schedule[]>(`${this.apiUrl}/recurring`, recurringRequest)
      .pipe(catchError(this.handleError));
  }

  // Update schedule status in batch
  updateScheduleStatusBatch(
    ids: number[],
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
  ): Observable<Schedule[]> {
    return this.http
      .patch<Schedule[]>(`${this.apiUrl}/batch/status`, {
        ids: ids,
        status: status,
      })
      .pipe(catchError(this.handleError));
  }

  // Delete schedules in batch
  deleteSchedulesBatch(ids: number[]): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/batch`, { body: ids });
  }

  // Error handling
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error - extract the message from response body
      if (
        error.error &&
        typeof error.error === 'object' &&
        error.error.message
      ) {
        // Extract message from JSON error object
        errorMessage = error.error.message;
      } else if (typeof error.error === 'string') {
        try {
          // Try to parse error if it's a JSON string
          const errorObj = JSON.parse(error.error);
          if (errorObj.message) {
            errorMessage = errorObj.message;
          } else {
            errorMessage = error.error;
          }
        } catch (e) {
          // If not valid JSON, use the string as is
          errorMessage = error.error;
        }
      } else {
        // Default fallback message
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }

    // Create an enhanced error with status code for better handling in components
    const enhancedError = new Error(errorMessage) as any;
    enhancedError.status = error.status;

    console.error('API Error:', errorMessage);
    return throwError(() => enhancedError);
  }
}
