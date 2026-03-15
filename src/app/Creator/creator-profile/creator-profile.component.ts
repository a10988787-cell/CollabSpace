import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';

@Component({ selector:'app-creator-profile', standalone:true, imports:[CommonModule,FormsModule],
  templateUrl:'./creator-profile.component.html', styleUrls:['../creator-shared.css','./creator-profile.component.css'] })
export class CreatorProfileComponent implements OnInit {
  profile: any = null; loading = true; saving = false; editMode = false;
  toast = { show:false, msg:'', type:'success' };
  form: any = { username:'', bio:'', niche:'Other', country:'', contactInfo:{ phone:'', website:'', linkedin:'' } };
  niches = ['Fashion','Beauty','Tech','Gaming','Food','Travel','Fitness','Lifestyle','Music','Education','Comedy','Other'];
  countries = ['India','United States','United Kingdom','Canada','Australia','Germany','France','Japan','Brazil','Other'];
  selectedFile: File | null = null; previewUrl = '';

  constructor(private creator: CreatorService) {}
  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.creator.getProfile().subscribe({ next: r => { this.profile = r.profile; this.form = { username: r.profile.username||'', bio: r.profile.bio||'', niche: r.profile.niche||'Other', country: r.profile.country||'', contactInfo: { phone: r.profile.contactInfo?.phone||'', website: r.profile.contactInfo?.website||'', linkedin: r.profile.contactInfo?.linkedin||'' } }; this.loading = false; }, error: () => { this.loading = false; } });
  }

  onFileChange(e: any): void {
    const f = e.target.files[0]; if(!f) return;
    this.selectedFile = f;
    const reader = new FileReader(); reader.onload = (ev: any) => this.previewUrl = ev.target.result; reader.readAsDataURL(f);
  }

  save(): void {
    this.saving = true;
    const fd = new FormData();
    Object.keys(this.form).forEach(k => { if(k === 'contactInfo') fd.append('contactInfo', JSON.stringify(this.form.contactInfo)); else fd.append(k, this.form[k]); });
    if(this.selectedFile) fd.append('avatar', this.selectedFile);
    this.creator.updateProfile(fd).subscribe({ next: r => { this.profile = r.profile; this.saving = false; this.editMode = false; this.showToast('Profile updated!'); }, error: (e) => { this.saving = false; this.showToast(e.friendlyMessage||'Error saving profile','error'); } });
  }

  showToast(msg: string, type: 'success'|'error' = 'success'): void { this.toast = { show:true, msg, type }; setTimeout(()=>this.toast.show=false,3500); }
}