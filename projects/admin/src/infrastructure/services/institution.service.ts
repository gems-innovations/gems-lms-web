import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
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
} from '../../domain/model/institution';

const MOCK_INSTITUTIONS: IInstitution[] = [
  {
    id: 'inst-1',
    name: 'Universidad Nacional de Colombia',
    type: EInstitutionType.UNIVERSITY,
    status: EInstitutionStatus.ACTIVE,
    usersCount: 45000,
    creationDate: new Date('2023-01-15'),
    branding: {
      type: EBrandingType.COLOR_BADGE,
      colorPrimary: '#6C63FF',
      colorSecondary: '#1E1B4B',
      logoUrl: 'https://unal.edu.co/logo.png'
    },
    metadata: {
      description: 'Principal universidad pública de Colombia, referente en investigación y educación superior.',
      website: 'https://unal.edu.co',
      contactEmail: 'info@unal.edu.co',
      phoneNumber: '+57 1 316 5000',
      address: 'Carrera 45 #26-85, Bogotá, Colombia',
      lastActivity: new Date('2024-10-20'),
      subscriptionType: ESubscriptionType.ENTERPRISE,
      maxUsers: 50000
    }
  },
  {
    id: 'inst-2',
    name: 'Pragma',
    type: EInstitutionType.ACADEMY,
    status: EInstitutionStatus.ACTIVE,
    usersCount: 1200,
    creationDate: new Date('2023-06-01'),
    branding: {
      type: EBrandingType.LOGO_TEXT,
      colorPrimary: '#FF6B35',
      colorSecondary: '#1a1a2e',
      logoUrl: 'https://pragma.com.co/logo.png'
    },
    metadata: {
      description: 'Empresa de tecnología e innovación digital con foco en formación técnica especializada.',
      website: 'https://pragma.com.co',
      contactEmail: 'academy@pragma.com.co',
      phoneNumber: '+57 4 6049090',
      address: 'Medellín, Colombia',
      lastActivity: new Date('2024-10-23'),
      subscriptionType: ESubscriptionType.PREMIUM,
      maxUsers: 2000
    }
  },
  {
    id: 'inst-3',
    name: 'Platzi',
    type: EInstitutionType.ACADEMY,
    status: EInstitutionStatus.ACTIVE,
    usersCount: 85000,
    creationDate: new Date('2023-05-20'),
    branding: {
      type: EBrandingType.LOGO_TEXT,
      colorPrimary: '#98CA3F',
      colorSecondary: '#121F3E',
      logoUrl: 'https://platzi.com/logo.png'
    },
    metadata: {
      description: 'Plataforma de educación profesional en tecnología con instructores de clase mundial.',
      website: 'https://platzi.com',
      contactEmail: 'hola@platzi.com',
      phoneNumber: '+57 1 7449191',
      address: 'Bogotá, Colombia',
      lastActivity: new Date('2024-10-21'),
      subscriptionType: ESubscriptionType.PREMIUM,
      maxUsers: 100000
    }
  },
  {
    id: 'inst-4',
    name: 'Universidad de los Andes',
    type: EInstitutionType.UNIVERSITY,
    status: EInstitutionStatus.ACTIVE,
    usersCount: 18000,
    creationDate: new Date('2023-02-28'),
    branding: {
      type: EBrandingType.COLOR_BADGE,
      colorPrimary: '#C8102E',
      colorSecondary: '#003DA5'
    },
    metadata: {
      description: 'Universidad privada líder en Colombia, acreditada internacionalmente.',
      website: 'https://uniandes.edu.co',
      contactEmail: 'infouniandes@uniandes.edu.co',
      phoneNumber: '+57 1 3394949',
      address: 'Carrera 1 #18A-12, Bogotá, Colombia',
      lastActivity: new Date('2024-10-19'),
      subscriptionType: ESubscriptionType.PREMIUM,
      maxUsers: 25000
    }
  },
  {
    id: 'inst-5',
    name: 'Coursera Colombia',
    type: EInstitutionType.CENTER,
    status: EInstitutionStatus.SUSPENDED,
    usersCount: 32000,
    creationDate: new Date('2023-07-01'),
    branding: {
      type: EBrandingType.LOGO_TEXT,
      colorPrimary: '#0056D2',
      colorSecondary: '#1F1F1F'
    },
    metadata: {
      description: 'Plataforma global de aprendizaje en línea con certificaciones reconocidas.',
      website: 'https://coursera.org',
      contactEmail: 'support@coursera.org',
      address: 'Bogotá, Colombia',
      lastActivity: new Date('2024-08-15'),
      subscriptionType: ESubscriptionType.BASIC,
      maxUsers: 50000
    }
  }
];

