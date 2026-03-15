// src/app/brand/brand-explore-creators/brand-explore-creators.component.ts
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { Router }        from '@angular/router';
import { BrandService, ExploreCreatorsResponse } 
from '../../services/brand.service';

interface Creator {
  _id:       string;
  firstName: string;
  lastName:  string;
  fullName:  string;
  initials:  string;
  avatar:    string;
  bio:       string;
  platform:  string;
  createdAt: string;
}

interface Campaign {
  _id:    string;
  title:  string;
  budget: number;
  status: string;
}
// interface ExploreCreatorsResponse {
//   creators: Creator[];
//   pagination: {
//     total: number;
//     pages: number;
//   };
// }
@Component({
  selector: 'app-brand-explore-creators',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-explore-creators.component.html',
  styleUrls:   ['./brand-explore-creators.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandExploreCreatorsComponent implements OnInit {

  /* ── Data ───────────────────────────────────────────────────────────── */
  creators:   Creator[]  = [];
  campaigns:  Campaign[] = [];
  loading     = true;
  loadingMore = false;

  /* ── Filters ────────────────────────────────────────────────────────── */
  search   = '';
  platform = '';
  readonly platforms = ['Instagram','YouTube','TikTok','Twitter','Twitch','Blog','Podcast'];

  /* ── Pagination ─────────────────────────────────────────────────────── */
  page  = 1;
  pages = 1;
  total = 0;
  readonly limit = 12;

  /* ── Drawer (profile preview) ───────────────────────────────────────── */
  drawer: Creator | null = null;

  /* ── Invite modal ───────────────────────────────────────────────────── */
  showModal       = false;
  saving          = false;
  selectedCreator: Creator | null = null;

  inviteForm = {
    creator:      '',
    campaignId:   '',
    deliverables: '',
    paymentTerms: '',
    amount:       null as number | null,
    message:      '',
  };

  /* ── Toast ──────────────────────────────────────────────────────────── */
  toast: { msg: string; type: 'ok' | 'err' } | null = null;
  private toastTimer: any;

  constructor(
    private svc:    BrandService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.fetchCreators();
    this.fetchCampaigns();
  }

  /* ══════════════════════════════════════════════════════════════════════
     LOAD CREATORS  — calls GET /api/users/creators
     ══════════════════════════════════════════════════════════════════════ */
  fetchCreators(append = false): void {
    if (!append) {
      this.loading  = true;
      this.creators = [];
      this.page     = 1;
    } else {
      this.loadingMore = true;
    }

    this.svc.exploreCreators({
      search:   this.search.trim()   || undefined,
      platform: this.platform        || undefined,
      page:     this.page,
      limit:    this.limit,
    }).subscribe({
      next: (res: ExploreCreatorsResponse) => {
        this.creators    = append
          ? [...this.creators, ...res.creators]
          : res.creators;
        this.total       = res.pagination.total;
        this.pages       = res.pagination.pages;
        this.loading     = false;
        this.loadingMore = false;
      },
      error: e => {
        this.loading     = false;
        this.loadingMore = false;
        this.showToast(e?.friendlyMessage ?? 'Failed to load creators.', 'err');
      },
    });
  }

  /* ── Load active campaigns for the invite dropdown ─────────────────── */
  fetchCampaigns(): void {
    this.svc.getCampaignsList('active').subscribe({
      next:  list => this.campaigns = list,
      error: ()   => {},
    });
  }

  /* ── Filter & search ────────────────────────────────────────────────── */
  applySearch():   void { this.fetchCreators(); }
  applyPlatform(): void { this.fetchCreators(); }
  clearFilters():  void { this.search = ''; this.platform = ''; this.fetchCreators(); }

  loadMore(): void {
    if (this.page >= this.pages || this.loadingMore) return;
    this.page++;
    this.fetchCreators(true);
  }

  /* ══════════════════════════════════════════════════════════════════════
     DRAWER
     ══════════════════════════════════════════════════════════════════════ */
  openDrawer(c: Creator):  void { this.drawer = c; }
  closeDrawer():           void { this.drawer = null; }

  /* ══════════════════════════════════════════════════════════════════════
     INVITE MODAL
     ══════════════════════════════════════════════════════════════════════ */
  openInvite(c: Creator, e: Event): void {
    e.stopPropagation();
    this.drawer          = null;
    this.selectedCreator = c;
    this.inviteForm = {
      creator:      c._id,
      campaignId:   '',
      deliverables: '',
      paymentTerms: '',
      amount:       null,
      message:      `Hi ${c.firstName}! We'd love to work with you on an upcoming campaign.`,
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal       = false;
    this.selectedCreator = null;
  }

  /**
   * POST /api/brand/collaborations
   * Status is set to 'pending' by default on the backend (model default).
   * On success → navigate to /dashboard/brand/collaborations so brand
   * sees the new pending invite immediately.
   */
  sendInvite(): void {
    if (!this.inviteForm.creator) return;
    this.saving = true;

    this.svc.createCollaboration({
      creator:      this.inviteForm.creator,
      campaign:     this.inviteForm.campaignId || undefined,
      deliverables: this.inviteForm.deliverables,
      paymentTerms: this.inviteForm.paymentTerms,
      amount:       this.inviteForm.amount ?? 0,
      message:      this.inviteForm.message,
    }).subscribe({
      next: () => {
        this.saving    = false;
        this.showModal = false;
        this.showToast(
          `✅ Invite sent to ${this.selectedCreator?.firstName}! Redirecting to collaborations…`,
          'ok',
        );
        // After 1.4s navigate to collaborations page — user sees pending invite
        setTimeout(() => {
          this.router.navigate(['/dashboard/brand/collaborations']);
        }, 1400);
      },
      error: e => {
        this.saving = false;
        this.showToast(e?.friendlyMessage ?? 'Failed to send invite.', 'err');
      },
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     HELPERS
     ══════════════════════════════════════════════════════════════════════ */
  avatarGrad(name = ''): string {
    const g = [
      'linear-gradient(135deg,#8B5CF6,#6D28D9)',
      'linear-gradient(135deg,#FBBF24,#D97706)',
      'linear-gradient(135deg,#34D399,#059669)',
      'linear-gradient(135deg,#38BDF8,#0EA5E9)',
      'linear-gradient(135deg,#FB7185,#E11D48)',
      'linear-gradient(135deg,#A78BFA,#7C3AED)',
    ];
    return g[(name.charCodeAt(0) ?? 0) % g.length];
  }

  platformBg(p = ''): string {
    const m: Record<string, string> = {
      instagram:'rgba(225,48,108,.15)', youtube:'rgba(255,0,0,.12)',
      tiktok:'rgba(105,201,208,.15)',   twitter:'rgba(29,161,242,.15)',
      twitch:'rgba(145,70,255,.15)',    blog:'rgba(251,191,36,.15)',
      podcast:'rgba(139,92,246,.15)',
    };
    return m[p.toLowerCase()] ?? 'rgba(148,163,184,.1)';
  }

  platformColor(p = ''): string {
    const m: Record<string, string> = {
      instagram:'#E1306C', youtube:'#FF0000', tiktok:'#69C9D0',
      twitter:'#1DA1F2',   twitch:'#9146FF',  blog:'#FBBF24', podcast:'#A78BFA',
    };
    return m[p.toLowerCase()] ?? '#9896BC';
  }

  private showToast(msg: string, type: 'ok' | 'err'): void {
    clearTimeout(this.toastTimer);
    this.toast = { msg, type };
    this.toastTimer = setTimeout(() => this.toast = null, 3500);
  }
}