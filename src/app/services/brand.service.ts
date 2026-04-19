// src/app/core/services/brand.service.ts
import { Injectable }                                          from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse }          from '@angular/common/http';
import { Observable, throwError, BehaviorSubject }            from 'rxjs';
import { catchError, tap, map }                               from 'rxjs/operators';
import { environment }                                        from '../environment';

const BASE = `${environment.apiUrl}/brand`;

/* ══════════════════════════════════════════════════════════════════════════
   INTERFACES  — mirror exactly what the backend returns
   ══════════════════════════════════════════════════════════════════════════ */

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

/* ── Brand Profile ─────────────────────────────────────────────────────── */
export interface SocialLinks {
  instagram: string;
  youtube:   string;
  tiktok:    string;
  twitter:   string;
}

export interface BrandProfile {
  _id:          string;
  owner:        string;
  brandName:    string;
  industry:     string;
  logo:         string;
  website:      string;
  description:  string;
  contactName:  string;
  contactEmail: string;
  contactPhone: string;
  isArchived:   boolean;
  socialLinks:  SocialLinks;
  createdAt:    string;
  updatedAt:    string;
}

export type UpdateProfilePayload = Partial<Omit<BrandProfile, '_id' | 'owner' | 'createdAt' | 'updatedAt'>>;

/* ── Campaigns ─────────────────────────────────────────────────────────── */
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export type Platform = 'Instagram' | 'YouTube' | 'TikTok' | 'Twitter' | 'Twitch' | 'Blog' | 'Podcast';

export interface Campaign {
  _id:         string;
  brand:       string;
  title:       string;
  description: string;
  budget:      number;
  startDate:   string;
  endDate:     string;
  platforms:   Platform[];
  contentReqs: string;
  niche:       string;
  status:      CampaignStatus;
  slots:       number;
  isDeleted:   boolean;
  createdAt:   string;
  updatedAt:   string;
}

export interface CreateCampaignPayload {
  title:        string;
  description?: string;
  budget:       number;
  startDate:    string;
  endDate:      string;
  platforms?:   Platform[];
  contentReqs?: string;
  niche?:       string;
  slots?:       number;
  status?:      CampaignStatus;
}

export interface CampaignListParams {
  status?: CampaignStatus;
  page?:   number;
  limit?:  number;
}

export interface CampaignListResponse {
  campaigns: Campaign[];
  total:     number;
  page:      number;
  pages:     number;
}

/* ── Collaborations ─────────────────────────────────────────────────────── */
export type CollabStatus =
  'pending' | 'accepted' | 'rejected' | 'active' | 'completed' | 'cancelled';

export interface Collaboration {
  _id:          string;
  brand:        string;
  creator:      PopulatedUser | string;
  campaign:     PopulatedCampaign | string | null;
  deliverables: string;
  paymentTerms: string;
  amount:       number;
  status:       CollabStatus;
  message:      string;
  isDeleted:    boolean;
  createdAt:    string;
  updatedAt:    string;
}

export interface CreateCollabPayload {
  creator:       string;          // MongoDB ObjectId
  campaign?:     string;
  deliverables?: string;
  paymentTerms?: string;
  amount?:       number;
  message?:      string;
}

/* ── Budget ────────────────────────────────────────────────────────────── */
export interface BudgetAllocation {
  creator?: string;
  amount:   number;
  label:    string;
}

export interface Budget {
  _id:         string;
  brand:       string;
  campaign:    PopulatedCampaign | string | null;
  title:       string;
  totalAmount: number;
  allocated:   number;
  allocations: BudgetAllocation[];
  isDeleted:   boolean;
  createdAt:   string;
  updatedAt:   string;
}

export interface CreateBudgetPayload {
  title:        string;
  totalAmount:  number;
  campaign?:    string;
  allocations?: BudgetAllocation[];
}

/* ── Assets ────────────────────────────────────────────────────────────── */
export type AssetType = 'logo' | 'guideline' | 'product_image' | 'promo_video' | 'other';

