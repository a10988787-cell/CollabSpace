// src/app/Creator/creator-applications/creator-applications.component.ts
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';

@Component({
  selector: 'app-creator-applications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creator-applications.component.html',
  styleUrls: ['./creator-applications.component.css'],
})
export class CreatorApplicationsComponent implements OnInit {
  @Output() navigate = new EventEmitter<string>();

  tab: 'browse' | 'mine' = 'browse';

  // ── Browse ──
  campaigns:  any[] = [];
  loadingC  = true;
  search    = '';
  filterPlat  = '';
  filterNiche = '';
  platOptions  = ['','Instagram','YouTube','TikTok','Twitter','Twitch','Blog','Podcast'];
  nicheOptions = ['','Fashion','Beauty','Tech','Gaming','Food','Travel','Fitness','Lifestyle','Music','Education','Comedy','Other'];

  // ── My Applications ──
  applications: any[] = [];
  loadingA    = true;
  filterStatus  = '';
  appliedIds  = new Set<string>();

  // ── Modals ──
  showApply   = false;
  showEdit    = false;
  showDetail  = false;
  saving      = false;
  selCamp:    any = null;
  selApp:     any = null;
  editingId:  string | null = null;
  applyForm   = { proposalMessage: '', priceQuote: 0 };
  editForm    = { proposalMessage: '', priceQuote: 0 };

  toast: { msg: string; type: 'ok'|'err' } | null = null;
  private tt: any;

  constructor(private creator: CreatorService) {}

  ngOnInit(): void { this.loadCampaigns(); this.loadApps(); }

  // ── Load campaigns ──
  loadCampaigns(): void {
    this.loadingC = true;
    this.creator.getPublicCampaigns({
      search:   this.search   || undefined,
      platform: this.filterPlat  || undefined,
      niche:    this.filterNiche || undefined,
    }).subscribe({
      next: (r: any) => { this.campaigns = r.campaigns || []; this.loadingC = false; },
      error: ()      => { this.loadingC = false; },
    });
  }

  // ── Load my applications ──
  loadApps(): void {
    this.loadingA = true;
    this.creator.getApplications(this.filterStatus || undefined).subscribe({
      next: r => {
        this.applications = r.applications || [];
        this.appliedIds   = new Set(
          this.applications
            .filter((a: any) => !['withdrawn','rejected'].includes(a.status))
            .map((a: any) => a.campaign?._id)
        );
        this.loadingA = false;
      },
      error: () => { this.loadingA = false; },
    });
  }

  onSearch():    void { this.loadCampaigns(); }
  clearFilters():void { this.search=''; this.filterPlat=''; this.filterNiche=''; this.loadCampaigns(); }
  applied(id: string): boolean { return this.appliedIds.has(id); }

  // ── Open apply modal ──
  openApply(c: any): void {
    this.selCamp   = c;
    this.applyForm = { proposalMessage: '', priceQuote: 0 };
    this.showApply = true;
  }

  // ── Submit application → brand gets notified automatically in controller ──
  submitApply(): void {
    if (!this.selCamp || !this.applyForm.proposalMessage.trim()) {
      this.showToast('Please write a proposal message.', 'err');
      return;
    }
    this.saving = true;
    this.creator.submitApplication({
      campaignId:      this.selCamp._id,
      proposalMessage: this.applyForm.proposalMessage,
      priceQuote:      this.applyForm.priceQuote,
    }).subscribe({
      next: () => {
        this.saving    = false;
        this.showApply = false;
        this.showToast('🎉 Application sent! The brand will review and respond.', 'ok');
        this.loadApps();
        this.appliedIds.add(this.selCamp._id);
      },
      error: (e: any) => {
        this.saving = false;
        const msg = e?.error?.message || e?.friendlyMessage || 'Could not submit application.';
        this.showToast(msg, 'err');
      },
    });
  }

  // ── View application detail ──
  openDetail(a: any): void {
    this.selApp = a;
    this.showDetail = true;
  }

  // ── Edit pending application ──
  openEdit(a: any): void {
    this.editingId = a._id;
    this.editForm  = { proposalMessage: a.proposalMessage, priceQuote: a.priceQuote };
    this.showEdit  = true;
  }

  saveEdit(): void {
    if (!this.editingId) return;
    this.saving = true;
    this.creator.updateApplication(this.editingId, this.editForm).subscribe({
      next: () => {
        this.showEdit  = false;
        this.saving    = false;
        this.showToast('Application updated!', 'ok');
        this.loadApps();
      },
      error: (e: any) => { this.saving = false; this.showToast(e?.error?.message || 'Error', 'err'); },
    });
  }

  withdraw(id: string): void {
    if (!confirm('Withdraw this application?')) return;
    this.creator.withdrawApplication(id).subscribe({
      next: () => { this.showToast('Application withdrawn.', 'ok'); this.loadApps(); },
      error: () => this.showToast('Could not withdraw.', 'err'),
    });
  }

  // ── Navigate to collab posts after acceptance ──
  goToCollabPosts(): void { this.navigate.emit('collabposts'); }

  // ── Helpers ──
  fmt(n: number): string {
    if (!n) return '—';
    return n >= 1_000_000 ? '₹' + (n/1_000_000).toFixed(1) + 'M'
      : n >= 1_000 ? '₹' + (n/1_000).toFixed(0) + 'K'
      : '₹' + n;
  }

  budgetRange(c: any): string {
    if (!c.budget) return '—';
    return this.fmt(c.budget);
  }

  statusColor(s: string): string {
    const m: any = { pending:'#FBBF24', accepted:'#34D399', rejected:'#FB7185', withdrawn:'#3A385C', reviewing:'#38BDF8' };
    return m[s] || '#3A385C';
  }
  statusBg(s: string): string {
    const m: any = { pending:'rgba(251,191,36,.12)', accepted:'rgba(52,211,153,.12)', rejected:'rgba(251,113,133,.12)', withdrawn:'rgba(58,56,92,.15)', reviewing:'rgba(56,189,248,.12)' };
    return m[s] || 'rgba(58,56,92,.15)';
  }

  get appStats() {
    return {
      total:    this.applications.length,
      pending:  this.applications.filter(a => a.status === 'pending').length,
      accepted: this.applications.filter(a => a.status === 'accepted').length,
      rejected: this.applications.filter(a => a.status === 'rejected').length,
    };
  }

  private showToast(msg: string, type: 'ok'|'err'): void {
    clearTimeout(this.tt);
    this.toast = { msg, type };
    this.tt = setTimeout(() => this.toast = null, 4000);
  }
}