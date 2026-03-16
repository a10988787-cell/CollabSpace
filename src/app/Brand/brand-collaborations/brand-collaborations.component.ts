// src/app/Brand/brand-collaborations/brand-collaborations.component.ts
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-brand-collaborations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './brand-collaborations.component.html',
  styleUrls: ['./brand-collaborations.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandCollaborationsComponent implements OnInit {

  // Tabs
  tab: 'invitations' | 'collaborations' = 'invitations';

  // Invitations sent by brand
  invitations: any[] = [];
  loadingInv  = true;
  filterInvStatus = '';

  // Active collaborations
  collabs: any[] = [];
  loadingCollabs = true;
  filterCollabStatus = '';

  toast: { msg: string; type: 'ok'|'err' } | null = null;
  private tt: any;

  constructor(private svc: BrandService) {}

  ngOnInit(): void {
    this.loadInvitations();
    this.loadCollaborations();
  }

  /* ── Invitations ───────────────────────────────────────────────── */
  loadInvitations(): void {
    this.loadingInv = true;
    this.svc.getBrandInvitations(this.filterInvStatus || undefined).subscribe({
      next: (r: any) => { this.invitations = r.invitations || []; this.loadingInv = false; },
      error: () => { this.loadingInv = false; },
    });
  }

  get invCounts() {
    return {
      all:      this.invitations.length,
      pending:  this.invitations.filter(i => i.status === 'pending').length,
      accepted: this.invitations.filter(i => i.status === 'accepted').length,
      rejected: this.invitations.filter(i => i.status === 'rejected').length,
    };
  }

  /* ── Collaborations ────────────────────────────────────────────── */
  loadCollaborations(): void {
    this.loadingCollabs = true;
    this.svc.getCollaborations(this.filterCollabStatus as any || undefined).subscribe({
      next: (r: any) => { this.collabs = r.collaborations || []; this.loadingCollabs = false; },
      error: () => { this.loadingCollabs = false; },
    });
  }

  get collabCounts() {
    return {
      all:    this.collabs.length,
      active: this.collabs.filter(c => c.status === 'active').length,
      completed: this.collabs.filter(c => c.status === 'completed').length,
    };
  }

  cancelCollab(c: any): void {
    if (!confirm('Cancel this collaboration?')) return;
    this.svc.deleteCollaboration(c._id).subscribe({
      next: () => { this.loadCollaborations(); this.showToast('Collaboration cancelled.'); },
      error: () => this.showToast('Failed to cancel.', 'err'),
    });
  }

  /* ── Helpers ───────────────────────────────────────────────────── */
  fmtDate(d: string): string {
    return d ? new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  }

  invStatusColor(s: string): string {
    const m: any = { pending:'#FBBF24', accepted:'#34D399', rejected:'#FB7185', expired:'#3A385C' };
    return m[s] || '#3A385C';
  }
  invStatusBg(s: string): string {
    const m: any = { pending:'rgba(251,191,36,.12)', accepted:'rgba(52,211,153,.12)', rejected:'rgba(251,113,133,.12)', expired:'rgba(255,255,255,.04)' };
    return m[s] || 'rgba(255,255,255,.04)';
  }
  collabStatusColor(s: string): string {
    const m: any = { active:'#34D399', pending:'#FBBF24', completed:'#8B5CF6', cancelled:'#FB7185' };
    return m[s] || '#9896BC';
  }
  collabStatusBg(s: string): string {
    const m: any = { active:'rgba(52,211,153,.12)', pending:'rgba(251,191,36,.12)', completed:'rgba(139,92,246,.12)', cancelled:'rgba(251,113,133,.12)' };
    return m[s] || 'rgba(255,255,255,.04)';
  }

  initials(u: any): string {
    if (!u) return '?';
    return ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase() || '?';
  }

  private showToast(msg: string, type: 'ok'|'err' = 'ok'): void {
    clearTimeout(this.tt);
    this.toast = { msg, type };
    this.tt = setTimeout(() => this.toast = null, 3500);
  }
}