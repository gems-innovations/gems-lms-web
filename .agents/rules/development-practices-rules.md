---
trigger: always_on
---

# Prácticas de Desarrollo - GemsLmsWeb

## 🚨 REGLAS CRÍTICAS DE DESARROLLO

### **DURANTE EL DESARROLLO:**

```
✅ MODULARIDAD: Dividir funcionalidades en componentes pequeños
✅ REUTILIZACIÓN: Aprovechar shared/ para elementos comunes y también reutilizar dentro de cada modulo lo mas que se pueda
✅ RESPONSABILIDAD ÚNICA: Cada componente una sola responsabilidad
✅ NAMING: Containers terminan en -container.ts
✅ ROUTING: Siempre usar index.ts para organizar rutas
✅ ARQUITECTURA: Respetar separación hexagonal estrictamente
✅ ANGULAR CLI: Usar ng generate component para crear componentes standalone
✅ STANDALONE: Todos los componentes standalone (NO @NgModule)
✅ REGIONES: Usar //#region y //#endregion para organizar código
✅ INJECT: Usar inject() en lugar de constructor injection
✅ SIGNALS: Usar signals para estado reactivo
✅ NGX-SUB-FORM: Usar ngx-sub-form para formularios complejos
✅ TYPESCRIPT: Usar tipos estrictos, evitar any
✅ INTERFACES: Definir interfaces para todos los modelos
✅ OBSERVABLES: Manejar subscripciones correctamente
✅ ERROR HANDLING: Implementar manejo de errores consistente
✅ VALIDATION: Validar datos en formularios y servicios
✅ PERFORMANCE: Optimizar rendimiento con OnPush y signals
✅ ACCESSIBILITY: Incluir atributos ARIA y navegación por teclado
✅ TESTING: Escribir tests unitarios para cada componente
✅ DOCUMENTATION: Documentar APIs públicas
✅ CLEAN CODE: Código limpio, legible y mantenible
❌ NO CREAR: Código monolítico en containers
❌ NO MEZCLAR: Lógica de presentación con lógica de negocio
❌ NO DUPLICAR: Use cases para operaciones que van juntas
❌ NO USAR: Módulos de Angular (@NgModule)
❌ NO CREAR: Componentes sin Angular CLI
❌ NO COMENTAR: El código (regla del usuario)
❌ NO USAR: Constructor injection
❌ NO USAR: Observables para estado local (usar signals)
❌ NO USAR: any, unknown sin justificación
❌ NO USAR: console.log en producción
❌ NO USAR: Magic numbers o strings
❌ NO USAR: Código duplicado
❌ NO USAR: Funciones muy largas (>50 líneas)
❌ NO USAR: Clases muy grandes (>200 líneas)
❌ NO USAR: Imports no utilizados
❌ NO USAR: Variables no utilizadas
❌ NO USAR: Código muerto o comentado
```

### **DESPUÉS DE COMPLETAR CUALQUIER TAREA:**

```
PASO 1: Verificar que sigue la arquitectura hexagonal
PASO 2: Confirmar que no hay código duplicado o redundante
PASO 3: Verificar que los exports son correctos según las reglas
PASO 4: Confirmar que las rutas están en index.ts
PASO 5: Verificar que los componentes son standalone
PASO 6: Verificar que no hay errores de linting
PASO 7: Confirmar que el código es accesible
PASO 8: Verificar que el rendimiento es óptimo
PASO 9: Documentar cambios importantes
```

## 📝 CONVENCIONES DE NOMBRAMIENTO

### **Interfaces y Tipos**
```typescript
// OBLIGATORIO: Prefijo I para interfaces
export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

// OBLIGATORIO: Prefijo T para tipos
export type TUserRole = 'admin' | 'user' | 'guest';

// OBLIGATORIO: Prefijo E para enums
export enum EUserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending'
}
```

### **Clases y Servicios**
```typescript
// OBLIGATORIO: PascalCase con sufijo específico
export class UserService { }           // Servicios
export class UserState { }             // Estados
export class UserUseCase { }           // Casos de uso
export class UserComponent { }         // Componentes
export class UserForm { }              // Formularios
export class UserContainer { }         // Contenedores
export class UserLayout { }            // Layouts
export class UserPipe { }              // Pipes
```

