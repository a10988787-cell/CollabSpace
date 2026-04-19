// src/app/Brand/brand-applications/brand-applications.component.ts
import { Component, OnInit, OnDestroy, ViewEncapsulation, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { BrandService }  from '../../services/brand.service';
import { AuthService }   from '../../services/auth.service';
import { environment }   from '../../environment';

function mediaUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  return environment.apiUrl.replace('/api', '') + (url.startsWith('/') ? url : '/' + url);
}

@Component({
  selector: 'app-brand-applications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-applications.component.html',
  styleUrls: ['./brand-applications.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandApplicationsComponent implements OnInit, OnDestroy {

  view: 'applications' | 'content-review' | 'contracts' = 'applications';

  /* ── Applications ── */
  applications: any[] = [];
  invitations:  any[] = [];
  campaigns:    any[] = [];
  loadingApps       = true;
  filterStatus      = '';
  filterCampaign    = '';

  showRespondModal  = false;
  showContractModal = false;
  selApp:  any      = null;
  respondAction: 'accept' | 'reject' = 'accept';
  brandResponse     = '';
  saving            = false;
  generatingContract = false;
  contractClauses   = '';

  /* ── Content Review ── */
  posts:        any[] = [];
  loadingPosts      = true;
  filterPostStatus  = 'submitted';
  showReviewModal   = false;
  selPost: any      = null;
  reviewForm: any   = { action: 'approve', brandNotes: '', paymentAmount: 0 };

  /* ── Contracts ── */
  contracts:    any[] = [];
  loadingContracts = true;

  /* ── Socket ── */
  private socket:    any;
  private isBrowser: boolean;

  toast: { msg: string; type: 'ok' | 'err' } | null = null;
  private tt: any;

  constructor(
    private svc:  BrandService,
    private auth: AuthService,
    @Inject(PLATFORM_ID) pid: object,
  ) { this.isBrowser = isPlatformBrowser(pid); }

  ngOnInit(): void {
    this.loadApplications();
    this.loadInvitations();
    this.loadPosts();
    this.loadContracts();
    this.svc.getCampaigns({ limit: 100 }).subscribe({
      next: (r: any) => { this.campaigns = r.campaigns || r.data || []; },
      error: () => {},
    });
    if (this.isBrowser) this.initSocket();
  }

  ngOnDestroy(): void {
    if (this.socket) { this.socket.disconnect(); this.socket = null; }
  }

  /* ── Socket: listen for contract:signed ──────────────────────────── */
  private initSocket(): void {
    try {
      const { io } = require('socket.io-client');
      const token   = localStorage.getItem('cs_token') || '';
      this.socket   = io(environment.apiUrl.replace('/api', ''), {
        auth: { token }, transports: ['websocket', 'polling'],
      });
      this.socket.on('contract:signed', (data: any) => {
        this.showToast(`✍️ ${data.creatorName} signed "${data.title}"!`, 'ok');
        this.loadContracts();
      });
    } catch (_) {}
  }

  /* ══ APPLICATIONS ══════════════════════════════════════════════════ */
  loadApplications(): void {
    this.loadingApps = true;
    this.svc.getBrandApplications({
      status:     this.filterStatus   || undefined,
      campaignId: this.filterCampaign || undefined,
    }).subscribe({
      next: (r: any) => {
        // Handle both { applications: [] } and flat array responses
        this.applications = r.applications || r.data || (Array.isArray(r) ? r : []);
        this.loadingApps  = false;
      },
      error: (e: any) => {
        console.error('[brand-applications] load error:', e?.message || e);
        this.loadingApps = false;
      },
    });
  }

  /* ── Load accepted invitations ────────────────────────────────────── */
  // loadInvitations(): void {
  //   this.svc.getBrandInvitations('accepted').subscribe({
  //     next: (r: any) => {
  //       this.invitations = r.invitations || r.data || [];
  //     },
  //     error: () => { this.invitations = []; },
  //   });
  // }
loadInvitations(): void {
  this.svc.getBrandInvitations('accepted').subscribe({
    next: (res: any) => {
      // Handle multiple response formats safely
      this.invitations = res?.invitations || res?.data || [];

      // Optional: normalize structure (recommended)
      this.invitations = this.invitations.map((inv: any) => ({
        ...inv,
        _isInvitation: true,
        status: 'accepted',
        creator: inv.creator || inv.recipient
      }));
    },
    error: (err: any) => {
      console.error('[loadInvitations] error:', err);
      this.invitations = [];
    }
  });
}
  /** Merged list: applications + accepted invitations (deduplicated) */
  get allApplicants(): any[] {
    const appIds = new Set(this.applications.map((a: any) => a._id));
    const fromInvites: any[] = this.invitations
      .filter(inv => !appIds.has(inv._id))
      .map(inv => ({
        ...inv,
        _isInvitation: true,
        status:   'accepted',
        creator:  inv.creator || inv.recipient,
      }));
    return [...this.applications, ...fromInvites];
  }

  get appCounts() {
    const all = this.allApplicants;
    return {
      total:    all.length,
      pending:  all.filter(a => a.status === 'pending').length,
      accepted: all.filter(a => a.status === 'accepted').length,
      rejected: all.filter(a => a.status === 'rejected').length,
    };
  }

  openRespond(app: any, action: 'accept' | 'reject'): void {
    this.selApp          = app;
    this.respondAction   = action;
    this.brandResponse   = '';
    this.showRespondModal = true;
  }

  submitResponse(): void {
    if (!this.selApp) return;
    this.saving = true;
    this.svc.respondToApplication(this.selApp._id, this.respondAction, this.brandResponse).subscribe({
      next: () => {
        this.saving           = false;
        this.showRespondModal = false;
        const msg = this.respondAction === 'accept'
          ? '✅ Application accepted! Click "Send Contract" to generate a PDF contract.'
          : '❌ Application rejected. Creator notified.';
        this.showToast(msg, 'ok');
        this.loadApplications();
      },
      error: (e: any) => { this.saving = false; this.showToast(e?.error?.message || 'Error', 'err'); },
    });
  }

  /* ══ CONTRACT GENERATION ═══════════════════════════════════════════ */
  openContractModal(app: any): void {
    this.selApp            = app;
    this.contractClauses   = '';
    this.showContractModal = true;
  }

  generateContract(): void {
    if (!this.selApp) return;
    this.generatingContract = true;
    const clauses = this.contractClauses.trim()
      ? this.contractClauses.split('\n').filter(l => l.trim())
      : [];

    // For invitations, pass invitationId; for applications, pass applicationId
    const payload: any = { clauses };
    if (this.selApp._isInvitation) {
      payload.invitationId  = this.selApp._id;
    } else {
      payload.applicationId = this.selApp._id;
    }

    this.svc.generateContract(payload.applicationId || payload.invitationId, clauses).subscribe({
      next: (r: any) => {
        this.generatingContract = false;
        this.showContractModal  = false;
        this.showToast('📄 Contract PDF generated & sent to creator!', 'ok');
        this.loadContracts();
        // Notify via socket so creator gets real-time event
        this.socket?.emit('contract:send', { contractId: r.contract?._id });
      },
      error: (e: any) => {
        this.generatingContract = false;
        this.showToast(e?.error?.message || 'Contract generation failed.', 'err');
      },
    });
  }

  /* ══ CONTRACTS ════════════════════════════════════════════════════ */
  loadContracts(): void {
    this.loadingContracts = true;
    this.svc.getBrandContracts().subscribe({
      next: (r: any) => { this.contracts = r.contracts || []; this.loadingContracts = false; },
      error: ()      => { this.loadingContracts = false; },
    });
  }

  downloadContract(contract: any): void {
    this.svc.downloadContract(contract._id).subscribe({
      next: (blob: Blob) => {
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `contract_${contract._id.slice(-8)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.showToast('Download failed.', 'err'),
    });
  }

  viewSignedCopy(contract: any): void {
    if (!contract.signedFileUrl) return;
    const baseUrl = environment.apiUrl.replace('/api', '');
    window.open(baseUrl + contract.signedFileUrl, '_blank');
  }

  /* ══ CONTENT REVIEW ═══════════════════════════════════════════════ */
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
      this.selPost._id, this.reviewForm.action,
      this.reviewForm.brandNotes, this.reviewForm.paymentAmount,
    ).subscribe({
      next: () => {
        this.saving = false; this.showReviewModal = false; this.loadPosts();
        const msgs: any = {
          approve: '✅ Content approved!', request_revision: '📝 Revision requested.', reject: '❌ Rejected.',
        };
        this.showToast(msgs[this.reviewForm.action] || 'Done.', 'ok');
      },
      error: (e: any) => { this.saving = false; this.showToast(e?.error?.message || 'Error', 'err'); },
    });
  }

  /* ══ HELPERS ═════════════════════════════════════════════════════ */
  getMediaUrl(url: string): string { return mediaUrl(url); }

  appStatusColor(s: string): string {
    const m: any = { pending: '#FBBF24', accepted: '#34D399', rejected: '#FB7185', withdrawn: '#3A385C' };
    return m[s] || '#3A385C';
  }

  appStatusBg(s: string): string {
    const m: any = {
      pending:   'rgba(251,191,36,.12)',
      accepted:  'rgba(52,211,153,.12)',
      rejected:  'rgba(251,113,133,.12)',
      withdrawn: 'rgba(255,255,255,.04)',
    };
    return m[s] || 'rgba(255,255,255,.04)';
  }

  contractStatusClass(s: string): string {
    const m: any = { pending: 'pill-amber', signed: 'pill-jade', expired: 'pill-rose', archived: 'pill-gray' };
    return m[s] || 'pill-gray';
  }

  postStatusLabel(s: string): string {
    const m: any = {
      draft: 'Draft', submitted: 'Under Review', approved: 'Approved',
      revision_requested: 'Revision', rejected: 'Rejected', paid: 'Paid',
    };
    return m[s] || s;
  }

  postStatusClass(s: string): string {
    const m: any = {
      submitted: 'sc-sky', approved: 'sc-jade', paid: 'sc-acc',
      revision_requested: 'sc-amber', rejected: 'sc-rose', draft: 'sc-gray',
    };
    return m[s] || 'sc-gray';
  }

  fmtDate(d: string): string {
    return d ? new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  }

  private showToast(msg: string, type: 'ok' | 'err'): void {
    clearTimeout(this.tt);
    this.toast = { msg, type };
    this.tt = setTimeout(() => this.toast = null, 5000);
  }
}