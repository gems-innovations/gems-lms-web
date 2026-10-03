export interface IAuditEvent {
  id: number;
  actorUserId: number;
  actorRole: string;
  institutionId?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  httpMethod: string;
  resourcePath: string;
  responseStatus: number;
  clientIp?: string | null;
  userAgent?: string | null;
  occurredAt: string;
}

export interface IAuditQuery {
  page: number;
  limit: number;
  search?: string;
  action?: string;
  from?: string;
  to?: string;
}

export interface IAuditPage {
  events: IAuditEvent[];
  total: number;
}
