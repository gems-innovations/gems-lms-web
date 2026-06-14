import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IInstitution, EInstitutionStatus, EBrandingType } from '../../../../domain/model/institution.model';

@Component({
  selector: 'adm-institution-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './institution-details.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './institution-details.scss'
})
export class InstitutionDetailsComponent {
  institution = input.required<IInstitution>();

  statusClass = computed(() => `status-${this.institution().status.toLowerCase()}`);

  statusLabel = computed(() => {
    const statusLabels: Record<EInstitutionStatus, string> = {
      [EInstitutionStatus.ACTIVE]: 'Activa',
      [EInstitutionStatus.SUSPENDED]: 'Suspendida',
      [EInstitutionStatus.PENDING]: 'Pendiente'
    };
    return statusLabels[this.institution().status] || this.institution().status;
  });

  brandingTypeLabel = computed(() => 
    this.institution().branding.type === EBrandingType.LOGO_TEXT ? 'Logo y Texto' : 'Badge de Color'
  );

  institutionInitials = computed(() => 
    this.institution().name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  );

  // Helper computed for metadata
  hasMetadata = computed(() => !!this.institution().metadata);

  metadata = computed(() => this.institution().metadata || {});
}
