import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';

@Component({
  selector: 'app-creator-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creator-profile.component.html',
  styleUrls: ['./creator-profile.component.css'],
})
export class CreatorProfileComponent implements OnInit {
  profile: any = null;
  loading = true;
  saving  = false;
  dirty   = false;   // tracks unsaved changes
  toast   = { show: false, msg: '', type: 'success' };

  form: any = {
    username: '', bio: '', niche: 'Other', country: '',
    contactInfo: { phone: '', website: '', linkedin: '' },
  };

  niches    = ['Fashion','Beauty','Tech','Gaming','Food','Travel','Fitness','Lifestyle','Music','Education','Comedy','Other'];
  countries = ['India','United States','United Kingdom','Canada','Australia','Germany','France','Japan','Brazil','Other'];

  selectedFile: File | null = null;
  previewUrl = '';

  constructor(private creator: CreatorService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.creator.getProfile().subscribe({
      next: r => {
        this.profile = r.profile;
        this.syncForm(r.profile);
        this.loading = false;
        this.dirty   = false;
      },
      error: () => { this.loading = false; },
    });
  }

  syncForm(p: any): void {
    this.form = {
      username: p.username   || '',
      bio:      p.bio        || '',
      niche:    p.niche      || 'Other',
      country:  p.country    || '',
      contactInfo: {
        phone:   p.contactInfo?.phone   || '',
        website: p.contactInfo?.website || '',
        linkedin:p.contactInfo?.linkedin|| '',
      },
    };
  }

  onFileChange(e: any): void {
    const f = e.target.files[0];
    if (!f) return;
    this.selectedFile = f;
    this.dirty = true;
    const reader  = new FileReader();
    reader.onload = (ev: any) => this.previewUrl = ev.target.result;
    reader.readAsDataURL(f);
  }

  markDirty(): void { this.dirty = true; }

  discard(): void {
    this.syncForm(this.profile);
    this.selectedFile = null;
    this.previewUrl   = '';
    this.dirty        = false;
  }

  save(): void {
    this.saving = true;
    const fd    = new FormData();
    fd.append('username', this.form.username);
    fd.append('bio',      this.form.bio);
    fd.append('niche',    this.form.niche);
    fd.append('country',  this.form.country);
    fd.append('contactInfo', JSON.stringify(this.form.contactInfo));
    if (this.selectedFile) fd.append('avatar', this.selectedFile);

    this.creator.updateProfile(fd).subscribe({
      next: r => {
        this.profile  = r.profile;
        this.syncForm(r.profile);
        this.saving   = false;
        this.dirty    = false;
        this.selectedFile = null;
        this.previewUrl   = '';
        this.showToast('Profile updated successfully! ✓');
      },
      error: e => {
        this.saving = false;
        this.showToast(e?.friendlyMessage || 'Error saving profile', 'error');
      },
    });
  }

  get displayHandle(): string {
    return this.form.username ? '@' + this.form.username : 'No username set';
  }

  get avatarSrc(): string {
    return this.previewUrl || this.profile?.profilePicture || '';
  }

  showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toast = { show: true, msg, type };
    setTimeout(() => this.toast.show = false, 4000);
  }
}