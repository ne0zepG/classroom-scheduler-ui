import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-delete-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delete-modal.component.html',
  styleUrl: './delete-modal.component.scss',
})
export class DeleteModalComponent {
  @Input() itemId: number = 0;
  @Input() itemName: string = '';
  @Input() roomNumber: string = '';
  @Input() building: string = '';
  @Input() date: string = '';
  @Input() startTime: string = '';
  @Input() endTime: string = '';

  constructor(public activeModal: NgbActiveModal) {}

  confirmDelete(): void {
    this.activeModal.close(this.itemId);
  }

  cancel(): void {
    this.activeModal.dismiss('cancel');
  }
}
