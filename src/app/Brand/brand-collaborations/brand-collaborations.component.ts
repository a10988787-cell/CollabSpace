import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-brand-collaborations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-collaborations.component.html',
  styleUrls: ['./brand-collaborations.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandCollaborationsComponent implements OnInit {
  collabs: any[] = [];
  loading = true; saving = false; modal = false;
  filter = 'all'; filters = ['all','pending','accepted','rejected','active','completed','cancelled'];
  statuses = ['pending','accepted','rejected','active','completed','cancelled'];
  form: any = { creator:'',deliverables:'',paymentTerms:'',amount:'',message:'' };
  toast: any = null; private tt: any;

  get filtered() { return this.filter==='all' ? this.collabs : this.collabs.filter(c=>c.status===this.filter); }
  getInit(c: any) { return c ? ((c.firstName?.[0]||'')+(c.lastName?.[0]||'')).toUpperCase() : '?'; }
  getAvatarGrad(s: string) { const g=['linear-gradient(135deg,#8B5CF6,#6D28D9)','linear-gradient(135deg,#FBBF24,#D97706)','linear-gradient(135deg,#34D399,#059669)','linear-gradient(135deg,#38BDF8,#0EA5E9)']; return g[(s?.charCodeAt(0)||0)%g.length]; }

  constructor(private svc: BrandService) {}
  ngOnInit() { this.load(); }
  load() { this.loading=true; this.svc.getCollaborations().subscribe({ next:r=>{ this.collabs=r.collaborations||[]; this.loading=false; }, error:()=>this.loading=false }); }
  openModal() { this.form={ creator:'',deliverables:'',paymentTerms:'',amount:'',message:'' }; this.modal=true; }
  save() {
    if (!this.form.creator) return this.showToast('Creator ID is required.','err');
    this.saving=true;
    this.svc.createCollaboration(this.form).subscribe({ next:()=>{ this.modal=false;this.saving=false;this.load();this.showToast('Invite sent!'); }, error:e=>{ this.saving=false;this.showToast(e?.error?.message||'Failed.','err'); } });
  }
  updateStatus(c: any) { this.svc.updateCollaboration(c._id,{status:c.status}).subscribe({ next:()=>this.showToast('Status updated.'), error:()=>this.showToast('Failed.','err') }); }
  delete(c: any) { if (!confirm('Cancel this collaboration?')) return; this.svc.deleteCollaboration(c._id).subscribe({ next:()=>{ this.load();this.showToast('Cancelled.'); }, error:()=>this.showToast('Failed.','err') }); }
  showToast(msg: string, type: 'ok'|'err'='ok') { clearTimeout(this.tt);this.toast={msg,type};this.tt=setTimeout(()=>this.toast=null,3200); }
}