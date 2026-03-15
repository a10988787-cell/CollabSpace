// src/app/services/creator.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environment';

const BASE = `${environment.apiUrl}/creator`;
const API  = environment.apiUrl;

/* ════════════════════════════════════════════════════════════════════════
   INTERFACES
   ════════════════════════════════════════════════════════════════════════ */
export interface CreatorProfile {
  _id: string; owner: string; username: string; bio: string;
  niche: string; country: string; profilePicture: string;
  contactInfo: { phone: string; website: string; linkedin: string };
  isVerified: boolean; isArchived: boolean;
  createdAt: string; updatedAt: string;
}

export interface SocialAccount {
  _id: string; creator: string; platform: string; username: string;
  followersCount: number; engagementRate: number; profileUrl: string; isActive: boolean;
}

export interface PortfolioItem {
  _id: string; creator: string; campaignTitle: string; mediaType: string;
  platform: string; brandName: string; contentUrl: string; thumbnailUrl: string;
  metrics: { views: number; likes: number; comments: number; shares: number; reach: number };
  description: string; isPublic: boolean;
}

export interface CampaignApplication {
  _id: string; campaign: any; creator: string; proposalMessage: string;
  priceQuote: number; status: string; brandResponse: string; submittedAt: string;
}

export interface CollabPost {
  _id: string; collaboration: any; creator: string; brand: string;
  title: string; caption: string; contentType: 'text'|'image'|'video';
  mediaUrls: string[]; hashtags: string[]; platform: string;
  status: string; brandNotes: string; submittedAt: string;
  paymentAmount: number; isPaid: boolean; paidAt: string;
}

export interface ContentFile {
  _id: string; creator: string; fileName: string; fileType: string;
  fileUrl: string; thumbnailUrl: string; fileSize: number;
  caption: string; hashtags: string[];
}

export interface CreatorNotification {
  _id: string; recipient: string; type: string; title: string;
  message: string; link: string; isRead: boolean; createdAt: string;
}

export interface PerformanceAnalytics {
  _id: string; creator: string; platform: string; period: string;
  followers: number; engagementRate: number; avgLikes: number;
  avgComments: number; reach: number; impressions: number;
}

export interface AudienceInsight {
  _id: string; creator: string; platform: string;
  ageGroups: { label: string; percentage: number }[];
  genderDistribution: { male: number; female: number; other: number };
  topCountries: { country: string; percentage: number }[];
  interests: string[];
}

export interface RevenueEntry {
  _id: string; creator: string; campaignName: string; brandName: string;
  amount: number; currency: string; status: string; paymentDate: string;
}

export interface BrandInvitation {
  _id: string; creator: string; brand: any; campaign: any;
  invitationMessage: string; proposedAmount: number;
  status: string; respondedAt: string;
}

export interface AiSuggestion {
  _id: string; creator: string; type: string; prompt: string;
  generatedCaption: string; hashtags: string[]; contentIdea: string;
  editedContent: string; isSaved: boolean;
}

export interface GrowthMetric {
  _id: string; creator: string; platform: string; period: string;
  monthlyGrowth: number; weeklyGrowth: number; engagementTrend: number;
  dailyFollowers: { date: string; count: number }[];
}

export interface CreatorContract {
  _id: string; creator: string; brand: any; title: string;
  content: string; fileUrl: string; status: string; signedAt: string;
}

export interface Message {
  _id: string; sender: any; receiver: string; threadId: string;
  content: string; isRead: boolean; createdAt: string;
}

/* ════════════════════════════════════════════════════════════════════════
   SERVICE
   ════════════════════════════════════════════════════════════════════════ */
@Injectable({ providedIn: 'root' })
export class CreatorService {

  constructor(private http: HttpClient) {}

  private handleError(err: HttpErrorResponse): Observable<never> {
    const msg = err.error?.message || 'Something went wrong.';
    return throwError(() => ({ ...err, friendlyMessage: msg }));
  }

