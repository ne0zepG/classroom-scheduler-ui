import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-control',
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-control.component.html',
  styleUrl: './admin-control.component.scss',
})
export class AdminControlComponent {
  constructor(private router: Router) {}

  /**
   * Navigates to the home page.
   */
  goBack() {
    this.router.navigate(['/home']);
  }
}
