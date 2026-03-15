import { Component, OnInit } from '@angular/core';
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
  tab: 'browse' | 'mine' = 'browse';

  // Browse
  campaigns: any[] = [];
  loadingC = true;
  search = '';
  filterPlat = '';
  filterNiche = '';
  platOptions = ['','Instagram','YouTube','TikTok','Twitter','Twitch','Blog','Podcast'];
  nicheOptions = ['','Fashion','Beauty','Tech','Gaming','Food','Travel','Fitness','Lifestyle','Music','Education'];

  // Applications
  applications: any[] = [];
  loadingA = true;
  filterStatus = '';
  appliedIds = new Set<string>();

  // Modals
  showApply = false;
  showEdit  = false;
  saving    = false;
  selCamp: any = null;
  editingId: string | null = null;
  applyForm = { proposalMessage: '', priceQuote: 0 };
  editForm  = { proposalMessage: '', priceQuote: 0 };

  toast = { show: false, msg: '', type: 'success' };

  constructor(private creator: CreatorService) {}

  ngOnInit(): void { this.loadCampaigns(); this.loadApps(); }

  loadCampaigns(): void {
    this.loadingC = true;
    this.creator.getPublicCampaigns({
      search: this.search || undefined,
      platform: this.filterPlat || undefined,
      niche: this.filterNiche || undefined,
    }).subscribe({
      next: r => { this.campaigns = r.campaigns || []; this.loadingC = false; },
      error: () => { this.loadingC = false; },
    });
  }

  loadApps(): void {
    this.loadingA = true;
    this.creator.getApplications(this.filterStatus || undefined).subscribe({
      next: r => {
        this.applications = r.applications;
        this.appliedIds   = new Set(
          r.applications
            .filter((a: any) => a.status !== 'withdrawn')
            .map((a: any) => a.campaign?._id)
        );
        this.loadingA = false;
      },
      error: () => { this.loadingA = false; },
    });
  }

  onSearch(): void { this.loadCampaigns(); }
  clearFilters(): void { this.search = ''; this.filterPlat = ''; this.filterNiche = ''; this.loadCampaigns(); }

  applied(id: string): boolean { return this.appliedIds.has(id); }

  openApply(c: any): void {
    this.selCamp   = c;
    this.applyForm = { proposalMessage: '', priceQuote: 0 };
    this.showApply = true;
  }

  submitApply(): void {
    if (!this.selCamp || !this.applyForm.proposalMessage.trim()) return;
    this.saving = true;
    this.creator.submitApplication({
      campaignId:      this.selCamp._id,
      proposalMessage: this.applyForm.proposalMessage,
      priceQuote:      this.applyForm.priceQuote,
    }).subscribe({
      next: () => {
        this.showApply = false;
        this.saving    = false;
        this.showToast('Application submitted! Brand will be notified. 🎉');
        this.loadApps();
      },
      error: e => { this.saving = false; this.showToast(e?.friendlyMessage || 'Error submitting', 'error'); },
    });
  }

  openEdit(a: any): void {
    this.editingId = a._id;
    this.editForm  = { proposalMessage: a.proposalMessage, priceQuote: a.priceQuote };
    this.showEdit  = true;
  }

  saveEdit(): void {
    this.saving = true;
    this.creator.updateApplication(this.editingId!, this.editForm).subscribe({
      next: () => { this.showEdit = false; this.saving = false; this.showToast('Updated!'); this.loadApps(); },
      error: e => { this.saving = false; this.showToast(e?.friendlyMessage || 'Error', 'error'); },
    });
  }

  withdraw(id: string): void {
    if (!confirm('Withdraw this application?')) return;
    this.creator.withdrawApplication(id).subscribe({
      next: () => { this.showToast('Withdrawn.'); this.loadApps(); },
      error: () => this.showToast('Error', 'error'),
    });
  }

  fmt(n: number): string {
    return n >= 1000 ? '$' + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K' : '$' + n;
  }

  statusStyle(s: string): { color: string; bg: string; border: string } {
    const map: any = {
      pending:  { color:'#FBBF24', bg:'rgba(251,191,36,.1)',  border:'rgba(251,191,36,.2)'  },
      accepted: { color:'#34D399', bg:'rgba(52,211,153,.1)',  border:'rgba(52,211,153,.2)'  },
      rejected: { color:'#FB7185', bg:'rgba(251,113,133,.1)', border:'rgba(251,113,133,.2)' },
      withdrawn:{ color:'#3A385C', bg:'rgba(255,255,255,.03)',border:'rgba(255,255,255,.05)'},
      reviewing:{ color:'#38BDF8', bg:'rgba(56,189,248,.1)',  border:'rgba(56,189,248,.2)'  },
    };
    return map[s] || map.pending;
  }

  showToast(msg: string, type: 'success'|'error' = 'success'): void {
    this.toast = { show: true, msg, type };
    setTimeout(() => this.toast.show = false, 3500);
  }
}