---
trigger: always_on
---

# Sistema de Diseño - GemsLmsWeb

## Reglas Obligatorias del Sistema de Diseño

### 1. Variables de Estilos - OBLIGATORIO

#### Uso de Variables SCSS
```scss
// OBLIGATORIO: Importar variables en cada archivo SCSS
@use "sass:map";
@use "../../../../../../shared/src/infrastructure/ui/styles/variables.scss" as vars;

// OBLIGATORIO: Usar variables para todos los valores
.component {
  color: map.get(vars.$colors, primary);
  font-size: vars.$font-size-base;
  padding: vars.$spacing-md;
  border-radius: vars.$border-radius-lg;
}
```

#### Variables Disponibles
- **Colores**: `map.get(vars.$colors, primary|secondary|accent|etc)`
- **Espaciado**: `vars.$spacing-xs|sm|md|lg|xl|2xl`
- **Tipografía**: `vars.$font-size-base|sm|lg`, `vars.$font-weight-*`
- **Bordes**: `vars.$border-radius-sm|md|lg|xl`
- **Sombras**: `vars.$shadow-sm|md|lg|glow`
- **Breakpoints**: `vars.$breakpoint-sm|md|lg|xl|2xl`

### 2. Metodología BEM - OBLIGATORIO

#### Estructura BEM Estricta
```scss
// BLOQUE: Componente principal
.component-name {
  // Estilos del bloque
  
  // ELEMENTO: Parte del bloque (__)
  &__element {
    // Estilos del elemento

    &--modifier {
    // Estilos del elemento modificado
    }
  }
  
  // MODIFICADOR: Variación del bloque o elemento (--)
  &--modifier {
    // Estilos del modificador
  }
}
```

#### Ejemplo Real del Proyecto
```scss
.login-form {
  width: 100%;
  max-width: 448px; // Evitar al maximo valores arbitratrios, de usarse, debe ser solo en excepciones y casos que no se repitan, si se repiten deben definirse en una variable
  display: flex;
  flex-direction: column;
  gap: vars.$spacing-lg;

  &__header {
    display: flex;
    justify-content: flex-start;
    margin-bottom: vars.$spacing-md;
  }

  &__logo {
    height: 48px;
  }

  &__title {
    font-size: 1.875rem;
    font-weight: vars.$font-weight-bold;
    color: map.get(vars.$colors, border);
  }

  &__button {
    background: linear-gradient(135deg, map.get(vars.$colors, primary) 0%, map.get(vars.$colors, accent) 100%);
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}
```

### 3. HTML Semántico - OBLIGATORIO

#### Estructura Semántica Estricta
```html
<!-- OBLIGATORIO: Usar elementos semánticos -->
<section class="component">
  <header class="component__header">
    <h1 class="component__title">Título Principal</h1>
    <p class="component__subtitle">Subtítulo descriptivo</p>
  </header>
  
  <main class="component__content">
    <form class="component__form">
      <fieldset class="component__fieldset">
        <legend class="component__legend">Información del Usuario</legend>
        <!-- Campos del formulario -->
      </fieldset>
    </form>
  </main>
  
  <footer class="component__footer">
    <nav class="component__nav">
      <!-- Enlaces de navegación -->
    </nav>
  </footer>
</section>
```

#### Elementos Semánticos Obligatorios
- `<section>`: Secciones de contenido
- `<article>`: Contenido independiente
- `<header>`: Encabezados de sección
- `<main>`: Contenido principal
- `<footer>`: Pie de sección
- `<nav>`: Navegación
- `<aside>`: Contenido relacionado
- `<figure>`: Imágenes y multimedia
- `<figcaption>`: Descripción de figuras

### 5. Accesibilidad - OBLIGATORIO

