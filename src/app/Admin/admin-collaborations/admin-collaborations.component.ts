import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-collaborations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-collaborations.component.html',
  styleUrls: ['../admin-shared.css'],
  encapsulation: ViewEncapsulation.None,
})
export class AdminCollaborationsComponent implements OnInit {
  items: any[] = [];
  loading  = true;
  saving   = false;
  showModal = false;
  showDel  = false;
  isEdit   = false;
  delId    = '';
  search   = '';
  page     = 1;
  total    = 0;
  pages    = 1;
  toast: { msg:string; type:'ok'|'err' } | null = null;
  private tt: any;

  form: any = { status: 'active',
    agreedAmount: 0, _id: '' };

  constructor(private svc: AdminService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.svc.list('collaborations', { search: this.search||undefined, page: this.page }).subscribe({
      next: (r:any) => {
        this.items   = r.data || [];
        this.total   = r.total || 0;
        this.pages   = r.pages || 1;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  openCreate(): void {
    this.isEdit = false;
    this.form   = { status: 'active',
    agreedAmount: 0, _id: '' };
    this.showModal = true;
  }

  openEdit(item: any): void {
    this.isEdit    = true;
    this.form      = { ...item };
    this.showModal = true;
  }

  save(): void {
    this.saving = true;
    const ob$ = this.isEdit
      ? this.svc.update('collaborations', this.form._id, this.form)
      : this.svc.create('collaborations', this.form);
    ob$.subscribe({
      next: () => { this.saving = false; this.showModal = false; this.load(); this.showToast(this.isEdit ? 'Updated!' : 'Created!', 'ok'); },
      error: (e:any) => { this.saving = false; this.showToast(e?.error?.message || 'Error', 'err'); },
    });
  }

  confirmDel(id: string): void { this.delId = id; this.showDel = true; }

  doDelete(): void {
    this.svc.remove('collaborations', this.delId).subscribe({
      next: () => { this.showDel = false; this.load(); this.showToast('Deleted.', 'ok'); },
      error: (e:any) => { this.showDel = false; this.showToast(e?.error?.message || 'Error', 'err'); },
    });
  }

  prev(): void { if (this.page > 1) { this.page--; this.load(); } }
  next(): void { if (this.page < this.pages) { this.page++; this.load(); } }

  private showToast(msg: string, type: 'ok'|'err'): void {
    clearTimeout(this.tt);
    this.toast = { msg, type };
    this.tt = setTimeout(() => this.toast = null, 4000);
  }
}