### **Archivos y Directorios**
```
// OBLIGATORIO: kebab-case para archivos
user.service.ts
user.state.ts
user.usecase.ts
user.ts
user-form.ts
user-form-container.ts
login-layout.ts
capitalize-first.pipe.ts

// OBLIGATORIO: kebab-case para directorios
user-form/
login-form-container/
capitalize-first/
```

### **Variables y Métodos**
```typescript
// OBLIGATORIO: camelCase para variables y métodos
const currentUser = signal<IUser | null>(null);
const isLoading = computed(() => this._state().isLoading);

// OBLIGATORIO: snake_case para constantes
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_ATTEMPTS = 3;

// OBLIGATORIO: Prefijo _ para propiedades privadas
private readonly _state = signal<IUserState>({});
private readonly _subscriptions = new Subscription();
```

## 🔄 REGLAS DE COMMITS

### **Formato Obligatorio**
```
tipo(scope): descripción

Cuerpo del commit (opcional)
```

### **Tipos de Commit**
- **feat**: Nueva funcionalidad
- **fix**: Corrección de bugs
- **refactor**: Refactorización de código
- **docs**: Cambios en documentación
- **style**: Cambios de formato/estilo
- **test**: Agregar o modificar tests
- **chore**: Tareas de mantenimiento
- **perf**: Mejoras de rendimiento
- **ci**: Cambios en CI/CD
- **build**: Cambios en build system

### **Scopes Válidos**
- **auth**: Módulo de autenticación
- **admin**: Módulo de administración
- **education**: Módulo educativo
- **shared**: Librería compartida
- **main**: Aplicación principal

### **Ejemplos de Commits**
```
feat(auth): agregar validación de formulario de login
fix(shared): corregir estilos del componente button
refactor(admin): reestructurar casos de uso de usuarios
docs(auth): actualizar documentación de componentes
style(education): mejorar responsive del layout
test(auth): agregar tests unitarios para login
chore(main): actualizar dependencias de Angular
perf(shared): optimizar rendimiento del componente table
ci(main): configurar GitHub Actions para testing
build(shared): actualizar configuración de webpack
```

### **Reglas Específicas**
1. **Prefijos obligatorios**: Siempre usar tipo(scope):
2. **Idioma**: Descripciones en español
3. **Longitud**: Máximo 50 caracteres para el título
4. **Detalles**: Usar cuerpo del commit para explicaciones adicionales
5. **Scope**: Debe coincidir con el módulo modificado
6. **Tipo**: Usar solo los tipos estándar de Conventional Commits
7. **Imperativo**: Usar modo imperativo (agregar, corregir, actualizar)
8. **Consistencia**: Mantener consistencia en el estilo

## 📦 REGLAS DE IMPORTS Y EXPORTS

### **Imports Relativos vs Absolutos**
```typescript
// OBLIGATORIO: Imports relativos dentro del módulo
import { UserService } from '../services/user.service';
import { UserState } from '../../domain/state/user.state';

// OBLIGATORIO: Imports absolutos para módulos externos
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { InputComponent } from 'shared';
```

### **Reglas de Exports por Librería**
- **auth, admin, education**: SOLO pueden exportar rutas
- **shared**: Puede exportar componentes, servicios, utilidades, pipes, layouts y otros elementos reutilizables
- **main**: No debe exportar nada (es la aplicación principal)

### **Estructura de index.ts por Módulo**
```typescript
// auth/index.ts - SOLO RUTAS
export const routes: Routes = [
  {
    path: 'signin',
    component: LoginLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./infrastructure/ui/containers/login-form-container/login-form-container').then(m => m.LoginFormContainer),
        outlet: 'left'
      }
    ]
  }
];

// shared/index.ts - COMPONENTES Y UTILIDADES
export * from './infrastructure/ui/components/button/button.component';
export * from './infrastructure/ui/forms/input/input.component';
export * from './infrastructure/ui/pipes/capitalize-first.pipe';
```

## 🎯 REGLAS DE CÓDIGO LIMPIO