@Injectable({ providedIn: 'root' })
export class InstitutionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrls.admin.institutions;
  private readonly USE_MOCK_DATA = true;

  createInstitution(request: ICreateInstitutionRequest): Observable<IInstitution> {
    if (this.USE_MOCK_DATA) {
      const newInstitution: IInstitution = {
        id: Date.now().toString(),
        name: request.name,
        type: request.type,
        status: EInstitutionStatus.PENDING,
        usersCount: 0,
        creationDate: new Date(),
        branding: request.branding,
        metadata: request.metadata
      };
      MOCK_INSTITUTIONS.unshift(newInstitution);
      return of(newInstitution).pipe(delay(500));
    }
    return this.http.post<IInstitution>(this.baseUrl, request);
  }

  getInstitutions(filters?: IInstitutionFilters, page = 1, limit = 10): Observable<IInstitutionListResponse> {
    if (this.USE_MOCK_DATA) {
      let filtered = [...MOCK_INSTITUTIONS];
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        filtered = filtered.filter(i => i.name.toLowerCase().includes(s));
      }
      if (filters?.status) {
        filtered = filtered.filter(i => i.status === filters.status);
      }
      const total = filtered.length;
      const start = (page - 1) * limit;
      const institutions = filtered.slice(start, start + limit);
      const totalPages = Math.ceil(total / limit);
      return of({ institutions, total, page, limit, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 }).pipe(delay(300));
    }
    return this.http.get<IInstitutionListResponse>(`${this.baseUrl}?${this.buildQueryParams(filters, page, limit)}`);
  }

  getInstitutionById(id: string): Observable<IInstitution> {
    if (this.USE_MOCK_DATA) {
      return of(MOCK_INSTITUTIONS.find(i => i.id === id)!).pipe(delay(200));
    }
    return this.http.get<IInstitution>(`${this.baseUrl}/${id}`);
  }

  updateInstitution(id: string, request: IUpdateInstitutionRequest): Observable<IInstitution> {
    if (this.USE_MOCK_DATA) {
      const idx = MOCK_INSTITUTIONS.findIndex(i => i.id === id);
      if (idx !== -1) {
        const current = MOCK_INSTITUTIONS[idx];
        const updated: IInstitution = {
          ...current,
          name: request.name ?? current.name,
          branding: request.branding ? { ...current.branding, ...request.branding } : current.branding,
          metadata: request.metadata ? { ...current.metadata, ...request.metadata, lastActivity: new Date() } : current.metadata
        };
        MOCK_INSTITUTIONS[idx] = updated;
        return of(updated).pipe(delay(500));
      }
    }
    return this.http.put<IInstitution>(`${this.baseUrl}/${id}`, request);
  }

  deleteInstitution(id: string): Observable<void> {
    if (this.USE_MOCK_DATA) {
      const idx = MOCK_INSTITUTIONS.findIndex(i => i.id === id);
      if (idx !== -1) MOCK_INSTITUTIONS.splice(idx, 1);
      return of(void 0).pipe(delay(300));
    }
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  private buildQueryParams(filters?: IInstitutionFilters, page = 1, limit = 10): string {
    const p = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (filters?.status) p.append('status', filters.status);
    if (filters?.search?.trim()) p.append('search', filters.search.trim());
    return p.toString();
  }
}
