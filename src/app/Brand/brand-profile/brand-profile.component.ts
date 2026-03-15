import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-brand-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-profile.component.html',
  styleUrls: ['./brand-profile.component.css'],
  encapsulation: ViewEncapsulation.None,

})
export class BrandProfileComponent implements OnInit {
  profile: any = { brandName:'', industry:'', logo:'', website:'', description:'', contactName:'', contactEmail:'', contactPhone:'', socialLinks:{ instagram:'', youtube:'', tiktok:'', twitter:'' } };
  loading = true; saving = false;
  toast: any = null; private tt: any;
  createdAt = '';
  industries = ['Fashion','Tech','Fitness','Beauty','Food','Travel','Gaming','Finance','Health','Education','Entertainment','Outdoor','Other'];
  get initials() { return (this.profile.brandName||'B').split(' ').map((w:string)=>w[0]).slice(0,2).join('').toUpperCase(); }

  constructor(private svc: BrandService) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.svc.getProfile().subscribe({
      next: r => {
        if (r.profile) {
          this.profile = { ...r.profile, socialLinks: r.profile.socialLinks || { instagram:'',youtube:'',tiktok:'',twitter:'' } };
          if (r.profile.createdAt) this.createdAt = new Date(r.profile.createdAt).toLocaleDateString('en-US',{month:'short',year:'numeric'});
        }
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  save() {
    this.saving = true;
    this.svc.updateProfile(this.profile).subscribe({
      next: r => { this.profile = { ...r.profile, socialLinks: r.profile.socialLinks || {} }; this.saving = false; this.showToast('Profile saved successfully!','ok'); },
      error: e => { this.saving = false; this.showToast(e?.error?.message||'Failed to save.','err'); }
    });
  }

  showToast(msg: string, type: 'ok'|'err') {
    clearTimeout(this.tt); this.toast = { msg, type };
    this.tt = setTimeout(() => this.toast = null, 3200);
  }
}