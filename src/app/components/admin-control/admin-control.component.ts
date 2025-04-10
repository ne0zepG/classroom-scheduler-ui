import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-control',
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-control.component.html',
  styleUrl: './admin-control.component.scss',
})
export class AdminControlComponent {}