  /* ── 1. PROFILE ─────────────────────────────────────────────────────── */
  getProfile(): Observable<{ success: boolean; profile: CreatorProfile }> {
    return this.http.get<any>(`${BASE}/profile`).pipe(catchError(this.handleError));
  }
  updateProfile(data: FormData | Partial<CreatorProfile>): Observable<any> {
    return this.http.put<any>(`${BASE}/profile`, data).pipe(catchError(this.handleError));
  }
  deleteProfile(): Observable<any> {
    return this.http.delete<any>(`${BASE}/profile`).pipe(catchError(this.handleError));
  }
  getPublicProfile(creatorId: string): Observable<any> {
    return this.http.get<any>(`${API}/creators/${creatorId}/profile`).pipe(catchError(this.handleError));
  }

  /* ── 2. SOCIAL ACCOUNTS ─────────────────────────────────────────────── */
  getSocialAccounts(): Observable<{ success: boolean; accounts: SocialAccount[] }> {
    return this.http.get<any>(`${BASE}/social`).pipe(catchError(this.handleError));
  }
  addSocialAccount(data: Partial<SocialAccount>): Observable<any> {
    return this.http.post<any>(`${BASE}/social`, data).pipe(catchError(this.handleError));
  }
  updateSocialAccount(id: string, data: Partial<SocialAccount>): Observable<any> {
    return this.http.put<any>(`${BASE}/social/${id}`, data).pipe(catchError(this.handleError));
  }
  deleteSocialAccount(id: string): Observable<any> {
    return this.http.delete<any>(`${BASE}/social/${id}`).pipe(catchError(this.handleError));
  }

  /* ── 3. PORTFOLIO ───────────────────────────────────────────────────── */
  getPortfolio(): Observable<{ success: boolean; items: PortfolioItem[] }> {
    return this.http.get<any>(`${BASE}/portfolio`).pipe(catchError(this.handleError));
  }
  addPortfolioItem(data: FormData): Observable<any> {
    return this.http.post<any>(`${BASE}/portfolio`, data).pipe(catchError(this.handleError));
  }
  updatePortfolioItem(id: string, data: Partial<PortfolioItem>): Observable<any> {
    return this.http.put<any>(`${BASE}/portfolio/${id}`, data).pipe(catchError(this.handleError));
  }
  deletePortfolioItem(id: string): Observable<any> {
    return this.http.delete<any>(`${BASE}/portfolio/${id}`).pipe(catchError(this.handleError));
  }