export interface Asset {
  _id:       string;
  brand:     string;
  name:      string;
  type:      AssetType;
  url:       string;
  size:      number;
  mimeType:  string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetPayload {
  name:      string;
  type?:     AssetType;
  url:       string;
  size?:     number;
  mimeType?: string;
}

/* ── Team Members ──────────────────────────────────────────────────────── */
export type TeamRole =
  'Marketing Manager' | 'Campaign Manager' | 'Content Strategist' | 'Finance' | 'Other';

export interface TeamMember {
  _id:       string;
  brand:     string;
  name:      string;
  email:     string;
  role:      TeamRole;
  phone:     string;
  isActive:  boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamMemberPayload {
  name:   string;
  email:  string;
  role?:  TeamRole;
  phone?: string;
}

/* ── Analytics ─────────────────────────────────────────────────────────── */
export interface BrandAnalytics {
  totalCampaigns:          number;
  activeCampaigns:         number;
  totalCollaborations:     number;
  completedCollaborations: number;
  totalBudget:             number;
  allocatedBudget:         number;
  totalPaid:               number;
}

/* ── Contracts ─────────────────────────────────────────────────────────── */
export type ContractStatus = 'draft' | 'sent' | 'signed' | 'archived';

export interface Contract {
  _id:           string;
  brand:         string;
  creator:       PopulatedUser | string | null;
  collaboration: string | null;
  title:         string;
  content:       string;
  fileUrl:       string;
  status:        ContractStatus;
  signedAt:      string | null;
  isDeleted:     boolean;
  createdAt:     string;
  updatedAt:     string;
}

export interface CreateContractPayload {
  title:          string;
  creator?:       string;
  collaboration?: string;
  content?:       string;
  fileUrl?:       string;
  status?:        ContractStatus;
}

/* ── Payments ──────────────────────────────────────────────────────────── */
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';

export interface Payment {
  _id:           string;
  brand:         string;
  creator:       PopulatedUser | string | null;
  collaboration: string | null;
  amount:        number;
  currency:      string;
  status:        PaymentStatus;
  invoiceNumber: string;
  dueDate:       string | null;
  paidAt:        string | null;
  notes:         string;
  isDeleted:     boolean;
  createdAt:     string;
  updatedAt:     string;
}

export interface CreatePaymentPayload {
  creator:       string;
  collaboration?: string;
  amount:        number;
  currency?:     string;
  dueDate?:      string;
  notes?:        string;
}

/* ── Populated sub-types (from .populate()) ────────────────────────────── */
export interface PopulatedUser {
  _id:         string;
  firstName:   string;
  lastName:    string;
  email:       string;
  avatar:      string;
  platform?:   string;
  companyName?: string;
}
export interface ExploreCreatorsResponse {
  creators: any[];
  pagination: {
    total: number;
    pages: number;
  };
}
export interface PopulatedCampaign {
  _id:    string;
  title:  string;
  budget: number;
  status: CampaignStatus;
}

/* ══════════════════════════════════════════════════════════════════════════
   SERVICE
   ══════════════════════════════════════════════════════════════════════════ */
@Injectable({ providedIn: 'root' })
export class BrandService {

  /* ── Local state subjects (optional reactive caching) ─────────────────── */
  private _profile$      = new BehaviorSubject<BrandProfile | null>(null);
  private _analytics$    = new BehaviorSubject<BrandAnalytics | null>(null);

  /** Reactive brand profile — subscribe in components that need live updates */
  readonly profile$   = this._profile$.asObservable();
  readonly analytics$ = this._analytics$.asObservable();

  constructor(private http: HttpClient) {}

  /* ══════════════════════════════════════════════════════════════════════
     HELPERS
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Build HttpParams from a plain object, skipping undefined/null values.
   * e.g. { status: 'active', page: 1 } → ?status=active&page=1
   */
  private buildParams(obj?: Record<string, unknown>): HttpParams {
    let params = new HttpParams();
    if (!obj) return params;
    Object.entries(obj).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return params;
  }

  /**
   * Centralised error handler — normalises all HTTP errors into a
   * consistent shape so components only need one catch block.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'Something went wrong. Please try again.';

    if (error.error?.message) {
      message = error.error.message;
    } else if (error.status === 0) {
      message = 'Cannot reach the server. Check your connection.';
    } else if (error.status === 401) {
      message = 'Session expired. Please sign in again.';
    } else if (error.status === 403) {
      message = 'You do not have permission to do this.';
    } else if (error.status === 404) {
      message = 'Resource not found.';
    } else if (error.status === 409) {
      message = error.error?.message || 'Duplicate entry.';
    } else if (error.status === 422) {
      message = error.error?.message || 'Validation failed.';
    } else if (error.status >= 500) {
      message = 'Server error. Please try again later.';
    }

    return throwError(() => ({
      ...error,
      friendlyMessage: message,
    }));
  }

  /* ══════════════════════════════════════════════════════════════════════
     1. BRAND PROFILE
     GET    /api/brand/profile
     PUT    /api/brand/profile
     DELETE /api/brand/profile
     ══════════════════════════════════════════════════════════════════════ */

