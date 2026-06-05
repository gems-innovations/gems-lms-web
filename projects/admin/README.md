# Admin Module - Institution Management

## Overview
The Admin module provides comprehensive institution management functionality for the GEMS LMS platform, following Clean Architecture principles and Angular standalone components patterns.

---

## Architecture

### Folder Structure
```
admin/
├── src/
│   ├── application/           # Use cases (business logic)
│   │   └── institution.usecase.ts
│   ├── domain/                # Domain models and state
│   │   ├── model/
│   │   │   └── institution.ts
│   │   └── state/
│   │       └── institution.state.ts
│   └── infrastructure/        # UI and services
│       ├── services/
│       │   └── institution.service.ts
│       └── ui/
│           ├── components/    # Presentational components
│           ├── containers/    # Smart components
│           ├── forms/
│           └── layouts/
```

### Layer Responsibilities

**Domain Layer**
- Pure TypeScript models and interfaces
- No framework dependencies
- Business rules and validations
- State management (signals)

**Application Layer**
- Use cases coordinate business logic
- RxJS flows for async operations
- State mutations
- Service orchestration

**Infrastructure Layer**
- HTTP services for API communication
- UI components (Angular)
- External integrations
- Framework-specific code

---

## Features Implemented

### ✅ CRUD Operations
- **Create**: Modal-based form with validation
- **Read**: Table view with pagination and search
- **Update**: Pre-populated modal form with effect-based initialization
- **Delete**: Confirmation modal with warning

### ✅ Dashboard
- 4 metric cards: Total Institutions, Active Students, Completion Rate, Peak Usage
- Real-time data from state
- Loading skeletons
- Responsive grid layout

### ✅ Search & Filters
- Debounced search (300ms)
- Real-time filtering
- Clear button
- Integrated with state management

### ✅ UI Components

**Modals (4 types)**
- Create: Large, form-based
- Edit: Large, pre-populated form
- View: Medium, read-only with 4 sections
- Delete: Small, confirmation with warning

**Loading States**
- Skeleton loader with shimmer animation
- Modal spinners during operations
- Empty state illustrations
- Error state with retry

**Feedback**
- Toast notifications (success/error)
- Auto-dismiss (3-5 seconds)
- Slide-in animation

---

## State Management Pattern

Uses Angular signals for reactive state:

```typescript
// State definition
export class InstitutionState {
  private institutionsSignal = signal<IInstitution[]>([]);
  public readonly institutions = this.institutionsSignal.asReadonly();
  
  // Mutations
  setInstitutions(institutions: IInstitution[]): void {
    this.institutionsSignal.set(institutions);
  }
}
```

**Benefits:**
- Fine-grained reactivity
- Automatic change detection
- Type-safe
- Better performance than zone.js

---

## Data Flow

```
User Action
    ↓
Container Component (Smart)
    ↓
Use Case Method
    ↓
RxJS Flow (with operators)
    ↓
HTTP Service
    ↓
API Response
    ↓
State Mutation
    ↓
Signal Update
    ↓
Component Re-render (Automatic)
```

---

## Component Patterns

### Smart Container Pattern
```typescript
@Component({
  selector: 'adm-institution-list-container',
  imports: [/* presentational components */],
  templateUrl: './institution-list-container.html'
})
export class InstitutionListContainer {
  private readonly useCase = inject(InstitutionUseCase);
  
  // Expose computed/signals from use case
  readonly institutions = this.useCase.institutions;
  readonly isLoading = this.useCase.isLoading;
  
  // Handle user actions
  onEdit(institution: IInstitution) {
    this.useCase.openModal('edit', institution.id);
  }
}
```

### Presentational Component Pattern
```typescript
@Component({
  selector: 'adm-institution-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './institution-list.html'
})
export class InstitutionList {
  @Input() institutions: IInstitution[] = [];
  @Input() isLoading = false;
  
  onEdit = output<IInstitution>();
  
  handleEdit(institution: IInstitution): void {
    this.onEdit.emit(institution);
  }
}
```

---

## Form Management

### Current Approach
- Reactive Forms with FormBuilder
- Effect-based pre-population for edit mode
- Controlled via inputs (showActions, initialData)

