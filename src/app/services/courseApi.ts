import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Course {
  id: number;
  courseCode: string;
  description: string;
  programId: number;
  programName: string;
}

@Injectable({
  providedIn: 'root',
})
export class CourseApiService {
  private apiUrl = 'http://localhost:8080/api/courses';

  constructor(private http: HttpClient) {}

  getAllCourses(): Observable<Course[]> {
    return this.http
      .get<Course[]>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  getCourseById(id: number): Observable<Course> {
    return this.http
      .get<Course>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  getCoursesByProgram(programId: number): Observable<Course[]> {
    return this.http
      .get<Course[]>(`${this.apiUrl}/program/${programId}`)
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
