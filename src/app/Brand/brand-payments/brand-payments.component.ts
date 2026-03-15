import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-brand-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-payments.component.html',
  styleUrls: ['./brand-payments.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandPaymentsComponent implements OnInit {
  payments: any[] = []; loading = true; saving = false; modal = false;
  filter = 'all'; filters = ['all','pending','processing','paid','failed','cancelled'];
  statuses = ['pending','processing','paid','failed','cancelled'];
  form: any = { creator:'', amount:'', currency:'USD', dueDate:'', notes:'' };
  toast: any = null; private tt: any;
  get filtered() { return this.filter==='all' ? this.payments : this.payments.filter(p=>p.status===this.filter); }
  get totalPaid()    { return this.payments.filter(p=>p.status==='paid').reduce((s,p)=>s+p.amount,0); }
  get totalPending() { return this.payments.filter(p=>p.status==='pending').reduce((s,p)=>s+p.amount,0); }
  constructor(private svc: BrandService) {}
  ngOnInit() { this.load(); }
  load() { this.loading=true; this.svc.getPayments().subscribe({ next:r=>{ this.payments=r.payments||[];this.loading=false; }, error:()=>this.loading=false }); }
  openModal() { this.form={ creator:'', amount:'', currency:'USD', dueDate:'', notes:'' }; this.modal=true; }
  updateStatus(p: any) { this.svc.updatePayment(p._id,{status:p.status}).subscribe({ next:()=>this.showToast('Payment status updated.'), error:()=>this.showToast('Failed.','err') }); }
  save() {
    if (!this.form.creator||!this.form.amount) return this.showToast('Creator and amount required.','err');
    this.saving=true;
    this.svc.createPayment(this.form).subscribe({ next:()=>{ this.modal=false;this.saving=false;this.load();this.showToast('Invoice created!'); }, error:e=>{ this.saving=false;this.showToast(e?.error?.message||'Failed.','err'); } });
  }
  delete(p: any) { if (!confirm('Cancel this invoice?')) return; this.svc.deletePayment(p._id).subscribe({ next:()=>{ this.load();this.showToast('Invoice cancelled.'); }, error:()=>this.showToast('Failed.','err') }); }
  showToast(msg: string, type: 'ok'|'err'='ok') { clearTimeout(this.tt);this.toast={msg,type};this.tt=setTimeout(()=>this.toast=null,3200); }
  get paidPaymentsCount(): number {
  return this.payments.filter(p => p.status === 'paid').length;
}
}