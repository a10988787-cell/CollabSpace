// src/app/brand/brand-collaborations/brand-collaborations.component.ts
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { RouterLink }    from '@angular/router';
import { BrandService, CollabStatus }  from '../../services/brand.service';

@Component({
  selector: 'app-brand-collaborations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './brand-collaborations.component.html',
  styleUrls:   ['./brand-collaborations.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandCollaborationsComponent implements OnInit {

  collabs:  any[] = [];
  loading   = true;
  saving    = false;

  /* ── Three main tabs + All ─────────────────────────────────────────── */
  activeTab: 'all' | 'pending' | 'accepted' | 'rejected' = 'all';

  readonly tabs = [
    { key: 'all',      label: 'All',      color: '' },
    { key: 'pending',  label: 'Pending',  color: 'amber' },
    { key: 'accepted', label: 'Accepted', color: 'jade'  },
    { key: 'rejected', label: 'Rejected', color: 'rose'  },
  ];

  /* ── Toast ──────────────────────────────────────────────────────────── */
  toast: { msg: string; type: 'ok' | 'err' } | null = null;
  private tt: any;

  constructor(private svc: BrandService) {}

  ngOnInit(): void { this.load(); }

  /* ── Computed list for active tab ───────────────────────────────────── */
  get filtered(): any[] {
    return this.activeTab === 'all'
      ? this.collabs
      : this.collabs.filter(c => c.status === this.activeTab);
  }

  /* ── Count badges per tab ───────────────────────────────────────────── */
  count(key: string): number {
    return key === 'all'
      ? this.collabs.length
      : this.collabs.filter(c => c.status === key).length;
  }

  /* ── Load from backend ──────────────────────────────────────────────── */
  load(): void {
    this.loading = true;
    this.svc.getCollaborations().subscribe({
      next:  r  => { this.collabs = r.collaborations || []; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  /* ── Update status (accept / reject / cancel) ───────────────────────── */
  setStatus(c: any, status: CollabStatus): void {
    const prev = c.status;
    c.status = status;                       // optimistic update
    this.svc.updateCollaboration(c._id, { status }).subscribe({
      next:  () => this.showToast(`Status updated to "${status}".`),
      error: e  => {
        c.status = prev;                     // revert on error
        this.showToast(e?.friendlyMessage ?? 'Failed to update.', 'err');
      },
    });
  }

  /* ── Delete / cancel ────────────────────────────────────────────────── */
  cancel(c: any): void {
    if (!confirm('Cancel this collaboration?')) return;
    this.svc.deleteCollaboration(c._id).subscribe({
      next:  () => { this.load(); this.showToast('Collaboration cancelled.'); },
      error: () => this.showToast('Failed to cancel.', 'err'),
    });
  }

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  initials(c: any): string {
    if (!c) return '?';
    return ((c.firstName?.[0] ?? '') + (c.lastName?.[0] ?? '')).toUpperCase() || '?';
  }

  avatarGrad(name = ''): string {
    const g = [
      'linear-gradient(135deg,#8B5CF6,#6D28D9)',
      'linear-gradient(135deg,#FBBF24,#D97706)',
      'linear-gradient(135deg,#34D399,#059669)',
      'linear-gradient(135deg,#38BDF8,#0EA5E9)',
    ];
    return g[(name.charCodeAt(0) ?? 0) % g.length];
  }

  statusChipClass(s: string): string {
    return ({
      pending:   'cl-chip cl-chip--pending',
      accepted:  'cl-chip cl-chip--accepted',
      rejected:  'cl-chip cl-chip--rejected',
      active:    'cl-chip cl-chip--active',
      completed: 'cl-chip cl-chip--completed',
      cancelled: 'cl-chip cl-chip--cancelled',
    })[s] ?? 'cl-chip';
  }

  private showToast(msg: string, type: 'ok' | 'err' = 'ok'): void {
    clearTimeout(this.tt);
    this.toast = { msg, type };
    this.tt = setTimeout(() => this.toast = null, 3200);
  }
}