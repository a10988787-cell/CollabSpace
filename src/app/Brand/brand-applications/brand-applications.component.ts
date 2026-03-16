// src/app/Brand/brand-applications/brand-applications.component.ts
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-brand-applications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-applications.component.html',
  styleUrls: ['./brand-applications.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandApplicationsComponent implements OnInit {

  /* ── View mode ─────────────────────────────────────────────────── */
  view: 'applications' | 'content-review' = 'applications';

  /* ── Applications ──────────────────────────────────────────────── */
  applications: any[]  = [];
  campaigns: any[]     = [];
  loadingApps          = true;
  filterStatus         = '';
  filterCampaign       = '';

  showRespondModal     = false;
  selApp: any          = null;
  respondAction: 'accept'|'reject' = 'accept';
  brandResponse        = '';
  saving               = false;

  /* ── Content Review ────────────────────────────────────────────── */
  posts: any[]         = [];
  loadingPosts         = true;
  filterPostStatus     = 'submitted';

  showReviewModal      = false;
  selPost: any         = null;
  reviewForm: any      = { action: 'approve', brandNotes: '', paymentAmount: 0 };

  toast: { msg: string; type: 'ok'|'err' } | null = null;
  private tt: any;

  constructor(private svc: BrandService) {}

  ngOnInit(): void {
    this.loadApplications();
    this.loadPosts();
    this.svc.getCampaignsList('active').subscribe({ next: l => this.campaigns = l, error: () => {} });
  }

  /* ══ APPLICATIONS ══════════════════════════════════════════════════ */
  loadApplications(): void {
    this.loadingApps = true;
    this.svc.getBrandApplications({
      status:     this.filterStatus    || undefined,
      campaignId: this.filterCampaign  || undefined,
    }).subscribe({
      next: (r: any) => { this.applications = r.applications || []; this.loadingApps = false; },
      error: ()      => { this.loadingApps = false; },
    });
  }

  get appCounts() {
    return {
      all:      this.applications.length,
      pending:  this.applications.filter(a => a.status === 'pending').length,
      accepted: this.applications.filter(a => a.status === 'accepted').length,
      rejected: this.applications.filter(a => a.status === 'rejected').length,
    };
  }

  openRespond(app: any, action: 'accept'|'reject'): void {
    this.selApp       = app;
    this.respondAction = action;
    this.brandResponse = '';
    this.showRespondModal = true;
  }

  confirmRespond(): void {
    if (!this.selApp) return;
    this.saving = true;
    this.svc.respondToApplication(this.selApp._id, this.respondAction, this.brandResponse).subscribe({
      next: () => {
        this.saving = false;
        this.showRespondModal = false;
        const msg = this.respondAction === 'accept'
          ? `✅ Accepted! ${this.selApp.creator?.firstName} has been notified and can now upload content.`
          : `Application rejected. ${this.selApp.creator?.firstName} has been notified.`;
        this.showToast(msg, 'ok');
        this.loadApplications();
      },
      error: (e: any) => { this.saving = false; this.showToast(e?.error?.message || 'Error', 'err'); },
    });
  }

  /* ══ CONTENT REVIEW ════════════════════════════════════════════════ */
  loadPosts(): void {
    this.loadingPosts = true;
    this.svc.getBrandContentPosts(this.filterPostStatus || undefined).subscribe({
      next: (r: any) => { this.posts = r.posts || []; this.loadingPosts = false; },
      error: ()      => { this.loadingPosts = false; },
    });
  }

  get postCounts() {
    return {
      review:   this.posts.filter(p => p.status === 'submitted').length,
      approved: this.posts.filter(p => p.status === 'approved').length,
      paid:     this.posts.filter(p => p.status === 'paid').length,
    };
  }

  openReview(post: any): void {
    this.selPost    = post;
    this.reviewForm = { action: 'approve', brandNotes: '', paymentAmount: post.paymentAmount || 0 };
    this.showReviewModal = true;
  }

  submitReview(): void {
    if (!this.selPost) return;
    this.saving = true;
    this.svc.reviewContentPost(
      this.selPost._id,
      this.reviewForm.action,
      this.reviewForm.brandNotes,
      this.reviewForm.paymentAmount,
    ).subscribe({
      next: () => {
        this.saving = false;
        this.showReviewModal = false;
        this.loadPosts();
        const msgs: any = {
          approve:          '✅ Content approved! Creator notified.',
          request_revision: '📝 Revision requested. Creator notified.',
          reject:           '❌ Content rejected. Creator notified.',
        };
        this.showToast(msgs[this.reviewForm.action] || 'Done.', 'ok');
      },
      error: (e: any) => { this.saving = false; this.showToast(e?.error?.message || 'Error', 'err'); },
    });
  }

  payCreator(post: any): void {
    if (!confirm(`Pay $${post.paymentAmount} to ${post.creator?.firstName} ${post.creator?.lastName}?`)) return;
    this.svc.payContentPost(post._id).subscribe({
      next: () => { this.loadPosts(); this.showToast(`💸 Payment of $${post.paymentAmount} sent to ${post.creator?.firstName}!`, 'ok'); },
      error: (e: any) => { this.showToast(e?.error?.message || 'Payment failed', 'err'); },
    });
  }

  /* ══ HELPERS ═══════════════════════════════════════════════════════ */
  appStatusColor(s: string): string {
    const m: any = { pending:'#FBBF24', accepted:'#34D399', rejected:'#FB7185', withdrawn:'#3A385C' };
    return m[s] || '#3A385C';
  }
  appStatusBg(s: string): string {
    const m: any = { pending:'rgba(251,191,36,.12)', accepted:'rgba(52,211,153,.12)', rejected:'rgba(251,113,133,.12)', withdrawn:'rgba(255,255,255,.04)' };
    return m[s] || 'rgba(255,255,255,.04)';
  }
  postStatusLabel(s: string): string {
    const m: any = { draft:'Draft', submitted:'Under Review', approved:'Approved', revision_requested:'Revision', rejected:'Rejected', paid:'Paid' };
    return m[s] || s;
  }
  postStatusClass(s: string): string {
    const m: any = { submitted:'sc-sky', approved:'sc-jade', paid:'sc-acc', revision_requested:'sc-amber', rejected:'sc-rose', draft:'sc-gray' };
    return m[s] || 'sc-gray';
  }
  fmtDate(d: string): string {
    return d ? new Date(d).toLocaleDateString('en', { month:'short', day:'numeric', year:'numeric' }) : '—';
  }
  private showToast(msg: string, type: 'ok'|'err'): void {
    clearTimeout(this.tt);
    this.toast = { msg, type };
    this.tt = setTimeout(() => this.toast = null, 4500);
  }
}