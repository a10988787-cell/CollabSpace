import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';

@Component({ selector:'app-creator-portfolio', standalone:true, imports:[CommonModule,FormsModule],
  templateUrl:'./creator-portfolio.component.html', styleUrls:['../creator-shared.css','./creator-portfolio.component.css'] })
export class CreatorPortfolioComponent implements OnInit {
  items: any[] = []; loading = true; saving = false; showModal = false; editingId: string|null = null;
  toast = { show:false, msg:'', type:'success' };
  form: any = { campaignTitle:'', mediaType:'image', platform:'Instagram', brandName:'', contentUrl:'', description:'', metrics:{ views:0, likes:0, comments:0 } };
  platforms = ['Instagram','YouTube','TikTok','Twitter','Twitch','Blog','Podcast','Other'];
  mediaTypes = ['image','video','reel','story','blog','podcast'];
  selectedFile: File|null = null; previewUrl = '';

  constructor(private creator: CreatorService) {}
  ngOnInit(): void { this.load(); }
  load(): void { this.loading=true; this.creator.getPortfolio().subscribe({ next:r=>{ this.items=r.items; this.loading=false; }, error:()=>this.loading=false }); }

  openAdd(): void { this.form={campaignTitle:'',mediaType:'image',platform:'Instagram',brandName:'',contentUrl:'',description:'',metrics:{views:0,likes:0,comments:0}}; this.editingId=null; this.previewUrl=''; this.showModal=true; }
  openEdit(item: any): void { this.form={...item,metrics:{...item.metrics}}; this.editingId=item._id; this.showModal=true; }

  onFile(e: any): void { const f=e.target.files[0]; if(!f) return; this.selectedFile=f; const r=new FileReader(); r.onload=(ev:any)=>this.previewUrl=ev.target.result; r.readAsDataURL(f); }

  save(): void {
    this.saving=true;
    if(this.editingId) {
      this.creator.updatePortfolioItem(this.editingId,this.form).subscribe({ next:()=>{ this.load(); this.showModal=false; this.saving=false; this.showToast('Updated!'); }, error:(e)=>{ this.saving=false; this.showToast(e.friendlyMessage||'Error','error'); } });
    } else {
      const fd=new FormData(); Object.keys(this.form).forEach(k=>{ if(k==='metrics') fd.append('metrics',JSON.stringify(this.form.metrics)); else fd.append(k,this.form[k]); }); if(this.selectedFile) fd.append('thumbnail',this.selectedFile);
      this.creator.addPortfolioItem(fd).subscribe({ next:()=>{ this.load(); this.showModal=false; this.saving=false; this.showToast('Added!'); }, error:(e)=>{ this.saving=false; this.showToast(e.friendlyMessage||'Error','error'); } });
    }
  }
  remove(id: string): void { this.creator.deletePortfolioItem(id).subscribe({ next:()=>{ this.load(); this.showToast('Removed.'); }, error:()=>this.showToast('Error','error') }); }
  showToast(msg: string, type: 'success'|'error'='success'): void { this.toast={show:true,msg,type}; setTimeout(()=>this.toast.show=false,3500); }
  formatNum(n: number): string { return n>=1000000?(n/1000000).toFixed(1)+'M':n>=1000?(n/1000).toFixed(1)+'K':n?.toString()||'0'; }
}