import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-brand-contracts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-contracts.component.html',
  styleUrls: ['./brand-contracts.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandContractsComponent implements OnInit {
  contracts: any[] = []; loading = true; saving = false; modal = false; editing: any = null;
  filter = 'all'; filters = ['all','draft','sent','signed','archived'];
  statuses = ['draft','sent','signed','archived'];
  form: any = { title:'', creator:'', fileUrl:'', content:'', status:'draft' };
  toast: any = null; private tt: any;
  get filtered() { return this.filter==='all' ? this.contracts : this.contracts.filter(c=>c.status===this.filter); }
  constructor(private svc: BrandService) {}
  ngOnInit() { this.load(); }
  load() { this.loading=true; this.svc.getContracts().subscribe({ next:r=>{ this.contracts=r.contracts||[];this.loading=false; }, error:()=>this.loading=false }); }
  openModal(c?: any) { this.editing=c||null; this.form=c?{...c,creator:c.creator?._id||c.creator||''}:{title:'',creator:'',fileUrl:'',content:'',status:'draft'}; this.modal=true; }
  updateStatus(c: any) { this.svc.updateContract(c._id,{status:c.status}).subscribe({ next:()=>this.showToast('Status updated.'), error:()=>this.showToast('Failed.','err') }); }
  save() {
    if (!this.form.title) return this.showToast('Title required.','err');
    this.saving=true;
    const req=this.editing?this.svc.updateContract(this.editing._id,this.form):this.svc.createContract(this.form);
    req.subscribe({ next:()=>{ this.modal=false;this.saving=false;this.load();this.showToast(this.editing?'Contract updated!':'Contract created!'); }, error:e=>{ this.saving=false;this.showToast(e?.error?.message||'Failed.','err'); } });
  }
  delete(c: any) { if (!confirm(`Archive "${c.title}"?`)) return; this.svc.deleteContract(c._id).subscribe({ next:()=>{ this.load();this.showToast('Contract archived.'); }, error:()=>this.showToast('Failed.','err') }); }
  showToast(msg: string, type: 'ok'|'err'='ok') { clearTimeout(this.tt);this.toast={msg,type};this.tt=setTimeout(()=>this.toast=null,3200); }
}