import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';

@Component({ selector:'app-creator-applications', standalone:true, imports:[CommonModule,FormsModule],
  templateUrl:'./creator-applications.component.html', styleUrls:['../creator-shared.css','./creator-applications.component.css'] })
export class CreatorApplicationsComponent implements OnInit {
  applications: any[] = []; loading = true; saving = false; filterStatus = '';
  showModal = false; editingId: string|null = null;
  toast = { show:false, msg:'', type:'success' };
  form: any = { campaignId:'', proposalMessage:'', priceQuote:0 };
  statuses = ['','pending','reviewing','accepted','rejected','withdrawn'];

  constructor(private creator: CreatorService) {}
  ngOnInit(): void { this.load(); }
  load(): void { this.loading=true; this.creator.getApplications(this.filterStatus||undefined).subscribe({ next:r=>{ this.applications=r.applications; this.loading=false; }, error:()=>this.loading=false }); }

  openEdit(a: any): void { this.form={campaignId:a.campaign?._id||'',proposalMessage:a.proposalMessage,priceQuote:a.priceQuote}; this.editingId=a._id; this.showModal=true; }
  save(): void {
    this.saving=true;
    const obs = this.editingId ? this.creator.updateApplication(this.editingId,{proposalMessage:this.form.proposalMessage,priceQuote:this.form.priceQuote}) : this.creator.submitApplication(this.form);
    obs.subscribe({ next:()=>{ this.load(); this.showModal=false; this.saving=false; this.showToast('Saved!'); }, error:(e)=>{ this.saving=false; this.showToast(e.friendlyMessage||'Error','error'); } });
  }
  withdraw(id: string): void { if(!confirm('Withdraw this application?')) return; this.creator.withdrawApplication(id).subscribe({ next:()=>{ this.load(); this.showToast('Application withdrawn.'); }, error:()=>this.showToast('Error','error') }); }
  showToast(msg: string, type: 'success'|'error'='success'): void { this.toast={show:true,msg,type}; setTimeout(()=>this.toast.show=false,3500); }
  statusPill(s: string): string { const m:any={accepted:'jade',pending:'amber',reviewing:'sky',rejected:'rose',withdrawn:'gray'}; return 'pill-'+(m[s]||'gray'); }
}