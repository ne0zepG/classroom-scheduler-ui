import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Room {
  id: number;
  roomNumber: string;
  building: string;
  capacity: number;
  hasProjector: boolean;
  hasComputers: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class RoomApiService {
  private apiUrl = 'http://localhost:8080/api/rooms';

  constructor(private http: HttpClient) {}

  // Fetch all rooms from the API
  getAllRooms(): Observable<Room[]> {
    return this.http
      .get<Room[]>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  // Fetch rooms by ID
  getRoomById(id: number): Observable<Room> {
    return this.http
      .get<Room>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Find available rooms based on date and time
  findAvailableRooms(
    date: string,
    startTime: string,
    endTime: string
  ): Observable<Room[]> {
    return this.http
      .get<Room[]>(
        `${this.apiUrl}/available?date=${date}&startTime=${startTime}&endTime=${endTime}`
      )
      .pipe(catchError(this.handleError));
  }

  // Error handling
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
