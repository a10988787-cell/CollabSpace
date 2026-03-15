// src/app/Creator/creator-audience/creator-audience.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';

@Component({
  selector: 'app-creator-audience',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creator-audience.component.html',
  styleUrls: ['../creator-shared.css', './creator-audience.component.css'],
})
export class CreatorAudienceComponent implements OnInit {
  insight: any = null;
  loading = true;
  saving = false;
  editMode = false;
  platform = 'All';
  platforms = ['All', 'Instagram', 'YouTube', 'TikTok', 'Twitter'];
  toast = { show: false, msg: '', type: 'success' };

  form: any = {
    platform: 'All',
    ageGroups: [
      { label: '13-17', percentage: 5 },
      { label: '18-24', percentage: 35 },
      { label: '25-34', percentage: 30 },
      { label: '35-44', percentage: 18 },
      { label: '45+',   percentage: 12 },
    ],
    genderDistribution: { male: 45, female: 50, other: 5 },
    topCountries: [
      { country: 'India',         percentage: 40 },
      { country: 'United States', percentage: 25 },
      { country: 'United Kingdom',percentage: 10 },
      { country: 'Canada',        percentage: 8  },
      { country: 'Australia',     percentage: 7  },
    ],
    interests: ['Fashion', 'Lifestyle', 'Travel', 'Food'],
  };

  interestInput = '';

  constructor(private creator: CreatorService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.creator.getAudienceInsights(this.platform).subscribe({
      next: r => {
        this.insight = r.insight;
        if (r.insight?.ageGroups?.length) {
          this.form = {
            platform: r.insight.platform,
            ageGroups: [...r.insight.ageGroups],
            genderDistribution: { ...r.insight.genderDistribution },
            topCountries: [...r.insight.topCountries],
            interests: [...(r.insight.interests || [])],
          };
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  save(): void {
    this.saving = true;
    this.creator.updateAudienceInsights({ ...this.form, platform: this.platform }).subscribe({
      next: r => {
        this.insight = r.insight;
        this.editMode = false;
        this.saving = false;
        this.showToast('Audience insights updated!');
      },
      error: (e) => { this.saving = false; this.showToast(e.friendlyMessage || 'Error saving', 'error'); }
    });
  }

  addInterest(): void {
    if (this.interestInput.trim() && !this.form.interests.includes(this.interestInput.trim())) {
      this.form.interests.push(this.interestInput.trim());
      this.interestInput = '';
    }
  }

  removeInterest(i: number): void { this.form.interests.splice(i, 1); }

  totalAge(): number { return this.form.ageGroups.reduce((s: number, g: any) => s + (+g.percentage), 0); }
  totalGender(): number { const g = this.form.genderDistribution; return (+g.male) + (+g.female) + (+g.other); }

  showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toast = { show: true, msg, type };
    setTimeout(() => this.toast.show = false, 3500);
  }

  barWidth(pct: number): string { return Math.min(pct, 100) + '%'; }

  genderColor(key: string): string {
    return key === 'male' ? '#38BDF8' : key === 'female' ? '#FB7185' : '#A78BFA';
  }
}