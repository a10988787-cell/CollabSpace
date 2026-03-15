// src/app/Brand/brand-content-review/brand-content-review.component.ts
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';

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
  saving = false;
  filterStatus = 'submitted';
  statuses = ['', 'submitted', 'approved', 'revision_requested', 'rejected', 'paid'];

  /* Review modal */
  showModal = false;
  selectedPost: any = null;
  reviewForm: any = { action: 'approve', brandNotes: '', paymentAmount: 0 };

  toast: { msg: string; type: 'ok' | 'err' } | null = null;
  private tt: any;

  constructor(private creator: CreatorService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.creator.getBrandCollabPosts(this.filterStatus || undefined).subscribe({
      next: r => { this.posts = r.posts; this.loading = false; },
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
    this.creator.reviewCollabPost(
      this.selectedPost._id,
      this.reviewForm.action,
      this.reviewForm.brandNotes,
      this.reviewForm.paymentAmount,
    ).subscribe({
      next: () => {
        this.load();
        this.showModal = false;
        this.saving    = false;
        const msgs: any = {
          approve:          '✅ Content approved! Payment queued.',
          request_revision: '📝 Revision requested.',
          reject:           '❌ Content rejected.',
        };
        this.showToast(msgs[this.reviewForm.action] || 'Done.', 'ok');
      },
      error: e => { this.saving = false; this.showToast(e?.friendlyMessage || 'Error', 'err'); },
    });
  }

  pay(post: any): void {
    if (!confirm(`Pay $${post.paymentAmount} to ${post.creator?.firstName}?`)) return;
    this.creator.payCollabPost(post._id).subscribe({
      next: () => { this.load(); this.showToast(`💸 Payment sent to ${post.creator?.firstName}!`, 'ok'); },
      error: e => { this.showToast(e?.friendlyMessage || 'Payment failed', 'err'); },
    });
  }

  statusLabel(s: string): string {
    const m: any = {
      draft: 'Draft', submitted: 'Under Review', approved: 'Approved',
      revision_requested: 'Revision', rejected: 'Rejected', paid: 'Paid',
    };
    return m[s] || s;
  }

  statusClass(s: string): string {
    const m: any = {
      submitted: 'pill-sky', approved: 'pill-jade', paid: 'pill-acc',
      revision_requested: 'pill-amber', rejected: 'pill-rose', draft: 'pill-gray',
    };
    return m[s] || 'pill-gray';
  }

  formatDate(d: string): string {
    return d ? new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  }

  private showToast(msg: string, type: 'ok' | 'err'): void {
    clearTimeout(this.tt);
    this.toast = { msg, type };
    this.tt = setTimeout(() => this.toast = null, 3500);
  }
}