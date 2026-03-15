// src/app/Brand/brand-explore-creators/brand-explore-creators.component.ts
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-brand-explore-creators',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-explore-creators.component.html',
  styleUrls: ['./brand-explore-creators.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandExploreCreatorsComponent implements OnInit {

  creators: any[] = [];
  campaigns: any[] = [];
  loading = true;
  loadingMore = false;

  search   = '';
  niche    = '';
  platform = '';

  niches    = ['', 'Fashion', 'Beauty', 'Tech', 'Gaming', 'Food', 'Travel', 'Fitness', 'Lifestyle', 'Music', 'Education', 'Comedy'];
  platforms = ['', 'Instagram', 'YouTube', 'TikTok', 'Twitter', 'Twitch', 'Blog', 'Podcast'];

  page  = 1;
  pages = 1;
  total = 0;

  // Drawer (profile preview)
  drawer: any = null;

  // Invite modal
  showInvite = false;
  inviting   = false;
  selCreator: any = null;
  inviteForm = { campaignId: '', invitationMessage: '', proposedAmount: 0 };

  toast: { msg: string; type: 'ok' | 'err' } | null = null;
  private toastTimer: any;

  constructor(private svc: BrandService) {}

  ngOnInit(): void {
    this.load();
    this.svc.getCampaignsList('active').subscribe({
      next: list => this.campaigns = list,
      error: () => {},
    });
  }

  load(append = false): void {
    if (!append) { this.loading = true; this.creators = []; this.page = 1; }
    else this.loadingMore = true;

    this.svc.exploreCreators({
      search:   this.search.trim()  || undefined,
      niche:    this.niche          || undefined,
      platform: this.platform       || undefined,
      page:     this.page,
      limit:    12,
    }).subscribe({
      next: (res: any) => {
        this.creators    = append ? [...this.creators, ...res.creators] : res.creators;
        this.total       = res.pagination?.total || res.creators.length;
        this.pages       = res.pagination?.pages || 1;
        this.loading     = false;
        this.loadingMore = false;
      },
      error: (e: any) => {
        this.loading = false;
        this.loadingMore = false;
        this.showToast(e?.error?.message || 'Failed to load creators.', 'err');
      },
    });
  }

  applyFilters(): void { this.load(); }
  clearFilters(): void { this.search = ''; this.niche = ''; this.platform = ''; this.load(); }
  loadMore(): void {
    if (this.page >= this.pages || this.loadingMore) return;
    this.page++;
    this.load(true);
  }

  // Drawer
  openDrawer(c: any): void { this.drawer = c; }
  closeDrawer(): void { this.drawer = null; }

  // Invite modal
  openInvite(c: any, e: Event): void {
    e.stopPropagation();
    this.drawer = null;
    this.selCreator = c;
    this.inviteForm = {
      campaignId:        '',
      invitationMessage: `Hi ${c.firstName}! We'd love to work with you on an upcoming campaign.`,
      proposedAmount:    0,
    };
    this.showInvite = true;
  }

  sendInvite(): void {
    if (!this.selCreator) return;
    this.inviting = true;
    this.svc.sendCreatorInvite(this.selCreator._id, {
      campaignId:        this.inviteForm.campaignId || undefined,
      invitationMessage: this.inviteForm.invitationMessage,
      proposedAmount:    this.inviteForm.proposedAmount,
    } as any).subscribe({
      next: () => {
        this.inviting    = false;
        this.showInvite  = false;
        this.showToast(`Invitation sent to ${this.selCreator?.firstName}! They will be notified.`, 'ok');
      },
      error: (e: any) => {
        this.inviting = false;
        this.showToast(e?.error?.message || 'Failed to send invitation.', 'err');
      },
    });
  }

  // Helpers
  followersTotal(c: any): string {
    const total = (c.socials || []).reduce((s: number, a: any) => s + (a.followersCount || 0), 0);
    return total >= 1_000_000 ? (total / 1_000_000).toFixed(1) + 'M'
         : total >= 1_000     ? (total / 1_000).toFixed(1) + 'K'
         : total > 0          ? String(total) : '—';
  }

  avgEngagement(c: any): string {
    const s = c.socials || [];
    if (!s.length) return '—';
    const avg = s.reduce((sum: number, a: any) => sum + (a.engagementRate || 0), 0) / s.length;
    return avg.toFixed(1) + '%';
  }

  creatorNiche(c: any): string { return c.profile?.niche || c.platform || '—'; }
  bio(c: any): string         { return c.profile?.bio || c.bio || ''; }

  avatarGrad(name = ''): string {
    const g = [
      'linear-gradient(135deg,#8B5CF6,#6D28D9)',
      'linear-gradient(135deg,#FBBF24,#D97706)',
      'linear-gradient(135deg,#34D399,#059669)',
      'linear-gradient(135deg,#38BDF8,#0EA5E9)',
      'linear-gradient(135deg,#FB7185,#E11D48)',
      'linear-gradient(135deg,#F472B6,#DB2777)',
    ];
    return g[(name.charCodeAt(0) || 0) % g.length];
  }

  platformColor(p = ''): string {
    const m: Record<string, string> = {
      instagram: '#E1306C', youtube: '#FF0000', tiktok: '#69C9D0',
      twitter: '#1DA1F2',   twitch: '#9146FF',  blog: '#FBBF24', podcast: '#A78BFA',
    };
    return m[p.toLowerCase()] || '#9896BC';
  }

  private showToast(msg: string, type: 'ok' | 'err'): void {
    clearTimeout(this.toastTimer);
    this.toast = { msg, type };
    this.toastTimer = setTimeout(() => this.toast = null, 4000);
  }
}