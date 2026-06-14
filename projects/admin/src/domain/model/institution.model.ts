export enum EInstitutionType {
  UNIVERSITY = 'university',
  COLLEGE = 'college',
  SCHOOL = 'school',
  INSTITUTE = 'institute',
  ACADEMY = 'academy',
  CENTER = 'center'
}

export enum EInstitutionStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

export enum EBrandingType {
  LOGO_TEXT = 'logo-text',
  ICON_ONLY = 'icon-only',
  COLOR_BADGE = 'color-badge'
}

export enum ESubscriptionType {
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

export interface IBranding {
  type: EBrandingType;
  logoUrl?: string;
  iconUrl?: string;
  colorPrimary: string;
  colorSecondary?: string;
  backgroundColor?: string;
  darkMode?: boolean;
}

export interface IInstitutionMetadata {
  description?: string;
  website?: string;
  contactEmail?: string;
  phoneNumber?: string;
  address?: string;
  adminUserId?: string;
  maxUsers?: number;
  features?: string[];
  lastActivity?: Date;
  subscriptionType?: ESubscriptionType;
}

export interface IInstitution {
  id: string;
  name: string;
  type: EInstitutionType;
  status: EInstitutionStatus;
  usersCount: number;
  creationDate: Date;
  branding: IBranding;
  metadata?: IInstitutionMetadata;
}

export interface ICreateInstitutionRequest {
  name: string;
  type: EInstitutionType;
  branding: IBranding;
  metadata?: IInstitutionMetadata;
}

export interface IUpdateInstitutionRequest {
  name?: string;
  status?: EInstitutionStatus;
  branding?: Partial<IBranding>;
  metadata?: Partial<IInstitutionMetadata>;
}

export interface IInstitutionFilters {
  search?: string;
  status?: EInstitutionStatus;
  createdAfter?: Date;
  createdBefore?: Date;
  minUsers?: number;
  maxUsers?: number;
}

export enum ESortBy {
  NAME = 'name',
  CREATION_DATE = 'creationDate',
  USERS_COUNT = 'usersCount'
}

export enum ESortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export interface IPaginationConfig {
  page: number;
  limit: number;
  sortBy?: ESortBy;
  sortOrder?: ESortOrder;
}

export interface IInstitutionListResponse {
  institutions: IInstitution[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}