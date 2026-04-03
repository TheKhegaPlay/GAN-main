import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Evidence } from '../models/forensic.models';

@Component({
  selector: 'app-evidence-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evidence-item.component.html',
  styleUrls: ['./evidence-item.component.css']
})
export class EvidenceItemComponent {
  @Input() evidence!: Evidence;
  @Output() advance = new EventEmitter<string>(); // emits evidenceId
  @Output() remove = new EventEmitter<string>();  // emits evidenceId

  onAdvance() {
    this.advance.emit(this.evidence.id);
  }

  onRemove() {
    this.remove.emit(this.evidence.id);
  }
}
