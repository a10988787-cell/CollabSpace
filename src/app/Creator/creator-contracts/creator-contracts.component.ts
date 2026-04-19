// src/app/Creator/creator-contracts/creator-contracts.component.ts
import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { HttpClient }     from '@angular/common/http';
import { CreatorService } from '../../services/creator.service';
import { environment }    from '../../environment';

@Component({
  selector: 'app-creator-contracts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creator-contracts.component.html',
  styleUrls: ['../creator-shared.css', './creator-contracts.component.css'],
})
export class CreatorContractsComponent implements OnInit, OnDestroy {
  contracts: any[] = [];
  loading          = true;
  signing          = '';   // _id of contract being signed
  uploading        = '';   // _id of contract whose file is uploading

  // Holds selected file per contract _id
  signedFiles: { [id: string]: File | null } = {};

  toast: { msg: string; type: 'ok' | 'err' } | null = null;
  private tt: any;

  private socket:    any;
  private isBrowser: boolean;

  constructor(
    private creator: CreatorService,
    private http:    HttpClient,
    @Inject(PLATFORM_ID) pid: object,
  ) { this.isBrowser = isPlatformBrowser(pid); }

  ngOnInit(): void {
    this.load();
    if (this.isBrowser) this.initSocket();
  }

  ngOnDestroy(): void {
    if (this.socket) { this.socket.disconnect(); this.socket = null; }
  }

  /* ── Socket: refresh list when brand sends new contract ─────────── */
  private initSocket(): void {
    try {
      const { io } = require('socket.io-client');
      const token   = localStorage.getItem('cs_token') || '';
      this.socket   = io(environment.apiUrl.replace('/api', ''), {
        auth: { token }, transports: ['websocket', 'polling'],
      });
      this.socket.on('contract:new', () => { this.load(); });
    } catch (_) {}
  }

  load(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/contracts`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('cs_token') || ''}` },
    }).subscribe({
      next: (r: any) => { this.contracts = r.contracts || []; this.loading = false; },
      error: ()      => { this.loading = false; },
    });
  }

  /* ── Sign contract (digital) ────────────────────────────────────── */
  sign(contract: any): void {
    if (!confirm(`Sign the contract "${contract.title}"? This action cannot be undone.`)) return;
    this.signing = contract._id;
    this.http.post<any>(`${environment.apiUrl}/contracts/${contract._id}/sign`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem('cs_token') || ''}` },
    }).subscribe({
      next: () => {
        this.signing = '';
        this.showToast('✍️ Contract signed! Now upload your signed PDF copy below.', 'ok');
        this.load();
        // Notify brand via socket
        this.socket?.emit('contract:signed', { contractId: contract._id });
      },
      error: (e: any) => {
        this.signing = '';
        this.showToast(e?.error?.message || 'Signing failed.', 'err');
      },
    });
  }

  /* ── File selection ─────────────────────────────────────────────── */
  onFileSelected(contractId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.signedFiles[contractId] = input.files[0];
  }

  /* ── Upload signed PDF copy ─────────────────────────────────────── */
  uploadSignedCopy(contract: any): void {
    const file = this.signedFiles[contract._id];
    if (!file) return;

    this.uploading = contract._id;
    const fd = new FormData();
    fd.append('signedContract', file);

    this.http.post<any>(
      `${environment.apiUrl}/contracts/${contract._id}/upload-signed`,
      fd,
      { headers: { Authorization: `Bearer ${localStorage.getItem('cs_token') || ''}` } },
    ).subscribe({
      next: () => {
        this.uploading = '';
        this.signedFiles[contract._id] = null;
        this.showToast('📤 Signed copy uploaded! Brand has been notified.', 'ok');
        this.load();
        // Emit so brand gets real-time notification
        this.socket?.emit('contract:signed', { contractId: contract._id });
      },
      error: (e: any) => {
        this.uploading = '';
        this.showToast(e?.error?.message || 'Upload failed.', 'err');
      },
    });
  }

  /* ── Download original PDF ──────────────────────────────────────── */
  download(contract: any): void {
    this.http.get(`${environment.apiUrl}/contracts/${contract._id}/download`, {
      headers:      { Authorization: `Bearer ${localStorage.getItem('cs_token') || ''}` },
      responseType: 'blob',
    }).subscribe({
      next: (blob: Blob) => {
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `contract_${contract._id.slice(-8)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.showToast('Download failed.', 'err'),
    });
  }

  statusClass(s: string): string {
    const m: any = { pending: 'p-amber', signed: 'p-jade', expired: 'p-rose', archived: 'p-gray' };
    return m[s] || 'p-gray';
  }

  fmtDate(d: string): string {
    return d ? new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  }

  private showToast(msg: string, type: 'ok' | 'err'): void {
    clearTimeout(this.tt);
    this.toast = { msg, type };
    this.tt = setTimeout(() => this.toast = null, 5000);
  }
}