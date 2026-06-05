---
trigger: always_on
---

# Arquitectura del Proyecto GemsLmsWeb

## Estructura General del Proyecto

Este es un proyecto Angular con arquitectura de librerías múltiples que sigue principios de Clean Architecture y separación de responsabilidades por dominio.

### Estructura de Librerías
- **main**: Aplicación principal (SSR habilitado)
- **shared**: Librería compartida con componentes, formularios y utilidades comunes
- **auth**: Módulo de autenticación
- **admin**: Módulo de administración
- **education**: Módulo educativo

## Reglas de Arquitectura por Capa

### 1. Estructura de Directorios por Módulo
Cada módulo debe seguir esta estructura estricta:
```
src/
├── application/          # Casos de uso y lógica de aplicación
├── domain/              # Modelos y estado del dominio
│   ├── model/           # Interfaces y modelos de dominio
│   └── state/           # Estados reactivos con signals
├── infrastructure/       # Implementaciones técnicas
│   ├── services/        # Servicios HTTP y externos
│   └── ui/             # Componentes, formularios, layouts
│       ├── components/  # Componentes reutilizables
│       ├── containers/ # Contenedores que conectan UI con casos de uso
│       ├── forms/      # Formularios específicos del módulo
│       ├── layouts/    # Layouts específicos del módulo
│       ├── pipes/      # Pipes específicos del módulo
│       └── styles/     # Estilos específicos del módulo
└── index.ts            # Exports públicos del módulo
```

### 2. Domain Layer (Capa de Dominio)
- **Modelos**: Solo interfaces, sin implementaciones
- **Estado**: Usar Angular signals para estado reactivo
- **Reglas**:
  - Los modelos deben ser interfaces con `I` como prefijo
  - El estado debe ser inyectable con `providedIn: 'root'`
  - Usar `computed()` para valores derivados
  - Usar `signal()` para estado mutable

### 3. Application Layer (Capa de Aplicación)
- **Casos de uso**: Lógica de negocio y orquestación
- **Reglas**:
  - Inyectar servicios de infraestructura y estado
  - Usar RxJS para flujos asíncronos
  - Implementar `initializeSubscriptions()` y `destroySubscriptions()`
  - Exponer computed signals del estado

### 4. Infrastructure Layer (Capa de Infraestructura)
- **Servicios**: Comunicación con APIs externas
- **UI**: Componentes, formularios y layouts
- **Reglas**:
  - Los servicios deben ser inyectables
  - Los contenedores conectan UI con casos de uso
  - Los formularios deben usar `ngx-sub-form`
  - Los componentes deben ser standalone

### 5. Patrones de Componentes

#### Contenedores
- Conectan formularios/componentes con casos de uso
- Implementan `OnInit` y `OnDestroy`
- Inyectan casos de uso
- Manejan subscripciones

#### Formularios
- Usan `ngx-sub-form` para manejo de formularios
- Implementan interfaces de modelo
- Usan `ReactiveFormsModule`
- Son standalone components

#### Componentes
- Usan `input()` para propiedades
- Son standalone components
- Prefijo específico por módulo (auth, adm, edu, sh)

### 6. Gestión de Estado
- Usar Angular signals para estado local
- Estados globales en servicios inyectables
- Computed signals para valores derivados
- Patrón de setters para actualizaciones

### 7. Routing y Lazy Loading
- Rutas definidas en `index.ts` de cada módulo
- Lazy loading con `loadChildren`
- Rutas anidadas con outlets cuando sea necesario

### 8. Configuración y Entornos
- Variables de entorno en `shared/infrastructure/ui/environments`
- URLs de API centralizadas
- Configuración de producción y desarrollo

### 9. Estilos
- SCSS como preprocesador
- Variables globales en `shared/infrastructure/ui/styles`
- Estilos específicos por módulo
- Componentes standalone con estilos encapsulados

## Estructura de Archivos por Tipo

### Modelos de Dominio
```typescript
export interface IEntityName {
  id: string;
  // propiedades del dominio
}
```

