import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-brand-campaigns',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-campaigns.component.html',
  styleUrls: ['./brand-campaigns.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandCampaignsComponent implements OnInit {

  campaigns: any[] = [];
  loading  = true;
  saving   = false;
  modal    = false;
  editing: any = null;
  filter   = 'all';
  search   = '';
  filters  = ['all', 'draft', 'active', 'paused', 'completed', 'cancelled'];
  allPlatforms = ['Instagram', 'YouTube', 'TikTok', 'Twitter', 'Twitch', 'Blog', 'Podcast'];
  form: any = { title: '', description: '', budget: '', startDate: '', endDate: '', platforms: [], contentReqs: '', niche: '', slots: 1, status: 'draft' };
  toast: any = null;
  private tt: any;

  get filtered() {
    let list = this.campaigns;
    if (this.filter !== 'all') list = list.filter(c => c.status === this.filter);
    if (this.search.trim())    list = list.filter(c => c.title.toLowerCase().includes(this.search.toLowerCase()));
    return list;
  }

  get stats() {
    return [
      { label: 'Total Campaigns', val: this.campaigns.length.toString(),                                   sub: 'All time',    ib: 'rgba(251,191,36,.12)', ic: '#FBBF24' },
      { label: 'Active',          val: this.campaigns.filter(c => c.status === 'active').length.toString(),   sub: 'Running',     ib: 'rgba(52,211,153,.12)', ic: '#34D399' },
      { label: 'Draft',           val: this.campaigns.filter(c => c.status === 'draft').length.toString(),    sub: 'Unpublished', ib: 'rgba(148,163,184,.1)', ic: '#9CA3AF' },
      { label: 'Completed',       val: this.campaigns.filter(c => c.status === 'completed').length.toString(), sub: 'Finished',   ib: 'rgba(139,92,246,.12)', ic: '#A78BFA' },
    ];
  }

  constructor(private svc: BrandService) {}
  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.svc.getCampaigns().subscribe({
      next:  r  => { this.campaigns = r.campaigns || []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openModal(c?: any): void {
    this.editing = c || null;
    this.form = c
      ? { ...c, startDate: c.startDate?.slice(0, 10), endDate: c.endDate?.slice(0, 10), platforms: [...(c.platforms || [])] }
      : { title: '', description: '', budget: '', startDate: '', endDate: '', platforms: [], contentReqs: '', niche: '', slots: 1, status: 'draft' };
    this.modal = true;
  }

  togglePlatform(p: string): void {
    const i = this.form.platforms.indexOf(p);
    i >= 0 ? this.form.platforms.splice(i, 1) : this.form.platforms.push(p);
  }

  save(): void {
    if (!this.form.title || !this.form.budget || !this.form.startDate || !this.form.endDate) {
      return this.showToast('Title, budget and dates are required.', 'err');
    }
    this.saving = true;
    const req = this.editing
      ? this.svc.updateCampaign(this.editing._id, this.form)
      : this.svc.createCampaign(this.form);
    req.subscribe({
      next:  () => { this.modal = false; this.saving = false; this.load(); this.showToast(this.editing ? 'Campaign updated!' : 'Campaign created!'); },
      error: e  => { this.saving = false; this.showToast(e?.error?.message || 'Failed.', 'err'); }
    });
  }

  delete(c: any): void {
    if (!confirm(`Cancel "${c.title}"?`)) return;
    this.svc.deleteCampaign(c._id).subscribe({
      next:  () => { this.load(); this.showToast('Campaign cancelled.'); },
      error: () => this.showToast('Failed.', 'err')
    });
  }

  getGrad(s: string): string {
    const map: Record<string, string> = {
      active: 'linear-gradient(135deg,#FBBF24,#D97706)', draft: 'linear-gradient(135deg,#6B7280,#4B5563)',
      paused: 'linear-gradient(135deg,#38BDF8,#0EA5E9)', completed: 'linear-gradient(135deg,#34D399,#059669)',
      cancelled: 'linear-gradient(135deg,#FB7185,#E11D48)',
    };
    return map[s] || 'linear-gradient(135deg,#6B7280,#4B5563)';
  }

  showToast(msg: string, type: 'ok' | 'err' = 'ok'): void {
    clearTimeout(this.tt); this.toast = { msg, type };
    this.tt = setTimeout(() => this.toast = null, 3200);
  }
}