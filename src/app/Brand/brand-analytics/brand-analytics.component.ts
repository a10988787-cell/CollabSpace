// src/app/brand/brand-analytics/brand-analytics.component.ts
import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, ViewEncapsulation,
} from '@angular/core';
import { CommonModule }  from '@angular/common';
import { BrandService }  from '../../services/brand.service';
import { forkJoin }      from 'rxjs';

declare const Chart: any;

@Component({
  selector: 'app-brand-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './brand-analytics.component.html',
  styleUrls:   ['./brand-analytics.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandAnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('budgetChart')    budgetChartRef!:    ElementRef<HTMLCanvasElement>;
  @ViewChild('collabPieChart') collabPieRef!:      ElementRef<HTMLCanvasElement>;
  @ViewChild('campaignChart')  campaignChartRef!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('paymentChart')   paymentChartRef!:   ElementRef<HTMLCanvasElement>;

  loading  = true;
  data:      any    = null;
  campaigns: any[]  = [];
  collabs:   any[]  = [];
  payments:  any[]  = [];

  private charts: any[] = [];
  private chartsReady = false;
  private dataLoaded  = false;

  constructor(private svc: BrandService) {}

  ngOnInit():      void { this.loadChartsJs().then(() => { this.chartsReady = true; if (this.dataLoaded) this.renderAll(); }); this.loadData(); }
  ngAfterViewInit(): void {}
  ngOnDestroy():   void { this.charts.forEach(c => c?.destroy()); }

  /* ── Load Charts.js from CDN ─────────────────────────────────────── */
  private loadChartsJs(): Promise<void> {
    return new Promise(resolve => {
      if (typeof Chart !== 'undefined') { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      s.onload = () => resolve();
      document.head.appendChild(s);
    });
  }

  /* ── Fetch all data in parallel ──────────────────────────────────── */
  loadData(): void {
    this.loading = true;
    forkJoin({
      analytics:     this.svc.getAnalytics(),
      campaigns:     this.svc.getCampaigns({ limit: 10 }),
      collaborations: this.svc.getCollaborations(),
      payments:      this.svc.getPayments(),
    }).subscribe({
      next: ({ analytics, campaigns, collaborations, payments }) => {
        this.data      = analytics.analytics;
        this.campaigns = campaigns.campaigns    || [];
        this.collabs   = collaborations.collaborations || [];
        this.payments  = payments.payments      || [];
        this.loading   = false;
        this.dataLoaded = true;
        if (this.chartsReady) setTimeout(() => this.renderAll(), 80);
      },
      error: () => { this.loading = false; },
    });
  }

  /* ── Render all four charts ──────────────────────────────────────── */
  private renderAll(): void {
    this.charts.forEach(c => c?.destroy());
    this.charts = [];
    this.charts.push(this.renderBudgetChart());
    this.charts.push(this.renderCollabPie());
    this.charts.push(this.renderCampaignStatusChart());
    this.charts.push(this.renderPaymentChart());
  }

  /* ── Chart 1: Campaign budgets horizontal bar ────────────────────── */
  private renderBudgetChart(): any {
    const el = this.budgetChartRef?.nativeElement;
    if (!el) return null;
    const labels = this.campaigns.map(c => c.title?.slice(0, 20) || 'Campaign');
    const data   = this.campaigns.map(c => c.budget || 0);
    return new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Budget ($)',
          data,
          backgroundColor: data.map((_, i) =>
            `hsla(${42 + i * 15}, 80%, ${55 + i * 3}%, 0.75)`
          ),
          borderColor:   'rgba(251,191,36,.9)',
          borderWidth:   1,
          borderRadius:  6,
          borderSkipped: false,
        }],
      },
      options: {
        indexAxis:  'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c: any) => ` $${c.parsed.x.toLocaleString()}` } },
        },
        scales: {
          x: { ticks: { color: '#6B5C30', callback: (v: any) => `$${(v/1000).toFixed(0)}k` }, grid: { color: 'rgba(255,255,255,.04)' } },
          y: { ticks: { color: '#B8A978', font: { size: 11 } }, grid: { display: false } },
        },
      },
    });
  }

  /* ── Chart 2: Collaboration status doughnut ──────────────────────── */
  private renderCollabPie(): any {
    const el = this.collabPieRef?.nativeElement;
    if (!el) return null;
    const statuses = ['pending','accepted','active','completed','cancelled','rejected'];
    const counts   = statuses.map(s => this.collabs.filter(c => c.status === s).length);
    const colors   = ['rgba(251,191,36,.8)','rgba(52,211,153,.8)','rgba(56,189,248,.8)','rgba(139,92,246,.8)','rgba(251,113,133,.8)','rgba(148,163,184,.5)'];
    return new Chart(el, {
      type: 'doughnut',
      data: {
        labels:   statuses.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
        datasets: [{ data: counts, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#B8A978', font: { size: 11 }, padding: 12, boxWidth: 11 } },
        },
      },
    });
  }

  /* ── Chart 3: Campaign status breakdown (pie) ────────────────────── */
  private renderCampaignStatusChart(): any {
    const el = this.campaignChartRef?.nativeElement;
    if (!el) return null;
    const statuses = ['draft','active','paused','completed','cancelled'];
    const counts   = statuses.map(s => this.campaigns.filter(c => c.status === s).length);
    const colors   = ['rgba(148,163,184,.6)','rgba(52,211,153,.8)','rgba(56,189,248,.8)','rgba(139,92,246,.8)','rgba(251,113,133,.7)'];
    return new Chart(el, {
      type: 'pie',
      data: {
        labels:   statuses.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
        datasets: [{ data: counts, backgroundColor: colors, borderWidth: 0, hoverOffset: 5 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#B8A978', font: { size: 11 }, padding: 10, boxWidth: 11 } },
        },
      },
    });
  }

  /* ── Chart 4: Payment totals by status (bar) ─────────────────────── */
  private renderPaymentChart(): any {
    const el = this.paymentChartRef?.nativeElement;
    if (!el) return null;
    const statuses = ['pending','processing','paid','failed','cancelled'];
    const totals   = statuses.map(s =>
      this.payments.filter(p => p.status === s).reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
    );
    const colors   = [
      'rgba(251,191,36,.7)','rgba(56,189,248,.7)',
      'rgba(52,211,153,.8)','rgba(251,113,133,.7)','rgba(148,163,184,.5)',
    ];
    return new Chart(el, {
      type: 'bar',
      data: {
        labels: statuses.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
        datasets: [{
          label: 'Amount ($)',
          data:  totals,
          backgroundColor: colors,
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ` $${c.parsed.y.toLocaleString()}` } } },
        scales: {
          x: { ticks: { color: '#B8A978', font: { size: 11 } }, grid: { display: false } },
          y: { ticks: { color: '#6B5C30', callback: (v: any) => `$${(v/1000).toFixed(0)}k` }, grid: { color: 'rgba(255,255,255,.04)' } },
        },
      },
    });
  }

  /* ── Derived metrics ─────────────────────────────────────────────── */
  get budgetUtilPct(): number {
    if (!this.data?.totalBudget) return 0;
    return Math.round((this.data.allocatedBudget / this.data.totalBudget) * 100);
  }
  get collabSuccessRate(): number {
    if (!this.data?.totalCollaborations) return 0;
    return Math.round((this.data.completedCollaborations / this.data.totalCollaborations) * 100);
  }
  get totalRevenuePaid(): number {
    return this.payments.filter(p => p.status === 'paid').reduce((s: number, p: any) => s + (p.amount || 0), 0);
  }
  get avgCampaignBudget(): number {
    if (!this.campaigns.length) return 0;
    return Math.round(this.campaigns.reduce((s, c) => s + (c.budget || 0), 0) / this.campaigns.length);
  }
}