  /* ── 4. CAMPAIGN APPLICATIONS ───────────────────────────────────────── */
  getApplications(status?: string): Observable<{ success: boolean; applications: CampaignApplication[] }> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<any>(`${BASE}/applications`, { params }).pipe(catchError(this.handleError));
  }
  submitApplication(data: { campaignId: string; proposalMessage: string; priceQuote: number }): Observable<any> {
    return this.http.post<any>(`${BASE}/applications`, data).pipe(catchError(this.handleError));
  }
  updateApplication(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${BASE}/applications/${id}`, data).pipe(catchError(this.handleError));
  }
  withdrawApplication(id: string): Observable<any> {
    return this.http.delete<any>(`${BASE}/applications/${id}`).pipe(catchError(this.handleError));
  }

  /* ── 5. COLLAB POSTS ─────────────────────────────────────────────────── */
  getCollabPosts(): Observable<{ success: boolean; posts: CollabPost[] }> {
    return this.http.get<any>(`${BASE}/collab-posts`).pipe(catchError(this.handleError));
  }
  createCollabPost(data: FormData): Observable<any> {
    return this.http.post<any>(`${BASE}/collab-posts`, data).pipe(catchError(this.handleError));
  }
  submitCollabPost(id: string): Observable<any> {
    return this.http.post<any>(`${BASE}/collab-posts/${id}/submit`, {}).pipe(catchError(this.handleError));
  }
  updateCollabPost(id: string, data: Partial<CollabPost>): Observable<any> {
    return this.http.put<any>(`${BASE}/collab-posts/${id}`, data).pipe(catchError(this.handleError));
  }
  deleteCollabPost(id: string): Observable<any> {
    return this.http.delete<any>(`${BASE}/collab-posts/${id}`).pipe(catchError(this.handleError));
  }
  // Brand side
  getBrandCollabPosts(status?: string): Observable<any> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<any>(`${API}/collab-posts`, { params }).pipe(catchError(this.handleError));
  }
  reviewCollabPost(id: string, action: string, brandNotes?: string, paymentAmount?: number): Observable<any> {
    return this.http.patch<any>(`${API}/collab-posts/${id}/review`, { action, brandNotes, paymentAmount }).pipe(catchError(this.handleError));
  }
  payCollabPost(id: string): Observable<any> {
    return this.http.post<any>(`${API}/collab-posts/${id}/pay`, {}).pipe(catchError(this.handleError));
  }

  /* ── 6. CONTENT LIBRARY ─────────────────────────────────────────────── */
  getContentLibrary(fileType?: string): Observable<{ success: boolean; files: ContentFile[] }> {
    let params = new HttpParams();
    if (fileType) params = params.set('fileType', fileType);
    return this.http.get<any>(`${BASE}/content`, { params }).pipe(catchError(this.handleError));
  }
  uploadContent(data: FormData): Observable<any> {
    return this.http.post<any>(`${BASE}/content`, data).pipe(catchError(this.handleError));
  }
  updateContent(id: string, data: Partial<ContentFile>): Observable<any> {
    return this.http.put<any>(`${BASE}/content/${id}`, data).pipe(catchError(this.handleError));
  }
  deleteContent(id: string): Observable<any> {
    return this.http.delete<any>(`${BASE}/content/${id}`).pipe(catchError(this.handleError));
  }

  /* ── 7. NOTIFICATIONS ───────────────────────────────────────────────── */
  getNotifications(unread?: boolean): Observable<{ success: boolean; notifications: CreatorNotification[]; unreadCount: number }> {
    let params = new HttpParams();
    if (unread) params = params.set('unread', 'true');
    return this.http.get<any>(`${BASE}/notifications`, { params }).pipe(catchError(this.handleError));
  }
  markNotificationRead(id: string): Observable<any> {
    return this.http.patch<any>(`${BASE}/notifications/${id}/read`, {}).pipe(catchError(this.handleError));
  }
  markAllRead(): Observable<any> {
    return this.http.patch<any>(`${BASE}/notifications/mark-all-read`, {}).pipe(catchError(this.handleError));
  }
  deleteNotification(id: string): Observable<any> {
    return this.http.delete<any>(`${BASE}/notifications/${id}`).pipe(catchError(this.handleError));
  }

  /* ── 8. PERFORMANCE ANALYTICS ───────────────────────────────────────── */
  getAnalytics(period = '30d', platform = 'All'): Observable<{ success: boolean; analytics: PerformanceAnalytics }> {
    const params = new HttpParams().set('period', period).set('platform', platform);
    return this.http.get<any>(`${BASE}/analytics`, { params }).pipe(catchError(this.handleError));
  }
  updateAnalytics(data: any): Observable<any> {
    return this.http.put<any>(`${BASE}/analytics`, data).pipe(catchError(this.handleError));
  }

  /* ── 9. AUDIENCE INSIGHTS ───────────────────────────────────────────── */
  getAudienceInsights(platform = 'All'): Observable<{ success: boolean; insight: AudienceInsight }> {
    const params = new HttpParams().set('platform', platform);
    return this.http.get<any>(`${BASE}/audience`, { params }).pipe(catchError(this.handleError));
  }
  updateAudienceInsights(data: any): Observable<any> {
    return this.http.put<any>(`${BASE}/audience`, data).pipe(catchError(this.handleError));
  }

  /* ── 10. REVENUE TRACKING ───────────────────────────────────────────── */
  getRevenue(status?: string): Observable<{ success: boolean; entries: RevenueEntry[]; totalReceived: number; totalPending: number }> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<any>(`${BASE}/revenue`, { params }).pipe(catchError(this.handleError));
  }
  addRevenueEntry(data: Partial<RevenueEntry>): Observable<any> {
    return this.http.post<any>(`${BASE}/revenue`, data).pipe(catchError(this.handleError));
  }
  updateRevenueEntry(id: string, data: Partial<RevenueEntry>): Observable<any> {
    return this.http.put<any>(`${BASE}/revenue/${id}`, data).pipe(catchError(this.handleError));
  }
  deleteRevenueEntry(id: string): Observable<any> {
    return this.http.delete<any>(`${BASE}/revenue/${id}`).pipe(catchError(this.handleError));
  }

  /* ── 11. BRAND INVITATIONS ──────────────────────────────────────────── */
  getInvitations(status?: string): Observable<{ success: boolean; invitations: BrandInvitation[] }> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<any>(`${BASE}/invitations`, { params }).pipe(catchError(this.handleError));
  }
  respondToInvitation(id: string, action: 'accept'|'reject', creatorResponse?: string): Observable<any> {
    return this.http.post<any>(`${BASE}/invitations/${id}/respond`, { action, creatorResponse }).pipe(catchError(this.handleError));
  }
  deleteInvitation(id: string): Observable<any> {
    return this.http.delete<any>(`${BASE}/invitations/${id}`).pipe(catchError(this.handleError));
  }
  // Brand sends invitation
  sendInvitation(creatorId: string, data: any): Observable<any> {
    return this.http.post<any>(`${API}/creators/${creatorId}/invite`, data).pipe(catchError(this.handleError));
  }

  /* ── 12. AI CONTENT TOOLS ───────────────────────────────────────────── */
  getAiSuggestions(): Observable<{ success: boolean; suggestions: AiSuggestion[] }> {
    return this.http.get<any>(`${BASE}/ai`).pipe(catchError(this.handleError));
  }
  generateAiSuggestion(data: { type: string; prompt?: string; platform?: string; niche?: string }): Observable<any> {
    return this.http.post<any>(`${BASE}/ai/generate`, data).pipe(catchError(this.handleError));
  }
  updateAiSuggestion(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${BASE}/ai/${id}`, data).pipe(catchError(this.handleError));
  }
  deleteAiSuggestion(id: string): Observable<any> {
    return this.http.delete<any>(`${BASE}/ai/${id}`).pipe(catchError(this.handleError));
  }

  /* ── 13. GROWTH METRICS ─────────────────────────────────────────────── */
  getGrowthMetrics(period = '30d', platform = 'All'): Observable<{ success: boolean; metric: GrowthMetric }> {
    const params = new HttpParams().set('period', period).set('platform', platform);
    return this.http.get<any>(`${BASE}/growth`, { params }).pipe(catchError(this.handleError));
  }
  updateGrowthMetrics(data: any): Observable<any> {
    return this.http.put<any>(`${BASE}/growth`, data).pipe(catchError(this.handleError));
  }

  /* ── 14. CONTRACTS ──────────────────────────────────────────────────── */
  getContracts(): Observable<{ success: boolean; contracts: CreatorContract[] }> {
    return this.http.get<any>(`${BASE}/contracts`).pipe(catchError(this.handleError));
  }
  uploadContract(data: FormData): Observable<any> {
    return this.http.post<any>(`${BASE}/contracts`, data).pipe(catchError(this.handleError));
  }
  signContract(id: string): Observable<any> {
    return this.http.post<any>(`${BASE}/contracts/${id}/sign`, {}).pipe(catchError(this.handleError));
  }
  updateContract(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${BASE}/contracts/${id}`, data).pipe(catchError(this.handleError));
  }
  archiveContract(id: string): Observable<any> {
    return this.http.delete<any>(`${BASE}/contracts/${id}`).pipe(catchError(this.handleError));
  }

  /* ── 15. MESSAGING ──────────────────────────────────────────────────── */
  getConversations(): Observable<{ success: boolean; conversations: any[] }> {
    return this.http.get<any>(`${BASE}/messages`).pipe(catchError(this.handleError));
  }
  getMessages(userId: string): Observable<{ success: boolean; messages: Message[]; threadId: string }> {
    return this.http.get<any>(`${BASE}/messages/${userId}`).pipe(catchError(this.handleError));
  }
  sendMessage(data: { receiverId: string; content: string }): Observable<any> {
    return this.http.post<any>(`${BASE}/messages`, data).pipe(catchError(this.handleError));
  }
  updateMessage(id: string, content: string): Observable<any> {
    return this.http.put<any>(`${BASE}/messages/${id}`, { content }).pipe(catchError(this.handleError));
  }
  deleteMessage(id: string): Observable<any> {
    return this.http.delete<any>(`${BASE}/messages/${id}`).pipe(catchError(this.handleError));
  }
}