#### Atributos ARIA Obligatorios
```html
<!-- OBLIGATORIO: Atributos de accesibilidad -->
<button 
  type="submit"
  class="component__button"
  [attr.aria-label]="buttonLabel"
  [attr.aria-describedby]="descriptionId"
  [attr.aria-disabled]="isDisabled"
>
  Submit
</button>

<input
  class="component__input"
  [attr.aria-required]="isRequired"
  [attr.aria-invalid]="hasError"
  [attr.aria-describedby]="errorId"
  [attr.autocomplete]="autocompleteValue"
>

<div 
  class="component__error"
  [id]="errorId"
  role="alert"
  aria-live="polite"
>
  {{ errorMessage }}
</div>
```

#### Reglas de Accesibilidad
- **Labels**: Todos los inputs deben tener labels asociados
- **ARIA**: Usar atributos ARIA apropiados
- **Roles**: Definir roles semánticos cuando sea necesario
- **Focus**: Manejar estados de focus visible
- **Contraste**: Mantener contraste mínimo 4.5:1
- **Navegación**: Soporte completo de teclado

### 6. Estructura de Clases - OBLIGATORIO

#### Convención de Nombres
```scss
// OBLIGATORIO: Nomenclatura estricta
.component-name {
  // BLOQUE: kebab-case
  
  &__element-name {
    // ELEMENTO: kebab-case con doble guión bajo
    
    &--modifier-name {
      // MODIFICADOR: kebab-case con doble guión
    }
  }
  
  &--modifier-name {
    // MODIFICADOR DE BLOQUE: kebab-case con doble guión
  }
}
```

#### Ejemplos de Nomenclatura
- `.login-form` (bloque)
- `.login-form__header` (elemento)
- `.login-form__button` (elemento)
- `.login-form__button--disabled` (elemento con modificador)
- `.login-form--compact` (bloque con modificador)

### 7. Responsive Design - OBLIGATORIO

#### Breakpoints Estándar
```scss
// OBLIGATORIO: Usar breakpoints consistentes con variables
.component {
  // Mobile First
  width: 100%;
  
  @media (min-width: vars.$breakpoint-md) {
    // Tablet
    max-width: 600px;
  }
  
  @media (min-width: vars.$breakpoint-lg) {
    // Desktop
    max-width: 800px;
  }
  
  @media (min-width: vars.$breakpoint-xl) {
    // Large Desktop
    max-width: 1200px;
  }
}
```

### 8. Estados de Componentes - OBLIGATORIO

#### Estados Obligatorios
```scss
.component {
  // Estado base
  opacity: 1;
  transition: all 0.3s ease;
  
  // Estados de interacción
  &:hover {
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:focus {
    outline: 2px solid map.get(vars.$colors, primary);
    outline-offset: 2px;
  }
  
  // Estados de validación
  &--valid {
    border-color: map.get(vars.$colors, success);
  }
  
  &--invalid {
    border-color: map.get(vars.$colors, error);
  }
  
  // Estados de carga
  &--loading {
    opacity: 0.6;
    pointer-events: none;
  }
  
  // Estados deshabilitados
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
```

### 9. Formularios - OBLIGATORIO

#### Estructura de Formularios
```html
<!-- OBLIGATORIO: Estructura semántica de formularios -->
<form class="form" [formGroup]="formGroup" (ngSubmit)="onSubmit()">
  <fieldset class="form__fieldset">
    <legend class="form__legend">Información Personal</legend>
    
    <div class="form__field">
      <label class="form__label" [for]="emailId">
        Email Address
        <span class="form__required" aria-label="required">*</span>
      </label>
      <input
        class="form__input"
        [id]="emailId"
        type="email"
        [formControlName]="'email'"
        [attr.aria-required]="true"
        [attr.aria-invalid]="emailControl.invalid && emailControl.touched"
        [attr.aria-describedby]="emailErrorId"
      >
      <div 
        class="form__error"
        [id]="emailErrorId"
        role="alert"
        aria-live="polite"
        *ngIf="emailControl.invalid && emailControl.touched"
      >
        {{ getEmailErrorMessage() }}
      </div>
    </div>
  </fieldset>
  
  <div class="form__actions">
    <button 
      type="submit"
      class="form__button form__button--primary"
      [disabled]="formGroup.invalid"
    >
      Submit
    </button>
  </div>
</form>
```