### **Funciones y Métodos**
```typescript
// ✅ CORRECTO: Función pequeña y específica
getUserById(id: string): Observable<IUser> {
  return this.http.get<IUser>(`${this.baseUrl}/users/${id}`);
}

// ❌ INCORRECTO: Función muy larga
getUserByIdAndProcessDataAndUpdateCache(id: string): Observable<IUser> {
  // 100+ líneas de código
}
```

### **Variables y Constantes**
```typescript
// ✅ CORRECTO: Nombres descriptivos
const isUserAuthenticated = computed(() => this._state().currentUser !== null);
const MAX_LOGIN_ATTEMPTS = 3;

// ❌ INCORRECTO: Nombres poco claros
const flag = true;
const num = 3;
const data = response;
```

### **Manejo de Errores**
```typescript
// ✅ CORRECTO: Manejo consistente de errores
login(credentials: ILoginCredentials): Observable<IUser> {
  return this.http.post<IUser>(`${this.baseUrl}/login`, credentials).pipe(
    catchError(error => {
      console.error('Login failed:', error);
      return throwError(() => new Error('Invalid credentials'));
    })
  );
}
```

### **Tipado Estricto**
```typescript
// ✅ CORRECTO: Tipos específicos
interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

// ❌ INCORRECTO: Uso de any
function processUser(user: any): any {
  return user;
}
```

## 🔧 REGLAS DE HERRAMIENTAS

### **Angular CLI**
```bash
# OBLIGATORIO: Usar Angular CLI para generar componentes
ng generate component shared/components/button
ng generate service auth/services/user
ng generate pipe shared/pipes/capitalize-first
ng generate guard auth/guards/auth
```

### **Linting y Formateo**
```bash
# OBLIGATORIO: Ejecutar antes de cada commit
ng lint
ng format
```

### **Testing**
```bash
# OBLIGATORIO: Ejecutar tests antes de cada commit
ng test
ng test --watch=false
ng e2e
```

## 📊 REGLAS DE RENDIMIENTO

### **OnPush Strategy**
```typescript
// OBLIGATORIO: Usar OnPush para componentes
@Component({
  selector: 'user-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
export class UserCardComponent {
  // ...
}
```

### **Signals para Estado**
```typescript
// OBLIGATORIO: Usar signals para estado reactivo
export class UserState {
  private readonly _users = signal<IUser[]>([]);
  readonly users = computed(() => this._users());
  
  addUser(user: IUser) {
    this._users.update(users => [...users, user]);
  }
}
```

### **Lazy Loading**
```typescript
// OBLIGATORIO: Lazy loading para rutas
const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('admin').then(m => m.routes)
  }
];
```

## 🚨 REGLAS CRÍTICAS DE DESARROLLO

### **ANTES DE ESCRIBIR CÓDIGO:**
1. **Leer reglas de arquitectura**
2. **Leer reglas de sistema de diseño**
3. **Leer este archivo de prácticas**
4. **Planificar la estructura del componente**
5. **Verificar que no existe funcionalidad similar**

### **DURANTE EL DESARROLLO:**
1. **Seguir convenciones de nombramiento**
2. **Usar TypeScript estricto**
3. **Implementar manejo de errores**
4. **Escribir tests unitarios**
5. **Mantener código limpio y legible**

### **DESPUÉS DEL DESARROLLO:**
1. **Ejecutar tests**
2. **Verificar linting**
3. **Revisar rendimiento**
4. **Verificar accesibilidad**
5. **Documentar cambios importantes**

## ⚠️ RECORDATORIOS CRÍTICOS

1. **SIEMPRE consultar este archivo ANTES de empezar cualquier tarea**
2. **SEGUIR convenciones de nombramiento estrictamente**
3. **ESCRIBIR tests para cada componente**
4. **MANTENER código limpio y legible**
5. **USAR TypeScript estricto**
6. **MANEJAR errores correctamente**
7. **OPTIMIZAR rendimiento**
8. **VERIFICAR accesibilidad**
9. **DOCUMENTAR cambios importantes**
10. **EJECUTAR tests antes de cada commit**