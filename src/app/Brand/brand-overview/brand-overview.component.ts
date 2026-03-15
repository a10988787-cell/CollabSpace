// src/app/brand/brand-overview/brand-overview.component.ts
import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, ViewEncapsulation,
} from '@angular/core';
import { CommonModule }  from '@angular/common';
import { RouterLink }    from '@angular/router';
import { BrandService }  from '../../services/brand.service';
import { forkJoin }      from 'rxjs';

declare const Chart: any;   // loaded via CDN script tag

@Component({
  selector: 'app-brand-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './brand-overview.component.html',
  styleUrls:   ['./brand-overview.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandOverviewComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('spendChart')  spendChartRef!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('collabChart') collabChartRef!: ElementRef<HTMLCanvasElement>;

  loading = true;

  /* ── Analytics data from backend ─────────────────────────────────── */
  analytics: any    = null;
  campaigns: any[]  = [];
  collabs:   any[]  = [];

  /* ── Derived KPIs ─────────────────────────────────────────────────── */
  kpis = [
    { label:'Total Campaigns',   val:'—', sub:'All time',        ib:'rgba(251,191,36,.12)', ic:'#FBBF24', icon:'campaign' },
    { label:'Active Campaigns',  val:'—', sub:'Currently running',ib:'rgba(52,211,153,.12)',  ic:'#34D399', icon:'active'   },
    { label:'Collaborations',    val:'—', sub:'Sent invites',     ib:'rgba(139,92,246,.12)',  ic:'#A78BFA', icon:'collab'   },
    { label:'Budget Allocated',  val:'—', sub:'Of total budget',  ib:'rgba(56,189,248,.12)',  ic:'#38BDF8', icon:'budget'   },
  ];

  private spendChart:  any = null;
  private collabChart: any = null;
  private chartsReady = false;
  private dataReady   = false;

  constructor(private svc: BrandService) {}

  ngOnInit(): void {
    this.loadChartsJs().then(() => {
      this.chartsReady = true;
      if (this.dataReady) this.renderCharts();
    });
    this.loadData();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.spendChart?.destroy();
    this.collabChart?.destroy();
  }

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

  /* ── Fetch data from backend ─────────────────────────────────────── */
  loadData(): void {
    this.loading = true;
    forkJoin({
      analytics: this.svc.getAnalytics(),
      campaigns: this.svc.getCampaigns({ limit: 5 }),
      collabs:   this.svc.getCollaborations(),
    }).subscribe({
      next: ({ analytics, campaigns, collabs }) => {
        this.analytics = analytics.analytics;
        this.campaigns = campaigns.campaigns || [];
        this.collabs   = collabs.collaborations || [];
        this.buildKpis();
        this.loading   = false;
        this.dataReady = true;
        if (this.chartsReady) setTimeout(() => this.renderCharts(), 50);
      },
      error: () => { this.loading = false; },
    });
  }

  private buildKpis(): void {
    const a = this.analytics;
    if (!a) return;
    const pct = a.totalBudget > 0
      ? `${((a.allocatedBudget / a.totalBudget) * 100).toFixed(0)}%`
      : '0%';
    this.kpis[0].val = String(a.totalCampaigns);
    this.kpis[1].val = String(a.activeCampaigns);
    this.kpis[2].val = String(a.totalCollaborations);
    this.kpis[3].val = pct;
  }

  /* ── Render Charts ───────────────────────────────────────────────── */
  private renderCharts(): void {
    this.renderSpendChart();
    this.renderCollabChart();
  }

  private renderSpendChart(): void {
    const canvas = this.spendChartRef?.nativeElement;
    if (!canvas || typeof Chart === 'undefined') return;
    this.spendChart?.destroy();

    // Campaign budgets as bar chart
    const labels = this.campaigns.map(c => c.title?.slice(0, 18) || 'Campaign');
    const data   = this.campaigns.map(c => c.budget || 0);

    this.spendChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label:           'Budget ($)',
          data,
          backgroundColor: 'rgba(251,191,36,.7)',
          borderColor:     '#D97706',
          borderWidth:     2,
          borderRadius:    8,
          borderSkipped:   false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ` $${ctx.parsed.y.toLocaleString()}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#6B5C30', font: { size: 11 } },
            grid:  { display: false },
          },
          y: {
            ticks: {
              color: '#6B5C30',
              font:  { size: 11 },
              callback: (v: any) => `$${(v/1000).toFixed(0)}k`,
            },
            grid: { color: 'rgba(255,255,255,.05)' },
          },
        },
      },
    });
  }

  private renderCollabChart(): void {
    const canvas = this.collabChartRef?.nativeElement;
    if (!canvas || typeof Chart === 'undefined') return;
    this.collabChart?.destroy();

    // Collab status doughnut
    const statusCounts = ['pending','accepted','active','completed','cancelled','rejected']
      .map(s => this.collabs.filter(c => c.status === s).length);

    this.collabChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels:   ['Pending','Accepted','Active','Completed','Cancelled','Rejected'],
        datasets: [{
          data:            statusCounts,
          backgroundColor: [
            'rgba(251,191,36,.8)',
            'rgba(52,211,153,.8)',
            'rgba(56,189,248,.8)',
            'rgba(139,92,246,.8)',
            'rgba(251,113,133,.8)',
            'rgba(148,163,184,.5)',
          ],
          borderWidth:   0,
          hoverOffset:   6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels:   { color: '#B8A978', font: { size: 11 }, padding: 14, boxWidth: 12 },
          },
        },
      },
    });
  }

  /* ── Quick action helpers ────────────────────────────────────────── */
  campaignStatusClass(s: string): string {
    return ({active:'ch-act',draft:'ch-drf',paused:'ch-pen',
             completed:'ch-com',cancelled:'ch-rej'})[s] ?? 'ch-drf';
  }
}