### Pattern Example
```typescript
export class InstitutionForm {
  initialData = input<IInstitution | null>(null);
  
  constructor() {
    effect(() => {
      const data = this.initialData();
      if (data) {
        this.institutionForm.patchValue({
          name: data.name,
          status: data.status,
          // ... other fields
        });
      }
    });
  }
}
```

---

## Modal System

Uses shared `modal-base` component with consistent API:

```typescript
<lib-modal-base
  [isOpen]="modal().isOpen && modal().mode === 'create'"
  [title]="'New Institution'"
  [size]="'large'"
  [showFooter]="true"
  (close)="onClose()"
>
  <!-- Content -->
  <app-institution-form [showActions]="false" />
  
  <!-- Footer -->
  <div footer class="modal-actions">
    <button class="btn-secondary" (click)="onClose()">Cancel</button>
    <button class="btn-primary" (click)="onCreate()">Create</button>
  </div>
</lib-modal-base>
```

**Modal State Flow:**
1. User clicks action → `useCase.openModal('edit', id)`
2. State updates → `modal.set({ isOpen: true, mode: 'edit', institutionId: id })`
3. Modal component reacts → Shows with appropriate content
4. On success → `useCase.closeModal()` + toast notification

---

## Responsive Design

### Breakpoints
- Desktop: > 1024px (all columns visible)
- Tablet: 768px - 1024px (hide registration date)
- Mobile: < 767px (hide students + date, stack buttons)
- Small: < 480px (compact padding, smaller fonts)

### Mobile-First Considerations
- Touch targets: Minimum 44x44px
- Readable font sizes: Minimum 14px
- Adequate spacing: 8px minimum
- Hamburger-friendly: Vertical button stacks

---

## Accessibility

### Implemented Features
- **ARIA labels**: All icon-only buttons
- **Keyboard navigation**: Tab, Enter, Escape support
- **Focus management**: Trapped in modals, visible indicators
- **Color contrast**: 4.5:1 minimum ratio
- **Screen reader**: Semantic HTML, descriptive labels

### Example
```html
<button 
  type="button" 
  class="btn-icon-action" 
  (click)="handleEdit(institution)"
  aria-label="Edit institution"
  title="Edit"
>
  ✏️
</button>
```

---

## Testing Considerations

### Unit Tests (Not yet implemented)
- Use case flows
- State mutations
- Component logic

### E2E Tests (Not yet implemented)
- Complete CRUD workflows
- Modal interactions
- Search and pagination
- Error handling

---

## Dependencies

### Core Angular
- @angular/core: ^20.3.0
- @angular/common: ^20.3.0
- @angular/forms: ^20.3.0

### Internal
- @gems-lms-web/shared: ^0.0.1
  - ModalBaseComponent
  - ToastService
  - SearchBarComponent

### External
- rxjs: For reactive programming
- tslib: TypeScript helpers

---

## Future Enhancements

### Pending Tasks
- [ ] Migrate to ngx-sub-form pattern
- [ ] Extract reusable form components (lib-input, lib-select)
- [ ] Add unit tests
- [ ] Add E2E tests
- [ ] Performance optimization (virtual scrolling for large tables)
- [ ] Advanced filtering (multi-criteria)
- [ ] Bulk operations (select all, bulk delete)
- [ ] Export functionality (CSV, Excel)

---

## Usage Example

```typescript
// In main app routing
const routes: Routes = [
  {
    path: 'admin/institutions',
    component: InstitutionListContainer
  }
];

// The container automatically:
// 1. Loads institutions on init
// 2. Loads dashboard metrics
// 3. Initializes subscriptions
// 4. Manages modal state
// 5. Handles search/pagination
// 6. Shows toast notifications
```

---

## Contributing

### Code Style
- Follow Angular style guide
- Use standalone components
- Prefer signals over observables for state
- Keep components pure (presentational) or smart (containers)
- No business logic in UI components

### Naming Conventions
- Components: PascalCase + Type suffix (e.g., `InstitutionList`)
- Files: kebab-case (e.g., `institution-list.component.ts`)
- Selectors: Prefix with module (e.g., `adm-institution-list`)
- Use cases: PascalCase + UseCase suffix

### Commit Messages
Follow conventional commits:
- `feat(admin): add bulk delete functionality`
- `fix(admin): correct pagination offset calculation`
- `refactor(admin): extract form validation logic`

---

**Version**: 1.0.0  
**Last Updated**: October 2025  
**Module Owner**: GEMS LMS Team
