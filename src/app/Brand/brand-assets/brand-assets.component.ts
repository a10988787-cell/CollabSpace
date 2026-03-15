import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { HttpClient }    from '@angular/common/http';
import { BrandService }  from '../../services/brand.service';
import { environment }   from '../../environment';

const UPLOAD_URL = `${environment.apiUrl}/brand/assets/upload`;

@Component({
  selector: 'app-brand-assets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-assets.component.html',
  styleUrls:   ['./brand-assets.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandAssetsComponent implements OnInit {

  assets:     any[]    = [];
  loading     = true;
  uploading   = false;
  modal       = false;
  editing: any = null;

  typeFilter  = 'all';
  search      = '';
  typeFilters = ['all','logo','guideline','product_image','promo_video','other'];

  /* ── Form (URL mode) ─────────────────────────────────────────────────── */
  form: any       = { name: '', type: 'other', url: '', mimeType: '' };
  uploadMode: 'url' | 'file' = 'file';   // default to file upload

  /* ── File upload ─────────────────────────────────────────────────────── */
  selectedFile: File | null = null;
  uploadProgress = 0;

  /* ── Toast ───────────────────────────────────────────────────────────── */
  toast: { msg: string; type: 'ok' | 'err' } | null = null;
  private tt: any;

  constructor(
    private svc:  BrandService,
    private http: HttpClient,
  ) {}

  ngOnInit() { this.load(); }

  get filtered() {
    let list = this.assets;
    if (this.typeFilter !== 'all') list = list.filter(a => a.type === this.typeFilter);
    if (this.search.trim())
      list = list.filter(a => a.name.toLowerCase().includes(this.search.toLowerCase()));
    return list;
  }

  load() {
    this.loading = true;
    this.svc.getAssets().subscribe({
      next:  r  => { this.assets = r.assets || []; this.loading = false; },
      error: () => this.loading = false,
    });
  }

  openModal(a?: any) {
    this.editing      = a || null;
    this.selectedFile = null;
    this.uploadProgress = 0;
    this.form = a
      ? { ...a }
      : { name: '', type: 'other', url: '', mimeType: '' };
    this.uploadMode = a ? 'url' : 'file';
    this.modal = true;
  }

  /* ── File selection ─────────────────────────────────────────────────── */
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
      if (!this.form.name) this.form.name = this.selectedFile.name.replace(/\.[^.]+$/, '');
      this.form.mimeType = this.selectedFile.type;
    }
  }

  /* ── Save: file upload OR URL save ─────────────────────────────────── */
  save() {
    if (this.editing) {
      // Editing: only update metadata via JSON
      this.svc.updateAsset(this.editing._id, this.form).subscribe({
        next:  () => { this.modal = false; this.load(); this.showToast('Asset updated!'); },
        error: e  => this.showToast(e?.error?.message || 'Failed.', 'err'),
      });
      return;
    }

    if (this.uploadMode === 'file' && this.selectedFile) {
      this.uploadFile();
    } else {
      this.saveUrl();
    }
  }

  private uploadFile() {
    if (!this.form.name)     return this.showToast('Asset name is required.', 'err');
    if (!this.selectedFile)  return this.showToast('Please select a file.', 'err');

    this.uploading = true;
    const fd = new FormData();
    fd.append('file', this.selectedFile);
    fd.append('name', this.form.name);
    fd.append('type', this.form.type || 'other');

    this.http.post<any>(UPLOAD_URL, fd, {
      reportProgress: false,
    }).subscribe({
      next: r => {
        this.uploading = false;
        this.modal     = false;
        this.load();
        this.showToast('File uploaded successfully!');
      },
      error: e => {
        this.uploading = false;
        this.showToast(e?.error?.message || 'Upload failed.', 'err');
      },
    });
  }

  private saveUrl() {
    if (!this.form.name || !this.form.url)
      return this.showToast('Name and URL are required.', 'err');

    this.svc.createAsset(this.form).subscribe({
      next:  () => { this.modal = false; this.load(); this.showToast('Asset added!'); },
      error: e  => this.showToast(e?.error?.message || 'Failed.', 'err'),
    });
  }

  delete(a: any) {
    if (!confirm(`Remove "${a.name}"?`)) return;
    this.svc.deleteAsset(a._id).subscribe({
      next:  () => { this.load(); this.showToast('Asset removed.'); },
      error: () => this.showToast('Failed.', 'err'),
    });
  }

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  getIcon(t: string) {
    return ({logo:'🏷️',guideline:'📋',product_image:'🖼️',promo_video:'🎬',other:'📁'})[t] ?? '📁';
  }
  getIconBg(t: string) {
    return ({
      logo:          'rgba(251,191,36,.12)',
      guideline:     'rgba(139,92,246,.12)',
      product_image: 'rgba(56,189,248,.12)',
      promo_video:   'rgba(52,211,153,.12)',
      other:         'rgba(148,163,184,.08)',
    })[t] ?? 'rgba(148,163,184,.08)';
  }
  isImage(a: any) { return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(a.url); }
  isVideo(a: any) { return /\.(mp4|mov|avi|webm)$/i.test(a.url); }
  fileSizeLabel(bytes: number) {
    if (!bytes) return '';
    if (bytes < 1024)       return `${bytes} B`;
    if (bytes < 1048576)    return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/1048576).toFixed(1)} MB`;
  }

  showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    clearTimeout(this.tt);
    this.toast = { msg, type };
    this.tt = setTimeout(() => this.toast = null, 3200);
  }
}