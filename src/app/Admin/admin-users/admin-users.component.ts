// src/app/Admin/admin-users/admin-users.component.ts
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css', '../admin-shared.css'],
  encapsulation: ViewEncapsulation.None,
})
export class AdminUsersComponent implements OnInit {
   Object = Object;
  items: any[]  = [];
  loading       = true;
  saving        = false;
  showModal     = false;
  showDel       = false;
  isEdit        = false;
  delId         = '';
  search        = '';
  filterStatus  = 'all';
  stats: any    = {};
  chartInstance: any = null;

  form: any = {
    name: '',
    email: '',
    role: '',
    permissions: [],
    _id: '',
  };

  constructor(private svc: AdminService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.svc.list('admin-users').subscribe({
      next: r => {
        this.items = r.data || r.analytics || [];
        this.loading = false;
        this.calcStats();
        setTimeout(() => this.initChart(), 100);
      },
      error: () => { this.loading = false; }
    });
  }

  calcStats() {
    const a: any = {};
    a.total = this.items.length;
    a.active = this.items.filter((x:any) => x.isActive || x.status === 'active' || x.enabled).length;
    a.pending = this.items.filter((x:any) => x.status === 'pending').length;
    a.today = this.items.filter((x:any) => {
      const d = new Date(x.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;
    a.week = this.items.filter((x:any) => {
      const d = new Date(x.createdAt);
      const week = new Date(); week.setDate(week.getDate()-7);
      return d >= week;
    }).length;
    this.stats = a;
  }

  get filtered() {
    let r = this.items;
    if (this.search) {
      const q = this.search.toLowerCase();
      r = r.filter((x:any) => JSON.stringify(x).toLowerCase().includes(q));
    }
    if (this.filterStatus !== 'all') {
      r = r.filter((x:any) => x.status === this.filterStatus || (this.filterStatus === 'active' && (x.isActive || x.enabled)));
    }
    return r;
  }

  openAdd() {
    this.isEdit = false;
    this.form = {
    name: '',
    email: '',
    role: '',
    permissions: [],
      _id: '',
    };
    this.showModal = true;
  }

  openEdit(item: any) {
    this.isEdit = true;
    this.form = { ...item, permissions: Array.isArray(item.permissions) ? [...item.permissions] : (item.permissions ? item.permissions.split(",").map((x:any)=>x.trim()) : []) };
    this.showModal = true;
  }

  confirmDel(id: string) { this.delId = id; this.showDel = true; }

  save() {
    if (this.saving) return;
    this.saving = true;
    const body = { ...this.form };
    delete body._id;
    body.permissions = Array.isArray(body.permissions) ? body.permissions.join(',') : body.permissions;
    const obs = this.isEdit
      ? this.svc.update('admin-users', this.form._id, body)
      : this.svc.create('admin-users', body);
    obs.subscribe({
      next: () => { this.saving = false; this.showModal = false; this.load(); },
      error: () => { this.saving = false; },
    });
  }

  del() {
    this.svc.remove('admin-users', this.delId).subscribe({
      next: () => { this.showDel = false; this.load(); },
    });
  }

  addTag(field: string, e: Event) {
    e.preventDefault();
    const inp = e.target as HTMLInputElement;
    const val = inp.value.trim();
    if (!val) return;
    if (!Array.isArray(this.form[field])) this.form[field] = [];
    if (!this.form[field].includes(val)) this.form[field].push(val);
    inp.value = '';
  }

  removeTag(field: string, tag: string) {
    this.form[field] = (this.form[field] || []).filter((t: string) => t !== tag);
  }

  fmt(v: any) {
    if (!v) return '—';
    if (typeof v === 'object') return JSON.stringify(v).substring(0,40)+'…';
    const s = String(v);
    return s.length > 40 ? s.substring(0,40)+'…' : s;
  }

  fmtDate(d: any) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  }

  getStatusBadge(s: any) {
    if (!s && s !== false) return 'badge-gray';
    if (s === true || s === 'active' || s === 'approved' || s === 'paid' || s === 'resolved' || s === 'enabled') return 'badge-green';
    if (s === false || s === 'inactive' || s === 'rejected' || s === 'failed' || s === 'disabled') return 'badge-red';
    if (s === 'pending' || s === 'flagged') return 'badge-amber';
    if (s === 'completed') return 'badge-blue';
    if (s === 'draft') return 'badge-gray';
    return 'badge-blue';
  }

  initChart() {
    const Chart = (window as any).Chart;
    if (!Chart) return;
    const el = document.getElementById('adminusers_chart') as HTMLCanvasElement;
    if (!el) return;
    if (this.chartInstance) { this.chartInstance.destroy(); }
    const labels = this.items.slice(-8).map((_:any,i:number) => 'Item ' + (i+1));
    const data   = this.items.slice(-8).map((_:any) => Math.floor(Math.random()*100)+10);
    this.chartInstance = new Chart(el.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Admin Accounts',
          data,
          backgroundColor: 'rgba(59,130,246,.18)',
          borderColor: '#3B82F6',
          borderWidth: 1.5,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(15,23,42,.04)' }, ticks: { color: '#94A3B8', font: { size:11, family:'Inter' } } },
          y: { grid: { color: 'rgba(15,23,42,.04)' }, ticks: { color: '#94A3B8', font: { size:11, family:'Inter' } } },
        },
        animation: { duration: 700, easing: 'easeInOutQuart' },
      }
    });
  }
}