### Estados
```typescript
@Injectable({ providedIn: 'root' })
export class EntityState {
  private readonly _state = signal<IEntityState>({});
  readonly property = computed(() => this._state().property);
  setProperty(value: any) { /* actualización */ }
}
```

### Casos de Uso
```typescript
@Injectable({ providedIn: 'root' })
export class EntityUseCase {
  private service = inject(EntityService);
  private state = inject(EntityState);
  
  readonly property = this.state.property;
  
  action() { /* lógica de negocio */ }
}
```

### Servicios
```typescript
@Injectable({ providedIn: 'root' })
export class EntityService {
  private http = inject(HttpClient);
  
  method(): Observable<Entity> { /* llamadas HTTP */ }
}
```

### Contenedores
```typescript
@Component({
  selector: 'module-container',
  imports: [Component],
  template: `<component [data]="data()" (action)="action($event)" />`
})
export class Container implements OnInit, OnDestroy {
  private useCase = inject(EntityUseCase);
  readonly data = this.useCase.data;
  
  ngOnInit() { this.useCase.initializeSubscriptions(); }
  ngOnDestroy() { this.useCase.destroySubscriptions(); }
}
```

### Formularios
```typescript
@Component({
  selector: 'module-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputComponent],
  providers: subformComponentProviders(Form),
  templateUrl: '<!-- template -->'
})
export class Form {
  private input$ = new Subject<FormModel>();
  @Input() set model(value: FormModel) { this.input$.next(value); }
  @Output() modelUpdate = new Subject<FormModel>();
  
  form = createForm<FormModel>(this, {
    formType: FormType.ROOT,
    input$: this.input$,
    output$: this.modelUpdate,
    formControls: { /* controles */ }
  });
}
```

## 🚨 REGLAS CRÍTICAS DE ARQUITECTURA

### **📁 APPLICATION LAYER - REGLAS ESTRICTAS:**
```
✅ CREAR: UN SOLO Use Case por container
✅ IMPORTANTE: Los casos de uso son los que tienen la lógica para orquestar llamados a servicios y al estado global
✅ INCLUIR: Todas las operaciones del container en un solo archivo
❌ NO CREAR: Use Cases separados para cada operación (get, create, update, delete)
❌ REDUNDANTE: Hacer GetInstitutionsUseCase Y InstitutionCrudUseCases
✅ CORRECTO: Solo InstitutionCrudUseCases con métodos getAll(), getById(), create(), update(), delete()
```

### **🎨 UI LAYER STRUCTURE - REGLAS ESTRICTAS:**
```
✅ CONTAINERS: Solo contienen componentes, NO código chorizo
✅ COMPONENTES: Pequeños, reutilizables, alimentados por shared/ o propios del módulo
✅ MODULARIDAD: Los componentes deben ser cortos y no deben tener lógica de negocio, solamente una estructura HTML, unos estilos y listo
❌ NO CREAR: Containers con lógica
✅ ESTRATEGIA: Container → Componente de Dashboard → Componentes de Table, Metrics, etc.
```

### **🛣️ ROUTING SYSTEM - REGLAS ESTRICTAS:**
```
✅ OBLIGATORIO: index.ts en cada monorepo de projects/
✅ EXPORTAR: Todas las rutas del módulo desde index.ts
✅ ESTRUCTURA: Layouts → Children (containers que son las vistas) y que se inyectan en los outlets del layout
✅ MAIN ROUTES: Solo importar archivos index.ts que contienen las rutas de cada módulo respectivamente
✅ CONTAINERS: Son las vistas lógicas que conectan use cases con components
❌ NO PONER: Rutas individuales en main.routes.ts
❌ PROHIBIDO: Rutas fuera del sistema de index.ts
❌ NO USAR: Módulos de Angular (todo standalone)
```

## 🎯 EJEMPLOS PRÁCTICOS REALES

