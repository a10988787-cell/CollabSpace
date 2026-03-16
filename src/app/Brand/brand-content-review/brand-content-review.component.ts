// src/app/Brand/brand-content-review/brand-content-review.component.ts
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-brand-content-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-content-review.component.html',
  styleUrls: ['./brand-content-review.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandContentReviewComponent implements OnInit {
  posts: any[] = [];
  loading = true;
  saving  = false;
  filterStatus = 'submitted';

  showModal    = false;
  selectedPost: any = null;
  reviewForm: any  = { action: 'approve', brandNotes: '', paymentAmount: 0 };

  toast: { msg: string; type: 'ok' | 'err' } | null = null;
  private tt: any;

  constructor(private svc: BrandService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.svc.getBrandContentPosts(this.filterStatus || undefined).subscribe({
      next: (r: any) => { this.posts = r.posts || []; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openReview(post: any): void {
    this.selectedPost = post;
    this.reviewForm   = { action: 'approve', brandNotes: '', paymentAmount: post.paymentAmount || 0 };
    this.showModal    = true;
  }

  submit(): void {
    if (!this.selectedPost) return;
    this.saving = true;
    this.svc.reviewContentPost(
      this.selectedPost._id,
      this.reviewForm.action,
      this.reviewForm.brandNotes,
      this.reviewForm.paymentAmount,
    ).subscribe({
      next: () => {
        this.saving    = false;
        this.showModal = false;
        this.load();
        const msgs: any = { approve: '✅ Content approved!', request_revision: '📝 Revision requested.', reject: '❌ Content rejected.' };
        this.showToast(msgs[this.reviewForm.action] || 'Done.', 'ok');
      },
      error: (e: any) => { this.saving = false; this.showToast(e?.error?.message || 'Error', 'err'); },
    });
  }

  pay(post: any): void {
    if (!confirm(`Pay $${post.paymentAmount} to ${post.creator?.firstName}?`)) return;
    this.svc.payContentPost(post._id).subscribe({
      next: () => { this.load(); this.showToast(`💸 Payment sent to ${post.creator?.firstName}!`, 'ok'); },
      error: (e: any) => { this.showToast(e?.error?.message || 'Payment failed', 'err'); },
    });
  }

  statusLabel(s: string): string {
    const m: any = { draft:'Draft', submitted:'Under Review', approved:'Approved', revision_requested:'Revision', rejected:'Rejected', paid:'Paid' };
    return m[s] || s;
  }
  statusClass(s: string): string {
    const m: any = { submitted:'p-sky', approved:'p-jade', paid:'p-acc', revision_requested:'p-amber', rejected:'p-rose', draft:'p-gray' };
    return m[s] || 'p-gray';
  }
  fmtDate(d: string): string { return d ? new Date(d).toLocaleDateString('en', { month:'short', day:'numeric', year:'numeric' }) : '—'; }

  private showToast(msg: string, type: 'ok'|'err'): void {
    clearTimeout(this.tt);
    this.toast = { msg, type };
    this.tt = setTimeout(() => this.toast = null, 4000);
  }
}