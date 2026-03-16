import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';

@Component({
  selector: 'app-creator-collab-posts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creator-collab-posts.component.html',
  styleUrls: ['./creator-collab-posts.component.css'],
})
export class CreatorCollabPostsComponent implements OnInit {
  posts: any[]        = [];
  acceptedApps: any[] = [];
  loading     = true;
  loadingApps = true;
  saving      = false;
  showModal   = false;
  editingId: string | null = null;
  selApp: any = null; // the accepted application this post is for

  form: any = {
    applicationId:   '',   // passed to backend — replaces manual collaborationId
    title:           '',
    caption:         '',
    contentType:     'image',
    hashtags:        '',
    platform:        'Instagram',
  };

  platforms    = ['Instagram','YouTube','TikTok','Twitter','Twitch','Blog','Podcast','Other'];
  contentTypes = ['text','image','video'];
  selectedFiles: File[]   = [];
  previews:      string[] = [];

  toast = { show: false, msg: '', type: 'success' };

  constructor(private creator: CreatorService) {}

  ngOnInit(): void {
    this.loadPosts();
    this.loadAccepted();
  }

  loadPosts(): void {
    this.loading = true;
    this.creator.getCollabPosts().subscribe({
      next: (r: any) => { this.posts = r.posts; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  loadAccepted(): void {
    this.loadingApps = true;
    // Load both accepted applications AND accepted invitations
    this.creator.getApplications('accepted').subscribe({
      next: (appsRes: any) => {
        const apps = (appsRes.applications || []).map((a: any) => ({ ...a, _sourceType: 'application' }));
        // Also fetch accepted invitations
        this.creator.getInvitations('accepted').subscribe({
          next: (invRes: any) => {
            const invs = (invRes.invitations || []).map((inv: any) => ({
              _id:       inv._id,
              _sourceType: 'invitation',
              campaign:  inv.campaign,
              collaboration: inv.collaboration,
              priceQuote: inv.proposedAmount,
              createdAt: inv.createdAt,
            }));
            this.acceptedApps = [...apps, ...invs];
            this.loadingApps  = false;
          },
          error: () => { this.acceptedApps = apps; this.loadingApps = false; }
        });
      },
      error: () => { this.loadingApps = false; },
    });
  }

  /** Open modal pre-filled for a specific accepted application or invitation */
  openNew(app?: any): void {
    this.editingId = null;
    this.selApp    = app || null;
    this.form = {
      applicationId: (app?._sourceType === 'invitation' ? '' : app?._id) || '',
      collaborationId: (app?._sourceType === 'invitation' ? (app?.collaboration?._id || app?.collaboration || '') : '') || '',
      title:         '',
      caption:       '',
      contentType:   'image',
      hashtags:      '',
      platform:      'Instagram',
    };
    this.selectedFiles = [];
    this.previews      = [];
    this.showModal     = true;
  }

  openEdit(p: any): void {
    this.editingId = p._id;
    this.selApp    = null;
    this.form = {
      applicationId: '',
      title:         p.title,
      caption:       p.caption,
      contentType:   p.contentType,
      hashtags:      p.hashtags?.join(', ') || '',
      platform:      p.platform,
    };
    this.selectedFiles = [];
    this.previews      = [];
    this.showModal     = true;
  }

  onFiles(e: any): void {
    this.selectedFiles = Array.from(e.target.files);
    this.previews      = [];
    this.selectedFiles.forEach(f => {
      const r = new FileReader();
      r.onload = (ev: any) => this.previews.push(ev.target.result);
      r.readAsDataURL(f);
    });
  }

  save(): void {
    if (!this.form.title.trim()) { this.showToast('Please add a title.', 'error'); return; }
    if (!this.editingId && !this.form.applicationId && !this.form.collaborationId) {
      this.showToast('Please select an accepted campaign from the list above.', 'error');
      return;
    }
    this.saving = true;

    if (this.editingId) {
      // Edit existing post
      this.creator.updateCollabPost(this.editingId, {
        title:       this.form.title,
        caption:     this.form.caption,
        contentType: this.form.contentType,
        platform:    this.form.platform,
        hashtags:    this.form.hashtags.split(',').map((h: string) => h.trim()).filter(Boolean),
      } as any).subscribe({
        next: () => { this.loadPosts(); this.showModal = false; this.saving = false; this.showToast('Post updated!'); },
        error: (e: any) => { this.saving = false; this.showToast(e?.error?.message || 'Error updating', 'error'); },
      });
    } else {
      // Create new post — send applicationId or collaborationId
      const fd = new FormData();
      if (this.form.applicationId)   fd.append('applicationId',   this.form.applicationId);
      if (this.form.collaborationId) fd.append('collaborationId', this.form.collaborationId);
      fd.append('title',         this.form.title);
      fd.append('caption',       this.form.caption);
      fd.append('contentType',   this.form.contentType);
      fd.append('platform',      this.form.platform);
      fd.append('hashtags',      this.form.hashtags);
      this.selectedFiles.forEach(f => fd.append('media', f));

      this.creator.createCollabPost(fd).subscribe({
        next: () => { this.loadPosts(); this.showModal = false; this.saving = false; this.showToast('Draft saved!'); },
        error: (e: any) => { this.saving = false; this.showToast(e?.error?.message || 'Error creating post', 'error'); },
      });
    }
  }

  submitPost(id: string): void {
    if (!confirm('Submit this content to the brand for review?')) return;
    this.creator.submitCollabPost(id).subscribe({
      next: () => { this.loadPosts(); this.showToast('Submitted! Brand will review it. ✅'); },
      error: (e: any) => this.showToast(e?.error?.message || 'Error', 'error'),
    });
  }

  deletePost(id: string): void {
    if (!confirm('Delete this draft?')) return;
    this.creator.deleteCollabPost(id).subscribe({
      next: () => { this.loadPosts(); this.showToast('Deleted.'); },
      error: () => this.showToast('Error', 'error'),
    });
  }

  statusLabel(s: string): string {
    const m: any = { draft:'Draft', submitted:'Under Review', approved:'Approved', revision_requested:'Revision Needed', rejected:'Rejected', paid:'Paid ✓' };
    return m[s] || s;
  }
  statusClass(s: string): string {
    const m: any = { draft:'sc-gray', submitted:'sc-sky', approved:'sc-jade', paid:'sc-acc', rejected:'sc-rose', revision_requested:'sc-amber' };
    return m[s] || 'sc-gray';
  }

  showToast(msg: string, type: 'success'|'error' = 'success'): void {
    this.toast = { show: true, msg, type };
    setTimeout(() => this.toast.show = false, 4000);
  }
}