### 10. Iconografía - OBLIGATORIO

#### Uso de Iconos
```html
<!-- OBLIGATORIO: Iconos con accesibilidad -->
<svg 
  class="component__icon"
  aria-hidden="true"
  focusable="false"
>
  <use [attr.href]="'icons.svg#' + iconName"></use>
</svg>

<!-- OBLIGATORIO: Iconos decorativos -->
<i class="component__icon component__icon--decorative" aria-hidden="true">
  {{ iconClass }}
</i>
```

## 🚨 REGLAS CRÍTICAS DE DISEÑO

### **DURANTE EL DESARROLLO:**

```
✅ VARIABLES: SIEMPRE usar variables de shared/styles/variables.scss
✅ BEM: SIEMPRE usar metodología BEM estricta
✅ ANIDAMIENTO: SIEMPRE anidar elementos y modificadores
✅ SEMÁNTICA: SIEMPRE usar HTML semántico apropiado
✅ ACCESIBILIDAD: SIEMPRE incluir atributos ARIA necesarios
✅ RESPONSIVE: SIEMPRE diseñar mobile-first
✅ BREAKPOINTS: SIEMPRE usar variables de breakpoints (vars.$breakpoint-*)
✅ ESTADOS: SIEMPRE definir estados hover, focus, active, disabled
✅ CONTRASTE: SIEMPRE mantener contraste mínimo 4.5:1
✅ FOCUS: SIEMPRE manejar estados de focus visible
✅ LABELS: SIEMPRE asociar labels con inputs
❌ NO USAR: Valores hardcodeados (usar variables)
❌ NO USAR: Clases genéricas sin BEM
❌ NO USAR: HTML no semántico (divs sin propósito)
❌ NO USAR: Elementos sin accesibilidad
❌ NO USAR: Estilos inline
❌ NO USAR: !important (excepto casos excepcionales)
```

### **ESTRUCTURA OBLIGATORIA DE ARCHIVOS SCSS:**

```scss
// 1. IMPORTS (OBLIGATORIO)
@use "sass:map";
@use "../../../../../../shared/src/infrastructure/ui/styles/variables.scss" as vars;

// 2. BLOQUE PRINCIPAL
.component-name {
  // Estilos base del componente
  
  // 3. ELEMENTOS (OBLIGATORIO)
  &__element {
    // Estilos del elemento
    
    // 4. PSEUDO-ELEMENTOS
    &:hover { }
    &:focus { }
    &:active { }
    &:disabled { }
    
    // 5. MODIFICADORES DE ELEMENTO
    &--modifier { }
  }
  
  // 6. MODIFICADORES DE BLOQUE
  &--modifier {
    // Estilos del modificador
  }
  
  // 7. MEDIA QUERIES (OBLIGATORIO)
  @media (min-width: vars.$breakpoint-md) { }
  @media (min-width: vars.$breakpoint-lg) { }
  @media (min-width: vars.$breakpoint-xl) { }
}
```

## ⚠️ RECORDATORIOS CRÍTICOS

1. **SIEMPRE importar variables de shared**
2. **SIEMPRE usar metodología BEM estricta**
3. **SIEMPRE anidar elementos y modificadores**
4. **SIEMPRE usar HTML semántico**
5. **SIEMPRE incluir accesibilidad**
6. **SIEMPRE diseñar responsive con variables de breakpoints**
7. **SIEMPRE definir estados de interacción**
8. **NUNCA usar valores hardcodeados (incluyendo breakpoints)**
9. **NUNCA usar clases genéricas**
10. **NUNCA omitir atributos de accesibilidad**