import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Evidence } from '../models/forensic.models';
import { EvidenceItemComponent } from './evidence-item.component';

@Component({
  selector: 'app-evidence-column',
  standalone: true,
  imports: [CommonModule, FormsModule, EvidenceItemComponent],
  templateUrl: './evidence-column.component.html',
  styleUrls: ['./evidence-column.component.css']
})
export class EvidenceColumnComponent {
  @Input() caseId!: string;
  @Input() title = '';
  @Input() status!: string;
  @Input() evidences: Evidence[] = [];

  @Output() add = new EventEmitter<{ filename: string; ganModel: string; status: string }>();
  @Output() advance = new EventEmitter<string>(); // evidenceId
  @Output() remove = new EventEmitter<string>();  // evidenceId

  newFilename = '';
  newModel = 'ESRGAN';

  onAdd() {
    if (!this.newFilename.trim()) return;
    this.add.emit({ filename: this.newFilename.trim(), ganModel: this.newModel, status: this.status as any });
    this.newFilename = '';
  }

  onAdvance(evId: string) {
    this.advance.emit(evId);
  }

  onRemove(evId: string) {
    this.remove.emit(evId);
  }
}
