import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';

@Component({ selector:'app-creator-analytics', standalone:true, imports:[CommonModule,FormsModule],
  templateUrl:'./creator-analytics.component.html', styleUrls:['../creator-shared.css','./creator-analytics.component.css'] })
export class CreatorAnalyticsComponent implements OnInit {
  analytics: any = {}; loading = true; saving = false; editMode = false;
  toast = { show:false, msg:'', type:'success' };
  period = '30d'; platform = 'All';
  periods = ['7d','30d','90d','6m','1y']; platforms = ['All','Instagram','YouTube','TikTok','Twitter'];
  form: any = { followers:0, engagementRate:0, avgLikes:0, avgComments:0, reach:0, impressions:0, profileVisits:0 };

  constructor(private creator: CreatorService) {}
  ngOnInit(): void { this.load(); }
  load(): void { this.loading=true; this.creator.getAnalytics(this.period,this.platform).subscribe({ next:r=>{ this.analytics=r.analytics||{}; this.form={...this.analytics}; this.loading=false; }, error:()=>this.loading=false }); }
  save(): void { this.saving=true; this.creator.updateAnalytics({...this.form,period:this.period,platform:this.platform}).subscribe({ next:r=>{ this.analytics=r.analytics; this.editMode=false; this.saving=false; this.showToast('Analytics saved!'); }, error:(e)=>{ this.saving=false; this.showToast(e.friendlyMessage||'Error','error'); } }); }
  showToast(msg: string, type: 'success'|'error'='success'): void { this.toast={show:true,msg,type}; setTimeout(()=>this.toast.show=false,3500); }
  fmt(n: number): string { return n>=1000000?(n/1000000).toFixed(1)+'M':n>=1000?(n/1000).toFixed(1)+'K':n?.toString()||'0'; }
}