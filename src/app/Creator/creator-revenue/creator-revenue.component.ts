import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';

@Component({ selector:'app-creator-revenue', standalone:true, imports:[CommonModule,FormsModule],
  templateUrl:'./creator-revenue.component.html', styleUrls:['../creator-shared.css','./creator-revenue.component.css'] })
export class CreatorRevenueComponent implements OnInit {
  entries: any[] = []; totalReceived = 0; totalPending = 0; loading = true;
  toast = { show:false, msg:'', type:'success' };
  statuses = ['','pending','processing','received','failed'];
  filterStatus = '';
  constructor(private creator: CreatorService) {}
  ngOnInit(): void { this.load(); }
  load(): void { this.loading=true; this.creator.getRevenue(this.filterStatus||undefined).subscribe({ next:r=>{ this.entries=r.entries; this.totalReceived=r.totalReceived; this.totalPending=r.totalPending; this.loading=false; }, error:()=>this.loading=false }); }
  remove(id: string): void { this.creator.deleteRevenueEntry(id).subscribe({ next:()=>{ this.load(); this.showToast('Removed.'); }, error:()=>{} }); }
  showToast(msg: string, type: 'success'|'error'='success'): void { this.toast={show:true,msg,type}; setTimeout(()=>this.toast.show=false,3500); }
  statusPill(s: string): string { const m:any={received:'jade',pending:'amber',processing:'sky',failed:'rose'}; return 'pill-'+(m[s]||'gray'); }
}