  /** Fetch the brand profile. Updates the local profile$ subject. */
  getProfile(): Observable<{ success: boolean; profile: BrandProfile }> {
    return this.http
      .get<{ success: boolean; profile: BrandProfile }>(`${BASE}/profile`)
      .pipe(
        tap(res => this._profile$.next(res.profile)),
        catchError(e => this.handleError(e))
      );
  }

  /** Update brand profile fields. Partial updates supported. */
  updateProfile(
    payload: UpdateProfilePayload
  ): Observable<{ success: boolean; profile: BrandProfile }> {
    return this.http
      .put<{ success: boolean; profile: BrandProfile }>(`${BASE}/profile`, payload)
      .pipe(
        tap(res => this._profile$.next(res.profile)),
        catchError(e => this.handleError(e))
      );
  }

  /** Soft-delete (archive) the brand profile. */
  deleteProfile(): Observable<{ success: boolean; message: string }> {
    return this.http
      .delete<{ success: boolean; message: string }>(`${BASE}/profile`)
      .pipe(catchError(e => this.handleError(e)));
  }

  /* ══════════════════════════════════════════════════════════════════════
     2. CAMPAIGNS
     GET    /api/brand/campaigns          → paginated list
     GET    /api/brand/campaigns/:id      → single campaign
     POST   /api/brand/campaigns          → create
     PUT    /api/brand/campaigns/:id      → update
     DELETE /api/brand/campaigns/:id      → soft delete / cancel
     ══════════════════════════════════════════════════════════════════════ */

