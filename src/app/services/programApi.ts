import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Program {
  id: number;
  name: string;
  code: string;
  departmentId: number;
  departmentName: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProgramApiService {
  private apiUrl = 'http://localhost:8080/api/programs';

  constructor(private http: HttpClient) {}

  getAllPrograms(): Observable<Program[]> {
    return this.http
      .get<Program[]>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  getProgramById(id: number): Observable<Program> {
    return this.http
      .get<Program>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  getProgramsByDepartment(departmentId: number): Observable<Program[]> {
    return this.http
      .get<Program[]>(`${this.apiUrl}/department/${departmentId}`)
      .pipe(catchError(this.handleError));
  }

  createProgram(program: Program): Observable<Program> {
    return this.http
      .post<Program>(this.apiUrl, program)
      .pipe(catchError(this.handleError));
  }

  updateProgram(id: number, program: Program): Observable<Program> {
    return this.http
      .put<Program>(`${this.apiUrl}/${id}`, program)
      .pipe(catchError(this.handleError));
  }

  deleteProgram(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

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
