// src/app/Creator/creator-growth/creator-growth.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';

@Component({
  selector: 'app-creator-growth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creator-growth.component.html',
  styleUrls: ['../creator-shared.css', './creator-growth.component.css'],
})
export class CreatorGrowthComponent implements OnInit {
  metric: any = null;
  loading = true;
  saving = false;
  editMode = false;
  period = '30d';
  platform = 'All';
  periods = ['7d', '30d', '90d', '6m', '1y'];
  platforms = ['All', 'Instagram', 'YouTube', 'TikTok', 'Twitter'];
  toast = { show: false, msg: '', type: 'success' };

  form: any = {
    monthlyGrowth: 0,
    weeklyGrowth: 0,
    engagementTrend: 0,
    dailyFollowers: [] as { date: string; count: number }[],
  };

  newEntry = { date: '', count: 0 };

  constructor(private creator: CreatorService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.creator.getGrowthMetrics(this.period, this.platform).subscribe({
      next: r => {
        this.metric = r.metric;
        if (r.metric) {
          this.form = {
            monthlyGrowth:   r.metric.monthlyGrowth   || 0,
            weeklyGrowth:    r.metric.weeklyGrowth     || 0,
            engagementTrend: r.metric.engagementTrend  || 0,
            dailyFollowers:  r.metric.dailyFollowers?.map((d: any) => ({
              date: d.date ? new Date(d.date).toISOString().split('T')[0] : '',
              count: d.count || 0,
            })) || [],
          };
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  addEntry(): void {
    if (!this.newEntry.date || !this.newEntry.count) return;
    this.form.dailyFollowers.push({ ...this.newEntry });
    this.form.dailyFollowers.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    this.newEntry = { date: '', count: 0 };
  }

  removeEntry(i: number): void { this.form.dailyFollowers.splice(i, 1); }

  save(): void {
    this.saving = true;
    this.creator.updateGrowthMetrics({ ...this.form, period: this.period, platform: this.platform }).subscribe({
      next: r => {
        this.metric = r.metric;
        this.editMode = false;
        this.saving = false;
        this.showToast('Growth data updated!');
      },
      error: (e) => { this.saving = false; this.showToast(e.friendlyMessage || 'Error', 'error'); }
    });
  }

  showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toast = { show: true, msg, type };
    setTimeout(() => this.toast.show = false, 3500);
  }

  // Compute simple bar chart heights from daily followers
  get chartBars(): { label: string; height: number; count: number }[] {
    const data = this.form.dailyFollowers;
    if (!data?.length) return [];
    const maxCount = Math.max(...data.map((d: any) => d.count), 1);
    return data.slice(-14).map((d: any) => ({
      label: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      height: Math.max((d.count / maxCount) * 100, 4),
      count: d.count,
    }));
  }

  trendColor(val: number): string {
    return val > 0 ? 'var(--jade)' : val < 0 ? 'var(--rose)' : 'var(--t3)';
  }

  trendArrow(val: number): string {
    return val > 0 ? '↑' : val < 0 ? '↓' : '→';
  }
}