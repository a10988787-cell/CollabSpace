// src/app/Creator/creator-contracts/creator-contracts.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';

@Component({
  selector: 'app-creator-contracts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creator-contracts.component.html',
  styleUrls: ['../creator-shared.css', './creator-contracts.component.css'],
})
export class CreatorContractsComponent implements OnInit {
  contracts: any[] = [];
  loading = true;
  saving = false;
  showModal = false;
  editingId: string | null = null;
  toast = { show: false, msg: '', type: 'success' };

  form: any = { title: '', content: '', brandId: '', collaborationId: '', expiresAt: '' };
  selectedFile: File | null = null;

  constructor(private creator: CreatorService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.creator.getContracts().subscribe({
      next: r => { this.contracts = r.contracts; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openAdd(): void {
    this.form = { title: '', content: '', brandId: '', collaborationId: '', expiresAt: '' };
    this.editingId = null;
    this.selectedFile = null;
    this.showModal = true;
  }

  openEdit(c: any): void {
    this.form = { title: c.title, content: c.content || '', brandId: c.brand?._id || '', collaborationId: c.collaboration || '', expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().split('T')[0] : '' };
    this.editingId = c._id;
    this.showModal = true;
  }

  onFile(e: any): void { this.selectedFile = e.target.files[0] || null; }

  save(): void {
    this.saving = true;
    const fd = new FormData();
    Object.keys(this.form).forEach(k => { if (this.form[k]) fd.append(k, this.form[k]); });
    if (this.selectedFile) fd.append('contract', this.selectedFile);

    const obs = this.editingId
      ? this.creator.updateContract(this.editingId, this.form)
      : this.creator.uploadContract(fd);

    obs.subscribe({
      next: () => { this.load(); this.showModal = false; this.saving = false; this.showToast(this.editingId ? 'Updated!' : 'Contract uploaded!'); },
      error: (e) => { this.saving = false; this.showToast(e.friendlyMessage || 'Error', 'error'); }
    });
  }

  sign(id: string): void {
    if (!confirm('Sign this contract? This action cannot be undone.')) return;
    this.creator.signContract(id).subscribe({
      next: () => { this.load(); this.showToast('Contract signed! ✅'); },
      error: (e) => { this.showToast(e.friendlyMessage || 'Error signing contract', 'error'); }
    });
  }

  archive(id: string): void {
    if (!confirm('Archive this contract?')) return;
    this.creator.archiveContract(id).subscribe({
      next: () => { this.load(); this.showToast('Contract archived.'); },
      error: () => {}
    });
  }

  showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toast = { show: true, msg, type };
    setTimeout(() => this.toast.show = false, 3500);
  }

  statusPill(s: string): string {
    const m: any = { signed: 'jade', pending: 'amber', expired: 'rose', archived: 'gray' };
    return 'pill-' + (m[s] || 'gray');
  }
}