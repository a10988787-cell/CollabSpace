import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';

@Component({ selector:'app-creator-collab-posts', standalone:true, imports:[CommonModule,FormsModule],
  templateUrl:'./creator-collab-posts.component.html', styleUrls:['../creator-shared.css','./creator-collab-posts.component.css'] })
export class CreatorCollabPostsComponent implements OnInit {
  posts: any[] = []; collabs: any[] = []; loading = true; saving = false; showModal = false; editingId: string|null = null;
  toast = { show:false, msg:'', type:'success' };
  form: any = { collaborationId:'', title:'', caption:'', contentType:'text', hashtags:'', platform:'Instagram' };
  platforms = ['Instagram','YouTube','TikTok','Twitter','Twitch','Blog','Podcast','Other'];
  contentTypes = ['text','image','video'];
  selectedFiles: File[] = []; previews: string[] = [];

  constructor(private creator: CreatorService) {}
  ngOnInit(): void { this.load(); }
  load(): void { this.loading=true; this.creator.getCollabPosts().subscribe({ next:r=>{ this.posts=r.posts; this.loading=false; }, error:()=>this.loading=false }); }

  openNew(): void { this.form={collaborationId:'',title:'',caption:'',contentType:'text',hashtags:'',platform:'Instagram'}; this.editingId=null; this.selectedFiles=[]; this.previews=[]; this.showModal=true; }
  openEdit(p: any): void { this.form={collaborationId:p.collaboration?._id||'',title:p.title,caption:p.caption,contentType:p.contentType,hashtags:p.hashtags?.join(', ')||'',platform:p.platform}; this.editingId=p._id; this.showModal=true; }

  onFiles(e: any): void {
    this.selectedFiles = Array.from(e.target.files);
    this.previews = [];
    this.selectedFiles.forEach(f=>{ const r=new FileReader(); r.onload=(ev:any)=>this.previews.push(ev.target.result); r.readAsDataURL(f); });
  }

  save(): void {
    this.saving=true;
    const fd = new FormData();
    Object.keys(this.form).forEach(k=>fd.append(k,this.form[k]));
    this.selectedFiles.forEach(f=>fd.append('media',f));
    const obs = this.editingId ? this.creator.updateCollabPost(this.editingId,{...this.form,hashtags:this.form.hashtags.split(',').map((h:string)=>h.trim())}) : this.creator.createCollabPost(fd);
    obs.subscribe({ next:()=>{ this.load(); this.showModal=false; this.saving=false; this.showToast('Post saved!'); }, error:(e)=>{ this.saving=false; this.showToast(e.friendlyMessage||'Error','error'); } });
  }

  submit(id: string): void { if(!confirm('Submit this post to the brand for review?')) return; this.creator.submitCollabPost(id).subscribe({ next:()=>{ this.load(); this.showToast('Post submitted for review!'); }, error:(e)=>this.showToast(e.friendlyMessage||'Error','error') }); }
  delete(id: string): void { if(!confirm('Delete this draft?')) return; this.creator.deleteCollabPost(id).subscribe({ next:()=>{ this.load(); this.showToast('Post deleted.'); }, error:()=>this.showToast('Error','error') }); }
  showToast(msg: string, type: 'success'|'error'='success'): void { this.toast={show:true,msg,type}; setTimeout(()=>this.toast.show=false,3500); }
  statusPill(s: string): string { const m:any={draft:'gray',submitted:'sky',approved:'jade',paid:'acc',rejected:'rose',revision_requested:'amber'}; return 'pill-'+(m[s]||'gray'); }
}