  /** List campaigns with optional status filter and pagination. */
  getCampaigns(
    params?: CampaignListParams
  ): Observable<{ success: boolean } & CampaignListResponse> {
    return this.http
      .get<{ success: boolean } & CampaignListResponse>(
        `${BASE}/campaigns`,
        { params: this.buildParams(params as Record<string, unknown>) }
      )
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Get a single campaign by ID. */
  getCampaign(id: string): Observable<{ success: boolean; campaign: Campaign }> {
    return this.http
      .get<{ success: boolean; campaign: Campaign }>(`${BASE}/campaigns/${id}`)
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Create a new campaign. */
  createCampaign(
    payload: CreateCampaignPayload
  ): Observable<{ success: boolean; campaign: Campaign }> {
    return this.http
      .post<{ success: boolean; campaign: Campaign }>(`${BASE}/campaigns`, payload)
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Update an existing campaign. Send only the fields you want to change. */
  updateCampaign(
    id: string,
    payload: Partial<CreateCampaignPayload>
  ): Observable<{ success: boolean; campaign: Campaign }> {
    return this.http
      .put<{ success: boolean; campaign: Campaign }>(`${BASE}/campaigns/${id}`, payload)
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Cancel and soft-delete a campaign. */
  deleteCampaign(id: string): Observable<{ success: boolean; message: string }> {
    return this.http
      .delete<{ success: boolean; message: string }>(`${BASE}/campaigns/${id}`)
      .pipe(catchError(e => this.handleError(e)));
  }

  /* ══════════════════════════════════════════════════════════════════════
     3. COLLABORATIONS
     GET    /api/brand/collaborations           → list (with optional status filter)
     POST   /api/brand/collaborations           → send invite (also emails creator)
     PUT    /api/brand/collaborations/:id       → update status / terms
     DELETE /api/brand/collaborations/:id       → cancel
     ══════════════════════════════════════════════════════════════════════ */

  /** List collaborations. Optionally filter by status. */
  getCollaborations(
    status?: CollabStatus
  ): Observable<{ success: boolean; collaborations: Collaboration[] }> {
    const params = this.buildParams(status ? { status } : undefined);
    return this.http
      .get<{ success: boolean; collaborations: Collaboration[] }>(
        `${BASE}/collaborations`,
        { params }
      )
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Send a collaboration invite to a creator. Triggers invite email. */
  createCollaboration(
    payload: CreateCollabPayload
  ): Observable<{ success: boolean; collaboration: Collaboration }> {
    return this.http
      .post<{ success: boolean; collaboration: Collaboration }>(
        `${BASE}/collaborations`,
        payload
      )
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Update collaboration status or terms. */
  updateCollaboration(
    id: string,
    payload: Partial<Pick<Collaboration, 'status' | 'deliverables' | 'paymentTerms' | 'amount' | 'message'>>
  ): Observable<{ success: boolean; collaboration: Collaboration }> {
    return this.http
      .put<{ success: boolean; collaboration: Collaboration }>(
        `${BASE}/collaborations/${id}`,
        payload
      )
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Cancel a collaboration. */
  deleteCollaboration(id: string): Observable<{ success: boolean; message: string }> {
    return this.http
      .delete<{ success: boolean; message: string }>(`${BASE}/collaborations/${id}`)
      .pipe(catchError(e => this.handleError(e)));
  }

  /* ══════════════════════════════════════════════════════════════════════
     4. BUDGET
     GET    /api/brand/budgets
     POST   /api/brand/budgets
     PUT    /api/brand/budgets/:id
     DELETE /api/brand/budgets/:id
     ══════════════════════════════════════════════════════════════════════ */

  /** List all budget pools. */
  getBudgets(): Observable<{ success: boolean; budgets: Budget[] }> {
    return this.http
      .get<{ success: boolean; budgets: Budget[] }>(`${BASE}/budgets`)
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Create a new budget pool. */
  createBudget(
    payload: CreateBudgetPayload
  ): Observable<{ success: boolean; budget: Budget }> {
    return this.http
      .post<{ success: boolean; budget: Budget }>(`${BASE}/budgets`, payload)
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Update a budget pool (title, amount, allocations). */
  updateBudget(
    id: string,
    payload: Partial<CreateBudgetPayload>
  ): Observable<{ success: boolean; budget: Budget }> {
    return this.http
      .put<{ success: boolean; budget: Budget }>(`${BASE}/budgets/${id}`, payload)
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Remove a budget pool. */
  deleteBudget(id: string): Observable<{ success: boolean; message: string }> {
    return this.http
      .delete<{ success: boolean; message: string }>(`${BASE}/budgets/${id}`)
      .pipe(catchError(e => this.handleError(e)));
  }

  /* ══════════════════════════════════════════════════════════════════════
     5. ASSETS
     GET    /api/brand/assets           → list (with optional type filter)
     POST   /api/brand/assets           → upload (store URL + metadata)
     PUT    /api/brand/assets/:id       → update metadata
     DELETE /api/brand/assets/:id       → soft delete
     ══════════════════════════════════════════════════════════════════════ */

  /** List assets. Optionally filter by type. */
  getAssets(
    type?: AssetType
  ): Observable<{ success: boolean; assets: Asset[] }> {
    const params = this.buildParams(type ? { type } : undefined);
    return this.http
      .get<{ success: boolean; assets: Asset[] }>(`${BASE}/assets`, { params })
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Upload a new asset (URL-based — no binary upload). */
  createAsset(
    payload: CreateAssetPayload
  ): Observable<{ success: boolean; asset: Asset }> {
    return this.http
      .post<{ success: boolean; asset: Asset }>(`${BASE}/assets`, payload)
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Update asset metadata. */
  updateAsset(
    id: string,
    payload: Partial<CreateAssetPayload>
  ): Observable<{ success: boolean; asset: Asset }> {
    return this.http
      .put<{ success: boolean; asset: Asset }>(`${BASE}/assets/${id}`, payload)
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Soft-delete an asset. */
  deleteAsset(id: string): Observable<{ success: boolean; message: string }> {
    return this.http
      .delete<{ success: boolean; message: string }>(`${BASE}/assets/${id}`)
      .pipe(catchError(e => this.handleError(e)));
  }

  /* ══════════════════════════════════════════════════════════════════════
     6. TEAM MEMBERS
     GET    /api/brand/team
     POST   /api/brand/team
     PUT    /api/brand/team/:id
     DELETE /api/brand/team/:id     → deactivate (soft delete)
     ══════════════════════════════════════════════════════════════════════ */

  /** List all active team members. */
  getTeam(): Observable<{ success: boolean; team: TeamMember[] }> {
    return this.http
      .get<{ success: boolean; team: TeamMember[] }>(`${BASE}/team`)
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Add a new team member. Returns 409 if email already exists. */
  addTeamMember(
    payload: CreateTeamMemberPayload
  ): Observable<{ success: boolean; member: TeamMember }> {
    return this.http
      .post<{ success: boolean; member: TeamMember }>(`${BASE}/team`, payload)
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Update a team member's name, role, email or phone. */
  updateTeamMember(
    id: string,
    payload: Partial<CreateTeamMemberPayload>
  ): Observable<{ success: boolean; member: TeamMember }> {
    return this.http
      .put<{ success: boolean; member: TeamMember }>(`${BASE}/team/${id}`, payload)
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Deactivate (soft-remove) a team member. */
  removeTeamMember(id: string): Observable<{ success: boolean; message: string }> {
    return this.http
      .delete<{ success: boolean; message: string }>(`${BASE}/team/${id}`)
      .pipe(catchError(e => this.handleError(e)));
  }

  /* ══════════════════════════════════════════════════════════════════════
     7. ANALYTICS
     GET /api/brand/analytics   — aggregated from MongoDB (no mock data)
     ══════════════════════════════════════════════════════════════════════ */

  /** Fetch aggregated brand analytics from the database. */
  getAnalytics(): Observable<{ success: boolean; analytics: BrandAnalytics }> {
    return this.http
      .get<{ success: boolean; analytics: BrandAnalytics }>(`${BASE}/analytics`)
      .pipe(
        tap(res => this._analytics$.next(res.analytics)),
        catchError(e => this.handleError(e))
      );
  }

  /* ══════════════════════════════════════════════════════════════════════
     8. CONTRACTS
     GET    /api/brand/contracts
     POST   /api/brand/contracts
     PUT    /api/brand/contracts/:id
     DELETE /api/brand/contracts/:id    → archive
     ══════════════════════════════════════════════════════════════════════ */

  /** List all contracts. */
  getContracts(): Observable<{ success: boolean; contracts: Contract[] }> {
    return this.http
      .get<{ success: boolean; contracts: Contract[] }>(`${BASE}/contracts`)
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Create a new contract. */
  createContract(
    payload: CreateContractPayload
  ): Observable<{ success: boolean; contract: Contract }> {
    return this.http
      .post<{ success: boolean; contract: Contract }>(`${BASE}/contracts`, payload)
      .pipe(catchError(e => this.handleError(e)));
  }

  /**
   * Update a contract.
   * When status is set to 'signed', the backend automatically sets signedAt.
   */
  updateContract(
    id: string,
    payload: Partial<CreateContractPayload & { signedAt: string }>
  ): Observable<{ success: boolean; contract: Contract }> {
    return this.http
      .put<{ success: boolean; contract: Contract }>(`${BASE}/contracts/${id}`, payload)
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Archive (soft-delete) a contract. Sets status to 'archived'. */
  deleteContract(id: string): Observable<{ success: boolean; message: string }> {
    return this.http
      .delete<{ success: boolean; message: string }>(`${BASE}/contracts/${id}`)
      .pipe(catchError(e => this.handleError(e)));
  }

  /* ══════════════════════════════════════════════════════════════════════
     9. PAYMENTS / INVOICES
     GET    /api/brand/payments           → list (with optional status filter)
     POST   /api/brand/payments           → create invoice (auto-generates invoice #)
     PUT    /api/brand/payments/:id       → update status (paid sets paidAt)
     DELETE /api/brand/payments/:id       → cancel invoice
     ══════════════════════════════════════════════════════════════════════ */

  /** List payments/invoices. Optionally filter by status. */
  getPayments(
    status?: PaymentStatus
  ): Observable<{ success: boolean; payments: Payment[] }> {
    const params = this.buildParams(status ? { status } : undefined);
    return this.http
      .get<{ success: boolean; payments: Payment[] }>(`${BASE}/payments`, { params })
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Create a new invoice. Invoice number is auto-generated server-side. */
  createPayment(
    payload: CreatePaymentPayload
  ): Observable<{ success: boolean; payment: Payment }> {
    return this.http
      .post<{ success: boolean; payment: Payment }>(`${BASE}/payments`, payload)
      .pipe(catchError(e => this.handleError(e)));
  }

  /**
   * Update payment status.
   * When status is set to 'paid', backend automatically sets paidAt.
   */
  updatePayment(
    id: string,
    payload: Partial<Pick<Payment, 'status' | 'dueDate' | 'notes' | 'paidAt'>>
  ): Observable<{ success: boolean; payment: Payment }> {
    return this.http
      .put<{ success: boolean; payment: Payment }>(`${BASE}/payments/${id}`, payload)
      .pipe(catchError(e => this.handleError(e)));
  }

  /** Cancel an invoice. Sets status to 'cancelled'. */
  deletePayment(id: string): Observable<{ success: boolean; message: string }> {
    return this.http
      .delete<{ success: boolean; message: string }>(`${BASE}/payments/${id}`)
      .pipe(catchError(e => this.handleError(e)));
  }

  /* ══════════════════════════════════════════════════════════════════════
     CONVENIENCE HELPERS
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Returns just the campaigns array (strips pagination wrapper).
   * Useful for dropdowns / selects.
   */
  getCampaignsList(status?: CampaignStatus): Observable<Campaign[]> {
    return this.getCampaigns({ status, limit: 100 }).pipe(
      map(res => res.campaigns)
    );
  }

  /**
   * Returns the current cached profile synchronously (may be null on first load).
   * Use getProfile() to ensure it's loaded first.
   */
  get currentProfile(): BrandProfile | null {
    return this._profile$.getValue();
  }

  /**
   * Returns the current cached analytics synchronously.
   */
  get currentAnalytics(): BrandAnalytics | null {
    return this._analytics$.getValue();
  }

  /**
   * Calculate budget utilisation percentage.
   * Safe — returns 0 if totalAmount is zero.
   */
  budgetUtilPct(budget: Budget): number {
    if (!budget.totalAmount) return 0;
    return Math.min(100, Math.round((budget.allocated / budget.totalAmount) * 100));
  }

  /* ── Creator Applications ────────────────────────────────────────── */
  // getBrandApplications(params?: { status?: string; campaignId?: string }): Observable<any> {
  //   let q = '';
  //   if (params?.status)     q += `status=${params.status}&`;
  //   if (params?.campaignId) q += `campaignId=${params.campaignId}&`;
  //   return this.http.get<any>(`${BASE}/applications${q ? '?' + q : ''}`);
  // }

  // respondToApplication(id: string, action: 'accept' | 'reject', brandResponse?: string): Observable<any> {
  //   return this.http.patch<any>(`${BASE}/applications/${id}`, { action, brandResponse });
  // }

  /* ── Content Review ──────────────────────────────────────────────── */
  // getBrandContentPosts(status?: string): Observable<any> {
  //   return this.http.get<any>(`${BASE}/content-review${status ? '?status=' + status : ''}`);
  // }

  // reviewContentPost(id: string, action: string, brandNotes?: string, paymentAmount?: number): Observable<any> {
  //   return this.http.patch<any>(`${BASE}/content-review/${id}/review`, { action, brandNotes, paymentAmount });
  // }

  // payContentPost(id: string): Observable<any> {
  //   return this.http.post<any>(`${BASE}/content-review/${id}/pay`, {});
  // }

  // collabCompletionRate(analytics: BrandAnalytics): number {
  //   if (!analytics.totalCollaborations) return 0;
  //   return Math.round((analytics.completedCollaborations / analytics.totalCollaborations) * 100);
  // }

  // /* ── Brand Invitations sent by this brand ────────────────────────── */
  // getBrandInvitations(status?: string): Observable<any> {
  //   return this.http.get<any>(`${BASE}/invitations${status ? '?status=' + status : ''}`);
  // }

  /* ── Explore Creators ────────────────────────────────────────────── */
  exploreCreators(filters: { search?: string; niche?: string; platform?: string; page?: number; limit?: number }): Observable<ExploreCreatorsResponse> {
    // GET /api/brand/creators — uses BASE which is guaranteed to be mounted
    let q = '';
    if (filters.search)   q += `search=${encodeURIComponent(filters.search)}&`;
    if (filters.niche)    q += `niche=${encodeURIComponent(filters.niche)}&`;
    if (filters.platform) q += `platform=${encodeURIComponent(filters.platform)}&`;
    if (filters.page)     q += `page=${filters.page}&`;
    q += `limit=${filters.limit || 12}`;
    return this.http.get<ExploreCreatorsResponse>(`${BASE}/creators?${q}`);
  }

  /* ── Send invitation to a creator ───────────────────────────────── */
  sendCreatorInvite(creatorId: string, payload: { campaignId?: string; invitationMessage: string; proposedAmount: number }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/creators/${creatorId}/invite`, payload);
  }

  /* ── Get creator detail ──────────────────────────────────────────── */
  getCreatorDetail(creatorId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/users/creators/${creatorId}`);
  }
   /* ══ MESSAGING ═════════════════════════════════════════════════════ */
  getConversations(): Observable<any> {
    return this.http.get<any>(`${BASE}/messages`).pipe(catchError(e => this.handleError(e)));
  }
  getMessages(userId: string): Observable<any> {
    return this.http.get<any>(`${BASE}/messages/${userId}`).pipe(catchError(e => this.handleError(e)));
  }
  sendMessage(data: { receiverId: string; content: string }): Observable<any> {
    return this.http.post<any>(`${BASE}/messages`, data).pipe(catchError(e => this.handleError(e)));
  }
 
  /* ══ CONTRACTS (brand side) ═════════════════════════════════════════ */
  getBrandContracts(): Observable<any> {
    return this.http.get<any>(`${BASE}/brand-contracts`).pipe(catchError(e => this.handleError(e)));
  }
  generateContract(applicationId: string, clauses?: string[]): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/contracts/generate`, { applicationId, clauses })
      .pipe(catchError(e => this.handleError(e)));
  }
  downloadContract(contractId: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/contracts/${contractId}/download`, { responseType: 'blob' })
      .pipe(catchError(e => this.handleError(e)));
  }
 getBrandApplications(params?: { status?: string; campaignId?: string }): Observable<any> {
    return this.http
      .get<any>(`${BASE}/applications`, { params: this.buildParams(params as any) })
      .pipe(catchError(e => this.handleError(e)));
  }
   respondToApplication(id: string, action: 'accept' | 'reject', brandResponse?: string): Observable<any> {
    return this.http
      .patch<any>(`${BASE}/applications/${id}`, { action, brandResponse })
      .pipe(catchError(e => this.handleError(e)));
  }
   getBrandContentPosts(status?: string): Observable<any> {
    const params = this.buildParams(status ? { status } : undefined);
    return this.http
      .get<any>(`${BASE}/content-review`, { params })
      .pipe(catchError(e => this.handleError(e)));
  }
   reviewContentPost(id: string, action: string, brandNotes?: string, paymentAmount?: number): Observable<any> {
    return this.http
      .patch<any>(`${BASE}/content-review/${id}/review`, { action, brandNotes, paymentAmount })
      .pipe(catchError(e => this.handleError(e)));
  }
   payContentPost(id: string): Observable<any> {
    return this.http
      .post<any>(`${BASE}/content-review/${id}/pay`, {})
      .pipe(catchError(e => this.handleError(e)));
  }
  collabCompletionRate(analytics: BrandAnalytics): number {
    if (!analytics.totalCollaborations) return 0;
    return Math.round((analytics.completedCollaborations / analytics.totalCollaborations) * 100);
  }
 
  /* ── Brand Invitations sent by this brand ─────────────────────────── */
  getBrandInvitations(status?: string): Observable<any> {
    const params = this.buildParams(status ? { status } : undefined);
    return this.http
      .get<any>(`${BASE}/invitations`, { params })
      .pipe(catchError(e => this.handleError(e)));
  }
  // collabCompletionRate(analytics: BrandAnalytics): number {
  //   if (!analytics.totalCollaborations) return 0;
  //   return Math.round((analytics.completedCollaborations / analytics.totalCollaborations) * 100);
  // }
 
  /* ── Brand Invitations sent by this brand ─────────────────────────── */
  // getBrandInvitations(status?: string): Observable<any> {
  //   const params = this.buildParams(status ? { status } : undefined);
  //   return this.http
  //     .get<any>(`${BASE}/invitations`, { params })
  //     .pipe(catchError(e => this.handleError(e)));
  // }
}