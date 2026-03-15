import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-brand-budget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-budget.component.html',
  styleUrls: ['./brand-budget.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandBudgetComponent implements OnInit {
  budgets: any[] = [];
  loading = true; saving = false; modal = false; editing: any = null;
  form: any = { title:'', totalAmount:'' };
  toast: any = null; private tt: any;
  get totalBudget() { return this.budgets.reduce((s,b)=>s+b.totalAmount,0); }
  get totalAllocated() { return this.budgets.reduce((s,b)=>s+b.allocated,0); }
  pct(b: any) { return b.totalAmount>0?Math.min(100,Math.round((b.allocated/b.totalAmount)*100)):0; }
  constructor(private svc: BrandService) {}
  ngOnInit() { this.load(); }
  load() { this.loading=true; this.svc.getBudgets().subscribe({ next:r=>{ this.budgets=r.budgets||[];this.loading=false; }, error:()=>this.loading=false }); }
  openModal(b?: any) { this.editing=b||null; this.form=b?{...b}:{title:'',totalAmount:''}; this.modal=true; }
  save() {
    if (!this.form.title||!this.form.totalAmount) return this.showToast('Title and amount required.','err');
    this.saving=true;
    const req=this.editing?this.svc.updateBudget(this.editing._id,this.form):this.svc.createBudget(this.form);
    req.subscribe({ next:()=>{ this.modal=false;this.saving=false;this.load();this.showToast(this.editing?'Budget updated!':'Budget created!'); }, error:e=>{ this.saving=false;this.showToast(e?.error?.message||'Failed.','err'); } });
  }
  delete(b: any) { if (!confirm(`Remove "${b.title}"?`)) return; this.svc.deleteBudget(b._id).subscribe({ next:()=>{ this.load();this.showToast('Budget removed.'); }, error:()=>this.showToast('Failed.','err') }); }
  showToast(msg: string, type: 'ok'|'err'='ok') { clearTimeout(this.tt);this.toast={msg,type};this.tt=setTimeout(()=>this.toast=null,3200); }
}