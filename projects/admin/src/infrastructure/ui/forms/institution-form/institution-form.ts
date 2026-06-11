import { Component, computed, effect, input, output, signal } from '@angular/core';
import {
  FormField,
  email,
  form,
  maxLength,
  minLength,
  pattern,
  required
} from '@angular/forms/signals';
import { ColorPickerComponent } from '@gems-lms-web/shared';
import {
  ICreateInstitutionRequest,
  EInstitutionType,
  EBrandingType,
  ESubscriptionType
} from '../../../../domain/model/institution';

export interface InstitutionFormValue {
  name: string;
  type: EInstitutionType;
  colorPrimary: string;
  colorSecondary: string;
  logoUrl: string;
  darkMode: boolean;
  description: string;
  website: string;
  contactEmail: string;
  phoneNumber: string;
  address: string;
  subscriptionType: ESubscriptionType;
  maxUsers: number | null;
}

const DEFAULTS: InstitutionFormValue = {
  name: '',
  type: EInstitutionType.UNIVERSITY,
  colorPrimary: '#6C63FF',
  colorSecondary: '#1E1B4B',
  logoUrl: '',
  darkMode: false,
  description: '',
  website: '',
  contactEmail: '',
  phoneNumber: '',
  address: '',
  subscriptionType: ESubscriptionType.BASIC,
  maxUsers: null
};

@Component({
  selector: 'adm-institution-form',
  imports: [FormField, ColorPickerComponent],
  templateUrl: './institution-form.html',
  styleUrl: './institution-form.scss'
})
export class InstitutionForm {
  readonly model = input<InstitutionFormValue | undefined>();
  readonly disabled = input<boolean | undefined>(false);
  readonly submitButtonText = input<string>('Crear Institución');

  readonly onSubmit = output<ICreateInstitutionRequest>();
  readonly onCancel = output<void>();

  readonly institutionTypes: { value: EInstitutionType; label: string; icon: string }[] = [
    { value: EInstitutionType.UNIVERSITY, label: 'Universidad', icon: '🎓' },
    { value: EInstitutionType.COLLEGE, label: 'Colegio', icon: '🏫' },
    { value: EInstitutionType.SCHOOL, label: 'Escuela', icon: '📚' },
    { value: EInstitutionType.INSTITUTE, label: 'Instituto', icon: '🏛️' },
    { value: EInstitutionType.ACADEMY, label: 'Academia', icon: '⚡' },
    { value: EInstitutionType.CENTER, label: 'Centro', icon: '🏢' }
  ];

  readonly subscriptionTypes: { value: ESubscriptionType; label: string; description: string }[] = [
    { value: ESubscriptionType.BASIC, label: 'Basic', description: 'Hasta 500 usuarios' },
    { value: ESubscriptionType.PREMIUM, label: 'Premium', description: 'Hasta 10,000 usuarios' },
    { value: ESubscriptionType.ENTERPRISE, label: 'Enterprise', description: 'Sin límite' }
  ];

  private readonly formModel = signal<InstitutionFormValue>({ ...DEFAULTS });

  readonly iform = form(this.formModel, p => {
    required(p.name);
    minLength(p.name, 2);
    maxLength(p.name, 200);
    required(p.type);
    required(p.colorPrimary);
    pattern(p.colorPrimary, /^#[0-9A-Fa-f]{6}$/);
    pattern(p.colorSecondary, /^#[0-9A-Fa-f]{6}$/);
    pattern(p.logoUrl, /^https?:\/\/.+/);
    maxLength(p.description, 1000);
    pattern(p.website, /^https?:\/\/.+/);
    email(p.contactEmail);
    maxLength(p.contactEmail, 100);
    pattern(p.phoneNumber, /^\+?[\d\s\-()+]+$/);
    maxLength(p.phoneNumber, 20);
    maxLength(p.address, 500);
    required(p.subscriptionType);
  });

  protected readonly avatarInitials = computed(() => {
    const name = this.formModel().name;
    return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2) || 'IN';
  });

  constructor() {
    effect(() => {
      const value = this.model();
      if (value) {
        this.formModel.set({ ...value });
      }
    });
  }

  protected isInvalid(field: () => { invalid(): boolean; touched(): boolean }): boolean {
    const state = field();
    return state.invalid() && state.touched();
  }

  protected setType(type: EInstitutionType): void {
    this.formModel.update(m => ({ ...m, type }));
  }

  protected setSubscription(subscriptionType: ESubscriptionType): void {
    this.formModel.update(m => ({ ...m, subscriptionType }));
  }

  protected toggleDarkMode(darkMode: boolean): void {
    this.formModel.update(m => ({ ...m, darkMode }));
  }

  protected setMaxUsers(raw: string): void {
    const parsed = Number(raw);
    const maxUsers = raw === '' || Number.isNaN(parsed) ? null : Math.max(1, Math.trunc(parsed));
    this.formModel.update(m => ({ ...m, maxUsers }));
  }

  submit(): void {
    if (this.iform().valid()) {
      const v = this.formModel();
      const request: ICreateInstitutionRequest = {
        name: v.name,
        type: v.type,
        branding: {
          type: v.logoUrl ? EBrandingType.LOGO_TEXT : EBrandingType.COLOR_BADGE,
          logoUrl: v.logoUrl || undefined,
          colorPrimary: v.colorPrimary,
          colorSecondary: v.colorSecondary || undefined,
          darkMode: v.darkMode
        },
        metadata: {
          description: v.description || undefined,
          website: v.website || undefined,
          contactEmail: v.contactEmail || undefined,
          phoneNumber: v.phoneNumber || undefined,
          address: v.address || undefined,
          subscriptionType: v.subscriptionType,
          maxUsers: v.maxUsers ?? undefined
        }
      };
      this.onSubmit.emit(request);
    } else {
      this.iform().markAsTouched();
    }
  }

  cancel(): void {
    this.resetForm();
    this.onCancel.emit();
  }

  resetForm(): void {
    this.formModel.set({ ...DEFAULTS });
  }
}
