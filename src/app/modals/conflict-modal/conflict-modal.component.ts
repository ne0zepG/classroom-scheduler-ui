import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-conflict-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './conflict-modal.component.html',
  styleUrl: './conflict-modal.component.scss',
})
export class ConflictModalComponent {
  @Input() message: string = '';

  constructor(public activeModal: NgbActiveModal) {}

  close(): void {
    this.activeModal.close();
  }

  dismiss(): void {
    this.activeModal.dismiss('Cross click');
  }
}
