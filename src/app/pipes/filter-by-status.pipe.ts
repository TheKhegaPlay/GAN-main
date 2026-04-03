import { Pipe, PipeTransform } from '@angular/core';
import { Evidence, EvidenceStatus } from '../models/forensic.models';

@Pipe({
  name: 'filterByStatus',
  standalone: true
})
export class FilterByStatusPipe implements PipeTransform {
  transform(evidences: Evidence[], status: EvidenceStatus): Evidence[] {
    if (!evidences) return [];
    return evidences.filter(e => e.status === status);
  }
}
