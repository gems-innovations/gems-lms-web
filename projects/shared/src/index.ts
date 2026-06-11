export { environment } from "./infrastructure/ui/environments/environment";
export { ModalBaseComponent } from "./infrastructure/ui/components/modal-base/modal-base.component";
export type { TModalSize } from "./infrastructure/ui/components/modal-base/modal-base.component";
export { ToastComponent } from "./infrastructure/ui/components/toast/toast.component";
export { ToastContainerComponent } from "./infrastructure/ui/components/toast/toast-container.component";
export { ToastService } from "./infrastructure/ui/components/toast/toast.service";
export type { Toast } from "./infrastructure/ui/components/toast/toast.service";
export { SearchBarComponent } from "./infrastructure/ui/components/search-bar/search-bar.component";
export { LibInputComponent } from "./infrastructure/ui/forms/input/lib-input/lib-input";
export type { InputType } from "./infrastructure/ui/forms/input/lib-input/lib-input";
export { LibSelectComponent } from "./infrastructure/ui/forms/dropdown/lib-select";
export type { SelectOption } from "./infrastructure/ui/forms/dropdown/lib-select";
export { LibButtonComponent } from "./infrastructure/ui/components/lib-button/lib-button";
export type { ButtonVariant, ButtonSize } from "./infrastructure/ui/components/lib-button/lib-button";
export { ConfirmationDialogComponent } from "./infrastructure/ui/components/confirmation-dialog/confirmation-dialog.component";
export type { ConfirmationType } from "./infrastructure/ui/components/confirmation-dialog/confirmation-dialog.component";
export { SidebarComponent } from "./infrastructure/ui/components/sidebar/sidebar.component";
export type { NavigationItem, UserProfile } from "./infrastructure/ui/components/sidebar/sidebar.component";

// ── UI primitives ────────────────────────────────────────────────────────────
export { BadgeComponent } from "./infrastructure/ui/components/badge/badge.component";
export type { BadgeVariant, BadgeSize } from "./infrastructure/ui/components/badge/badge.component";

export { PageHeaderComponent } from "./infrastructure/ui/components/page-header/page-header.component";

export { StatCardComponent } from "./infrastructure/ui/components/stat-card/stat-card.component";
export type { StatAccent } from "./infrastructure/ui/components/stat-card/stat-card.component";

export { TabsComponent } from "./infrastructure/ui/components/tabs/tabs.component";
export type { TabItem } from "./infrastructure/ui/components/tabs/tabs.component";

export { ProgressBarComponent } from "./infrastructure/ui/components/progress-bar/progress-bar.component";
export type { ProgressVariant, ProgressSize } from "./infrastructure/ui/components/progress-bar/progress-bar.component";

export { EmptyStateComponent } from "./infrastructure/ui/components/empty-state/empty-state.component";

export { ColorPickerComponent } from "./infrastructure/ui/components/color-picker/color-picker.component";

// ── Services ─────────────────────────────────────────────────────────────────
export { BrandingService } from "./infrastructure/ui/services/branding.service";
export type { IBrandingConfig } from "./infrastructure/ui/services/branding.service";

export { LoadingSkeletonComponent } from "./infrastructure/ui/components/loading-skeleton/loading-skeleton";

export { PageComponent } from "./infrastructure/ui/components/page/page.component";
export type { PageWidth } from "./infrastructure/ui/components/page/page.component";
