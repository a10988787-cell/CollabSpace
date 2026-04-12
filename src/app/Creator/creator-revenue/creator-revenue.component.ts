// src/app/Creator/creator-revenue/creator-revenue.component.ts
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CreatorService } from '../../services/creator.service';
import { environment } from '../../environment';

@Component({
  selector: 'app-creator-revenue',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './creator-revenue.component.html',
  styleUrls: ['../creator-shared.css', './creator-revenue.component.css'],
})
export class CreatorRevenueComponent implements OnInit {
  entries:       any[] = [];
  totalReceived  = 0;
  totalPending   = 0;
  loading        = true;
  filterStatus   = '';
  statuses       = ['', 'pending', 'processing', 'received', 'failed'];

  showReceipt    = false;
  selectedReceipt: any = null;
  receiptRows:   any[] = [];

  toast = { show: false, msg: '', type: 'success' };
  private isBrowser: boolean;

  constructor(
    private creator: CreatorService,
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.creator.getRevenue(this.filterStatus || undefined).subscribe({
      next: (r: any) => {
        this.entries       = r.entries || [];
        this.totalReceived = r.totalReceived || 0;
        this.totalPending  = r.totalPending  || 0;
        this.loading       = false;
      },
      error: () => { this.loading = false; },
    });
  }

  get razorpayCount(): number {
    return this.entries.filter(e => e.razorpayPaymentId).length;
  }

  viewReceipt(entry: any): void {
    if (!entry.razorpayPaymentId) return;

    // Fetch full receipt from backend
    this.http.get<any>(`${environment.apiUrl}/payments/receipt/${entry.razorpayPaymentId}`).subscribe({
      next: (r: any) => {
        if (r.success && r.receipt) {
          this.selectedReceipt = r.receipt;
          this.receiptRows = [
            { label: 'Receipt ID',  value: r.receipt.receiptId,          mono: true  },
            { label: 'Payment ID',  value: r.receipt.razorpayPaymentId,  mono: true  },
            { label: 'Order ID',    value: r.receipt.razorpayOrderId,    mono: true  },
            { label: 'Content',     value: r.receipt.contentTitle,       mono: false },
            { label: 'Paid By',     value: r.receipt.brandName,          mono: false },
            { label: 'Your Email',  value: r.receipt.creatorEmail,       mono: false },
            { label: 'Date',        value: r.receipt.paidAt
                ? new Date(r.receipt.paidAt).toLocaleDateString('en', { month:'long', day:'numeric', year:'numeric' })
                : '—',                                                   mono: false },
          ];
          this.showReceipt = true;
        }
      },
      error: () => {
        // Fallback: build receipt from entry data
        this.selectedReceipt = {
          receiptId:         `RCP-${entry.razorpayPaymentId.slice(-8).toUpperCase()}`,
          razorpayPaymentId: entry.razorpayPaymentId,
          razorpayOrderId:   entry.razorpayOrderId || '—',
          amount:            entry.amount,
          currency:          entry.currency || 'INR',
          contentTitle:      entry.campaignName,
          brandName:         entry.brandName,
          creatorEmail:      '—',
        };
        this.receiptRows = [
          { label: 'Receipt ID', value: this.selectedReceipt.receiptId,          mono: true  },
          { label: 'Payment ID', value: this.selectedReceipt.razorpayPaymentId,  mono: true  },
          { label: 'Content',    value: this.selectedReceipt.contentTitle,        mono: false },
          { label: 'Brand',      value: this.selectedReceipt.brandName || '—',   mono: false },
          { label: 'Date',       value: entry.paymentDate
              ? new Date(entry.paymentDate).toLocaleDateString('en', { month:'long', day:'numeric', year:'numeric' })
              : '—',                                                               mono: false },
        ];
        this.showReceipt = true;
      },
    });
  }

  printPage(): void {
    if (this.isBrowser) window.print();
  }

  statusPill(s: string): string {
    const m: any = { received:'pill-jade', pending:'pill-amber', processing:'pill-sky', failed:'pill-rose' };
    return m[s] || 'pill-gray';
  }

  showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toast = { show: true, msg, type };
    setTimeout(() => this.toast.show = false, 3500);
  }
}