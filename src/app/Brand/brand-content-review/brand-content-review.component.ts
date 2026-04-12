// src/app/Brand/brand-content-review/brand-content-review.component.ts
import { Component, OnInit, ViewEncapsulation, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
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

  showModal    = false;
  showReceipt  = false;
  selectedPost: any = null;
  receipt: any      = null;
  reviewForm    = { action: 'approve', brandNotes: '', paymentAmount: 0 };

  toast: { msg: string; type: 'ok' | 'err' } | null = null;
  private tt: any;
  private isBrowser: boolean;

  filters = [
    { key: '',                   label: 'All',      count: 0 },
    { key: 'submitted',          label: 'Pending',  count: 0 },
    { key: 'approved',           label: 'Approved', count: 0 },
    { key: 'revision_requested', label: 'Revision', count: 0 },
    { key: 'rejected',           label: 'Rejected', count: 0 },
    { key: 'paid',               label: 'Paid',     count: 0 },
  ];

  stats = { submitted: 0, approved: 0, revision: 0, paid: 0 };

  constructor(
    private svc: BrandService,
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

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
          approve:          '✅ Content approved! You can now release payment.',
          request_revision: '📝 Revision requested.',
          reject:           '❌ Content rejected.',
        };
        this.showToast(msgs[this.reviewForm.action] || 'Done.', 'ok');
      },
      error: (e: any) => { this.saving = false; this.showToast(e?.error?.message || 'Error', 'err'); },
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     RAZORPAY PAYMENT FLOW
     1. Create order on backend
     2. Open Razorpay checkout popup
     3. On success → call /verify endpoint
     4. Show receipt
     ══════════════════════════════════════════════════════════════════════ */
  pay(post: any): void {
    if (!this.isBrowser) return;

    // Check Razorpay script loaded
    if (!(window as any).Razorpay) {
      this.showToast('Payment gateway loading… please try again in a moment.', 'err');
      this.loadRazorpayScript(() => this.pay(post));
      return;
    }

    this.saving = true;
    this.http.post<any>(`${environment.apiUrl}/payments/create-order`, {
      collabPostId: post._id,
    }).subscribe({
      next: (data: any) => {
        this.saving = false;

        if (!data.success) {
          if (data.code === 'RAZORPAY_NOT_CONFIGURED') {
            this.showToast('⚙️ Razorpay not configured. Add API keys to .env file.', 'err');
          } else {
            this.showToast(data.message || 'Failed to create payment order.', 'err');
          }
          return;
        }

        const options = {
          key:          data.keyId,
          amount:       data.amount,
          currency:     data.currency,
          name:         data.brandName || 'CollabSpace',
          description:  `Payment for: ${data.contentTitle}`,
          order_id:     data.orderId,
          prefill: {
            name:  data.creatorName,
            email: data.creatorEmail,
          },
          notes: {
            collabPostId: data.collabPostId,
          },
          theme: { color: '#8B5CF6' },
          modal: {
            ondismiss: () => {
              this.showToast('Payment cancelled.', 'err');
            },
          },
          handler: (response: any) => {
            this.verifyPayment(response, post._id);
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (resp: any) => {
          this.showToast(`Payment failed: ${resp.error.description}`, 'err');
        });
        rzp.open();
      },
      error: (e: any) => {
        this.saving = false;
        const msg = e?.error?.message || 'Could not initiate payment.';
        if (msg.includes('not configured')) {
          this.showToast('⚙️ Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file.', 'err');
        } else {
          this.showToast(msg, 'err');
        }
      },
    });
  }

  private verifyPayment(response: any, collabPostId: string): void {
    this.saving = true;
    this.http.post<any>(`${environment.apiUrl}/payments/verify`, {
      razorpay_order_id:   response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature:  response.razorpay_signature,
      collabPostId,
    }).subscribe({
      next: (data: any) => {
        this.saving  = false;
        this.receipt = data.receipt;
        this.showReceipt = true;
        this.load();
        this.showToast(`💸 Payment of ${data.receipt.currency} ${data.receipt.amount} sent to ${data.receipt.creatorName}!`, 'ok');
      },
      error: (e: any) => {
        this.saving = false;
        this.showToast(e?.error?.message || 'Payment verification failed.', 'err');
      },
    });
  }

  private loadRazorpayScript(cb?: () => void): void {
    if ((window as any).Razorpay) { cb?.(); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => cb?.();
    document.head.appendChild(s);
  }

  /* ── Helpers ── */
  getMediaUrl(url: string): string { return mediaUrl(url); }

  statusLabel(s: string): string {
    const m: any = { submitted:'Pending Review', approved:'Approved', paid:'Paid', revision_requested:'Revision', rejected:'Rejected', draft:'Draft' };
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
  printReceipt(): void {
    if (!this.isBrowser) return;
    window.print();
  }

  private showToast(msg: string, type: 'ok' | 'err' = 'ok'): void {
    clearTimeout(this.tt);
    this.toast = { msg, type };
    this.tt = setTimeout(() => this.toast = null, 5000);
  }
}