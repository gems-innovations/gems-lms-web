import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap, forkJoin, of, catchError } from 'rxjs';
import { environment } from 'shared';
import {
  IInstitution,
  ICreateInstitutionRequest,
  IUpdateInstitutionRequest,
  IInstitutionListResponse,
  IInstitutionFilters,
  EInstitutionStatus,
  EInstitutionType,
  EBrandingType,
  ESubscriptionType
} from '../../domain/model/institution.model';

// ── API contracts (ms-admin) ──────────────────────────────────────────────────

interface IInstitutionApi {
  id: string;
  name: string;
  type: string;
  status: string;
  usersCount: number | null;
  createdAt: string;
  updatedAt: string;
  metadata: {
    description: string | null;
    website: string | null;
    contactEmail: string | null;
    phoneNumber: string | null;
    address: string | null;
    subscriptionType: string | null;
    maxUsers: number | null;
    lastActivity: string | null;
  } | null;
  branding: {
    type: string | null;
    logoUrl: string | null;
    iconUrl: string | null;
    colorPrimary: string | null;
    colorSecondary: string | null;
    backgroundColor: string | null;
    darkMode: boolean | null;
  } | null;
}

interface IInstitutionListApi {
  institutions: IInstitutionApi[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

const orUndefined = <T>(v: T | null | undefined): T | undefined => v ?? undefined;

function mapInstitution(r: IInstitutionApi): IInstitution {
  return {
    id: r.id,
    name: r.name,
    type: r.type as EInstitutionType,
    status: r.status as EInstitutionStatus,
    usersCount: r.usersCount ?? 0,
    creationDate: new Date(r.createdAt),
    branding: {
      type: (r.branding?.type as EBrandingType) ?? EBrandingType.COLOR_BADGE,
      logoUrl: orUndefined(r.branding?.logoUrl),
      iconUrl: orUndefined(r.branding?.iconUrl),
      colorPrimary: r.branding?.colorPrimary ?? '#6C63FF',
      colorSecondary: orUndefined(r.branding?.colorSecondary),
      backgroundColor: orUndefined(r.branding?.backgroundColor),
      darkMode: orUndefined(r.branding?.darkMode)
    },
    metadata: r.metadata ? {
      description: orUndefined(r.metadata.description),
      website: orUndefined(r.metadata.website),
      contactEmail: orUndefined(r.metadata.contactEmail),
      phoneNumber: orUndefined(r.metadata.phoneNumber),
      address: orUndefined(r.metadata.address),
      subscriptionType: orUndefined(r.metadata.subscriptionType) as ESubscriptionType | undefined,
      maxUsers: orUndefined(r.metadata.maxUsers),
      lastActivity: r.metadata.lastActivity ? new Date(r.metadata.lastActivity) : undefined
    } : undefined
  };
}

/** Only the metadata fields the API stores (lastActivity is server-managed). */
function toMetadataBody(m?: Partial<IInstitution['metadata']>) {
  if (!m) return undefined;
  const { description, website, contactEmail, phoneNumber, address, subscriptionType, maxUsers } = m;
  return { description, website, contactEmail, phoneNumber, address, subscriptionType, maxUsers };
}

@Injectable({ providedIn: 'root' })
export class InstitutionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrls.admin.institutions;

  /** Active users per institution, counted by ms-auth (ms-admin does not know the users). */
  private userCounts(): Observable<Record<string, number> | null> {
    return this.http.get<Record<string, number>>(`${environment.apiUrls.users}/counts`).pipe(catchError(() => of(null)));
  }

  private withUserCount(institution: IInstitution, counts: Record<string, number> | null): IInstitution {
    return counts ? { ...institution, usersCount: counts[institution.id] ?? 0 } : institution;
  }

  createInstitution(request: ICreateInstitutionRequest): Observable<IInstitution> {
    const body = {
      name: request.name,
      type: request.type,
      status: EInstitutionStatus.PENDING,
      branding: request.branding,
      metadata: toMetadataBody(request.metadata)
    };
    return this.http.post<IInstitutionApi>(this.baseUrl, body).pipe(map(mapInstitution));
  }

  getInstitutions(filters?: IInstitutionFilters, page = 1, limit = 10): Observable<IInstitutionListResponse> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search?.trim()) params = params.set('search', filters.search.trim());
    return forkJoin({ list: this.http.get<IInstitutionListApi>(this.baseUrl, { params }), counts: this.userCounts() }).pipe(
      map(({ list, counts }) => ({
        ...list,
        institutions: list.institutions.map(r => this.withUserCount(mapInstitution(r), counts))
      }))
    );
  }

  getInstitutionById(id: string): Observable<IInstitution> {
    return forkJoin({
      institution: this.http.get<IInstitutionApi>(`${this.baseUrl}/${encodeURIComponent(id)}`),
      counts: this.userCounts()
    }).pipe(map(({ institution, counts }) => this.withUserCount(mapInstitution(institution), counts)));
  }

  /**
   * The API applies only the fields it receives, but always validates name and type,
   * so they are taken from the current record when the caller does not change them.
   */
  updateInstitution(id: string, request: IUpdateInstitutionRequest): Observable<IInstitution> {
    return this.getInstitutionById(id).pipe(
      switchMap(current => this.http.put<IInstitutionApi>(`${this.baseUrl}/${encodeURIComponent(id)}`, {
        name: request.name ?? current.name,
        type: current.type,
        status: request.status,
        branding: request.branding,
        metadata: toMetadataBody(request.metadata)
      })),
      map(mapInstitution)
    );
  }

  deleteInstitution(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }
}
