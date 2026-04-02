import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';
import { environment } from '../../environment';

// Prefix relative /uploads/... paths with backend host
function mediaUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  const base = environment.apiUrl.replace('/api', '');   // e.g. http://localhost:5000
  return base + (url.startsWith('/') ? url : '/' + url);
}

@Component({ selector:'app-creator-content', standalone:true, imports:[CommonModule,FormsModule],
  templateUrl:'./creator-content.component.html', styleUrls:['../creator-shared.css','./creator-content.component.css'] })
export class CreatorContentComponent implements OnInit {
  files: any[] = []; loading = true; saving = false; filterType = ''; editingId: string|null = null;
  toast = { show:false, msg:'', type:'success' };
  showUploadModal = false; showEditModal = false;
  uploadForm: any = { fileName:'', fileType:'image', caption:'', hashtags:'' };
  editForm: any = { fileName:'', caption:'', hashtags:'' };
  selectedFile: File|null = null;
  fileTypes = ['image','video','reel','story','audio','document'];

  constructor(private creator: CreatorService) {}
  ngOnInit(): void { this.load(); }
  load(): void { this.loading=true; this.creator.getContentLibrary(this.filterType||undefined).subscribe({ next:r=>{ this.files=r.files; this.loading=false; }, error:()=>this.loading=false }); }


  upload(): void {
    if(!this.selectedFile) return this.showToast('Select a file first','error');
    this.saving=true;
    const fd=new FormData(); fd.append('file',this.selectedFile);
    Object.keys(this.uploadForm).forEach(k=>fd.append(k,this.uploadForm[k]));
    this.creator.uploadContent(fd).subscribe({ next:()=>{ this.load(); this.showUploadModal=false; this.saving=false; this.showToast('Uploaded!'); }, error:(e)=>{ this.saving=false; this.showToast(e.friendlyMessage||'Error','error'); } });
  }

  openEdit(f: any): void { this.editingId=f._id; this.editForm={fileName:f.fileName,caption:f.caption||'',hashtags:f.hashtags?.join(', ')||''}; this.showEditModal=true; }
  saveEdit(): void { this.saving=true; this.creator.updateContent(this.editingId!,{...this.editForm,hashtags:this.editForm.hashtags.split(',').map((h:string)=>h.trim())}).subscribe({ next:()=>{ this.load(); this.showEditModal=false; this.saving=false; this.showToast('Updated!'); }, error:(e)=>{ this.saving=false; this.showToast(e.friendlyMessage||'Error','error'); } }); }
  remove(id: string): void { if(!confirm('Remove this file?')) return; this.creator.deleteContent(id).subscribe({ next:()=>{ this.load(); this.showToast('Removed.'); }, error:()=>this.showToast('Error','error') }); }
  showToast(msg: string, type: 'success'|'error'='success'): void { this.toast={show:true,msg,type}; setTimeout(()=>this.toast.show=false,3500); }
  typeIcon(t: string): string { const m:any={image:'📷',video:'🎬',reel:'🎞️',story:'⭕',audio:'🎵',document:'📄'}; return m[t]||'📁'; }
  formatSize(bytes: number): string { return bytes>1048576?(bytes/1048576).toFixed(1)+' MB':bytes>1024?(bytes/1024).toFixed(1)+' KB':bytes+' B'; }

  /** Always returns a fully-qualified URL the browser can load */
  getMediaUrl(url: string): string { return mediaUrl(url); }

  /** Generate a local object URL for instant preview before upload */
  previewUrl: string = '';
  onFile(e: any): void {
    const f = e.target.files[0]; if (!f) return;
    this.selectedFile = f;
    this.uploadForm.fileName = f.name;
    this.uploadForm.fileType = f.type.startsWith('video') ? 'video' : f.type.startsWith('audio') ? 'audio' : 'image';
    // Create local preview URL
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = URL.createObjectURL(f);
  }
}