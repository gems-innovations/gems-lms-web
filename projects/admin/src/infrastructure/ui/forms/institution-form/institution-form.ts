import { Component, Output, Input, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { subformComponentProviders, createForm, FormType } from 'ngx-sub-form';
import { output } from '@angular/core';
import { ColorPickerComponent } from '@gems-lms-web/shared';
import {
  ICreateInstitutionRequest,
  EInstitutionType,
  EInstitutionStatus,
  EBrandingType,
  ESubscriptionType
} from '../../../../domain/model/institution';

export interface InstitutionFormValue {
  name: string;
  type: EInstitutionType;
  colorPrimary: string;
  colorSecondary: string | null;
  logoUrl: string | null;
  darkMode: boolean;
  description: string | null;
  website: string | null;
  contactEmail: string | null;
  phoneNumber: string | null;
  address: string | null;
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
  standalone: true,
  imports: [ReactiveFormsModule, ColorPickerComponent],
  providers: subformComponentProviders(InstitutionForm),
  templateUrl: './institution-form.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './institution-form.scss'
})
export class InstitutionForm {
  // ngx-sub-form requires traditional @Input/@Output
  private input$: Subject<InstitutionFormValue | undefined> = new Subject();
  @Input() set model(value: InstitutionFormValue | undefined) { this.input$.next(value); }

  private disabled$: Subject<boolean> = new Subject();
  @Input() set disabled(value: boolean | undefined) { this.disabled$.next(!!value); }

  @Input() submitButtonText = 'Crear Institución';

  @Output() modelUpdate: Subject<InstitutionFormValue> = new Subject();
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

  form = createForm<InstitutionFormValue>(this, {
    formType: FormType.ROOT,
    input$: this.input$,
    output$: this.modelUpdate,
    disabled$: this.disabled$,
    formControls: {
      name: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]),
      type: new FormControl<EInstitutionType>(EInstitutionType.UNIVERSITY, [Validators.required]),
      colorPrimary: new FormControl('#6C63FF', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]),
      colorSecondary: new FormControl('#1E1B4B', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]),
      logoUrl: new FormControl('', [Validators.pattern(/^https?:\/\/.+/)]),
      darkMode: new FormControl<boolean>(false),
      description: new FormControl('', [Validators.maxLength(1000)]),
      website: new FormControl('', [Validators.pattern(/^https?:\/\/.+/)]),
      contactEmail: new FormControl('', [Validators.email, Validators.maxLength(100)]),
      phoneNumber: new FormControl('', [Validators.pattern(/^\+?[\d\s\-()+]+$/), Validators.maxLength(20)]),
      address: new FormControl('', [Validators.maxLength(500)]),
      subscriptionType: new FormControl<ESubscriptionType>(ESubscriptionType.BASIC, [Validators.required]),
      maxUsers: new FormControl<number | null>(null, [Validators.min(1)])
    }
  });

  get f() { return this.form.formGroup.controls; }

  get avatarInitials(): string {
    const name = this.f['name'].value || '';
    return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().substring(0, 2) || 'IN';
  }

  get selectedTypeLabel(): string {
    return this.institutionTypes.find(t => t.value === this.f['type'].value)?.label ?? '';
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.formGroup.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  submit(): void {
    if (this.form.formGroup.valid) {
      const v = this.form.formGroup.value;
      const request: ICreateInstitutionRequest = {
        name: v.name!,
        type: v.type!,
        branding: {
          type: v.logoUrl ? EBrandingType.LOGO_TEXT : EBrandingType.COLOR_BADGE,
          logoUrl: v.logoUrl || undefined,
          colorPrimary: v.colorPrimary!,
          colorSecondary: v.colorSecondary || undefined,
          darkMode: v.darkMode ?? false
        },
        metadata: {
          description: v.description || undefined,
          website: v.website || undefined,
          contactEmail: v.contactEmail || undefined,
          phoneNumber: v.phoneNumber || undefined,
          address: v.address || undefined,
          subscriptionType: v.subscriptionType ?? ESubscriptionType.BASIC,
          maxUsers: v.maxUsers ?? undefined
        }
      };
      this.onSubmit.emit(request);
    } else {
      Object.values(this.form.formGroup.controls).forEach(c => c.markAsTouched());
    }
  }

  cancel(): void {
    this.resetForm();
    this.onCancel.emit();
  }

  resetForm(): void {
    this.form.formGroup.reset(DEFAULTS);
  }
}
