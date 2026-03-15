import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';

@Component({
  selector: 'app-creator-social',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creator-social.component.html',
  styleUrls: ['../creator-shared.css', './creator-social.component.css'],
})
export class CreatorSocialComponent implements OnInit {
  accounts: any[]  = [];
  loading  = true;
  saving   = false;
  showModal = false;
  editingId: string | null = null;
  toast = { show: false, msg: '', type: 'success' };

  form: any = { platform: 'Instagram', username: '', followersCount: 0, engagementRate: 0, profileUrl: '' };

  platforms: string[] = ['Instagram', 'YouTube', 'TikTok', 'Twitter', 'Twitch', 'Pinterest', 'LinkedIn', 'Podcast'];

  platformColors: Record<string, string> = {
    Instagram: '#E1306C', YouTube: '#FF0000', TikTok: '#69C9D0',
    Twitter:   '#1DA1F2', Twitch:  '#9146FF', Pinterest: '#E60023',
    LinkedIn:  '#0A66C2', Podcast: '#A78BFA',
  };

  constructor(private creator: CreatorService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.creator.getSocialAccounts().subscribe({
      next:  r  => { this.accounts = r.accounts; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openAdd(): void {
    this.form      = { platform: 'Instagram', username: '', followersCount: 0, engagementRate: 0, profileUrl: '' };
    this.editingId = null;
    this.showModal = true;
  }

  openEdit(a: any): void {
    this.form      = { ...a };
    this.editingId = a._id;
    this.showModal = true;
  }

  save(): void {
    this.saving = true;
    const obs = this.editingId
      ? this.creator.updateSocialAccount(this.editingId, this.form)
      : this.creator.addSocialAccount(this.form);

    obs.subscribe({
      next: () => {
        this.load();
        this.showModal = false;
        this.saving    = false;
        this.showToast(this.editingId ? 'Account updated!' : 'Account connected!');
      },
      error: e => { this.saving = false; this.showToast(e?.friendlyMessage || 'Error', 'error'); },
    });
  }

  disconnect(id: string): void {
    this.creator.deleteSocialAccount(id).subscribe({
      next:  () => { this.load(); this.showToast('Account disconnected.'); },
      error: () => { this.showToast('Error', 'error'); },
    });
  }

  /** Safe handle display — keeps @ out of Angular template interpolation */
  handleDisplay(username: string): string {
    return username ? '@' + username : '—';
  }

  formatNum(n: number): string {
    return n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M'
         : n >= 1_000     ? (n / 1_000).toFixed(1) + 'K'
         : String(n);
  }

  showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toast = { show: true, msg, type };
    setTimeout(() => this.toast.show = false, 3500);
  }
}