### **✅ CORRECTO - Application Layer (Basado en código real):**
```typescript
// login.usecase.ts - UN SOLO Use Case con todas las operaciones
@Injectable({ providedIn: 'root' })
export class LoginUseCase {
  private subscriptions = new Subscription();
  private userService = inject(UserService);
  private userState = inject(UserState);

  //#region Computed
  public readonly currentUser = this.userState.currentUser;
  //#endregion

  //#region Actions
  private login$ = new Subject<ILoginCredentials>();
  private loginFlow$ = this.login$.pipe(
    switchMap(credentials => {
      return this.userService.login(credentials).pipe(
        tap(user => this.userState.setCurrentUser(user))
      )
    })
  );
  //#endregion

  //#region Public methods
  login(credentials: ILoginCredentials) {
    this.login$.next(credentials);
  }

  initializeSubscriptions() {
    this.subscriptions.add(this.loginFlow$.subscribe());
  }

  destroySubscriptions() {
    this.subscriptions.unsubscribe();
  }
  //#endregion
}
```

### **✅ CORRECTO - Container Structure (Basado en código real):**
```typescript
// login-form-container.ts - Container simple que conecta use case con form
@Component({
  selector: 'auth-login-form-container',
  imports: [LoginForm],
  templateUrl: './login-form-container.html'
})
export class LoginFormContainer implements OnInit, OnDestroy {
  private readonly loginUseCase = inject(LoginUseCase);

  public readonly currentUser = this.loginUseCase.currentUser;

  ngOnInit() {
    this.loginUseCase.initializeSubscriptions();
  }

  ngOnDestroy() {
    this.loginUseCase.destroySubscriptions();
  }

  login(credentials: ILoginCredentials) {
    this.loginUseCase.login(credentials);
  }
}
```

### **✅ CORRECTO - Form Structure (Basado en código real):**
```typescript
// login-form.ts - Form con ngx-sub-form
@Component({
  selector: 'auth-login-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputComponent],
  providers: subformComponentProviders(LoginForm),
  templateUrl: './login-form.html',
  styleUrl: './login-form.scss'
})
export class LoginForm {
  private input$: Subject<ILoginCredentials | undefined> = new Subject();
  public onSubmit = output<ILoginCredentials>();
  
  @Input() set model(value: ILoginCredentials | undefined) {
    this.input$.next(value);
  }

  private disabled$: Subject<boolean> = new Subject();
  @Input() set disabled(value: boolean | undefined) {
    this.disabled$.next(!!value);
  }

  @Output() modelUpdate: Subject<ILoginCredentials> = new Subject();

  public form = createForm<ILoginCredentials>(this, {
    formType: FormType.ROOT,
    input$: this.input$,
    output$: this.modelUpdate,
    disabled$: this.disabled$,
    formControls: {
      email: new FormControl(null, [Validators.required, Validators.email]),
      password: new FormControl(null, [Validators.required, Validators.minLength(8)]),
    },
  });

  submit(): void {
    if (this.form.formGroup.valid) {
      this.onSubmit.emit(this.form.formGroup.value);
    }
  }
}
```

### **✅ CORRECTO - State Structure (Basado en código real):**
```typescript
// user.state.ts - Estado con signals
@Injectable({
  providedIn: 'root'
})
export class UserState {
  private readonly _state = signal<IUserState>({
    users: [],
    currentUser: null,
  });

  //#region Computed
  readonly currentUser = computed(() => this._state().currentUser);
  //#endregion

  //#region Setters
  setCurrentUser(user: IUser) {
    this._state.update(state => ({
      ...state,
      currentUser: user,
      lastUpdated: new Date()
    }));
  }
  //#endregion
}
```

### **✅ CORRECTO - Routing Structure (Basado en código real):**
```typescript
// projects/auth/src/index.ts - SOLO RUTAS
import { Routes } from '@angular/router';
import { LoginLayout } from './infrastructure/ui/layouts/login-layout/login-layout';

export const routes: Routes = [
  {
    path: 'signin',
    component: LoginLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/login-aside-container/login-aside-container').then(m => m.LoginAsideContainer),
        outlet: 'right'
      },
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/login-form-container/login-form-container').then(m => m.LoginFormContainer),
        outlet: 'left'
      }
    ]
  }
];

// projects/main/src/app.routes.ts - SOLO IMPORTAR RUTAS
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('auth').then(m => m.routes)
  }
];
```

