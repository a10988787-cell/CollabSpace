// brand-content-review.component.ts
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandService } from '../../services/brand.service';
import { environment } from '../../environment';

function mediaUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  return environment.apiUrl.replace('/api', '') + (url.startsWith('/') ? url : '/' + url);
}

@Component({
  selector: 'app-brand-content-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-content-review.component.html',
  styleUrls: ['./brand-content-review.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandContentReviewComponent implements OnInit {
  posts: any[]    = [];
  loading         = true;
  saving          = false;
  filterStatus    = '';
  searchQuery     = '';
  viewMode: 'grid' | 'table' = 'grid';

  showModal     = false;
  selectedPost: any = null;
  reviewForm    = { action: 'approve', brandNotes: '', paymentAmount: 0 };

  toast: { msg: string; type: 'ok' | 'err' } | null = null;
  private tt: any;

  filters = [
    { key: '',                    label: 'All',       count: 0 },
    { key: 'submitted',           label: 'Pending',   count: 0 },
    { key: 'approved',            label: 'Approved',  count: 0 },
    { key: 'revision_requested',  label: 'Revision',  count: 0 },
    { key: 'rejected',            label: 'Rejected',  count: 0 },
    { key: 'paid',                label: 'Paid',      count: 0 },
  ];

  stats = { submitted: 0, approved: 0, revision: 0, paid: 0 };

  constructor(private svc: BrandService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.svc.getBrandContentPosts(undefined).subscribe({
      next: (r: any) => {
        this.posts = r.posts || [];
        this.calcStats();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  calcStats(): void {
    const all = this.posts;
    this.stats = {
      submitted: all.filter(p => p.status === 'submitted').length,
      approved:  all.filter(p => p.status === 'approved').length,
      revision:  all.filter(p => p.status === 'revision_requested').length,
      paid:      all.filter(p => p.status === 'paid').length,
    };
    this.filters.forEach(f => {
      f.count = f.key === '' ? all.length : all.filter(p => p.status === f.key).length;
    });
  }

  get filtered(): any[] {
    let result = this.filterStatus
      ? this.posts.filter(p => p.status === this.filterStatus)
      : this.posts;
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.creator?.firstName?.toLowerCase().includes(q) ||
        p.creator?.lastName?.toLowerCase().includes(q)
      );
    }
    return result;
  }

  openReview(post: any): void {
    this.selectedPost = post;
    this.reviewForm   = { action: 'approve', brandNotes: '', paymentAmount: post.paymentAmount || 0 };
    this.showModal    = true;
  }

  submit(): void {
    if (!this.selectedPost || this.saving) return;
    this.saving = true;
    this.svc.reviewContentPost(
      this.selectedPost._id,
      this.reviewForm.action,
      this.reviewForm.brandNotes,
      this.reviewForm.paymentAmount,
    ).subscribe({
      next: () => {
        this.saving = false; this.showModal = false;
        this.load();
        const msgs: any = {
          approve:          '✅ Content approved!',
          request_revision: '📝 Revision requested.',
          reject:           '❌ Content rejected.',
        };
        this.showToast(msgs[this.reviewForm.action] || 'Done.', 'ok');
      },
      error: (e: any) => { this.saving = false; this.showToast(e?.error?.message || 'Error', 'err'); },
    });
  }

  pay(post: any): void {
    if (!confirm(`Release $${post.paymentAmount} payment to ${post.creator?.firstName}?`)) return;
    this.svc.payContentPost(post._id).subscribe({
      next: () => { this.load(); this.showToast(`💸 Payment released to ${post.creator?.firstName}!`, 'ok'); },
      error: (e: any) => { this.showToast(e?.error?.message || 'Payment failed', 'err'); },
    });
  }

  statusLabel(s: string): string {
    const m: any = { draft:'Draft', submitted:'Pending Review', approved:'Approved', revision_requested:'Revision', rejected:'Rejected', paid:'Paid' };
    return m[s] || s;
  }
  statusClass(s: string): string {
    const m: any = { submitted:'p-sky', approved:'p-jade', paid:'p-acc', revision_requested:'p-amber', rejected:'p-rose', draft:'p-gray' };
    return m[s] || 'p-gray';
  }
  fmtDate(d: string): string {
    return d ? new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  }
  initials(post: any): string {
    return ((post.creator?.firstName || '?')[0] + (post.creator?.lastName || '?')[0]).toUpperCase();
  }

  private showToast(msg: string, type: 'ok' | 'err'): void {
    clearTimeout(this.tt);
    this.toast = { msg, type };
    this.tt = setTimeout(() => this.toast = null, 4000);
  }

  getMediaUrl(url: string): string { return mediaUrl(url); }
}