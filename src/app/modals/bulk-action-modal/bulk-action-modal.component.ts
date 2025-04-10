import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-bulk-action-modal',
  imports: [CommonModule],
  templateUrl: './bulk-action-modal.component.html',
  styleUrl: './bulk-action-modal.component.scss',
})
export class BulkActionModalComponent {
  @Input() actionType: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';
  @Input() count: number = 0;

  constructor(public activeModal: NgbActiveModal) {}

  getIconClass(): string {
    switch (this.actionType) {
      case 'APPROVED':
        return 'bi bi-check-circle-fill text-success';
      case 'REJECTED':
        return 'bi bi-x-circle-fill text-danger';
      case 'PENDING':
      default:
        return 'bi bi-clock-history text-warning';
    }
  }

  getButtonClass(): string {
    switch (this.actionType) {
      case 'APPROVED':
        return 'btn btn-success';
      case 'REJECTED':
        return 'btn btn-danger';
      case 'PENDING':
      default:
        return 'btn btn-warning';
    }
  }

  confirmAction(): void {
    this.activeModal.close(true);
  }
}
