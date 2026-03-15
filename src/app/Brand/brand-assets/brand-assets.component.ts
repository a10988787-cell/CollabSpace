import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-brand-assets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-assets.component.html',
  styleUrls: ['./brand-assets.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandAssetsComponent implements OnInit {
  assets: any[] = [];
  loading = true; saving = false; modal = false; editing: any = null;
  typeFilter = 'all'; search = '';
  typeFilters = ['all','logo','guideline','product_image','promo_video','other'];
  form: any = { name:'', type:'other', url:'', mimeType:'' };
  toast: any = null; private tt: any;

  get filtered() {
    let list = this.assets;
    if (this.typeFilter!=='all') list=list.filter(a=>a.type===this.typeFilter);
    if (this.search) list=list.filter(a=>a.name.toLowerCase().includes(this.search.toLowerCase()));
    return list;
  }
  getIcon(t: string) { return ({logo:'🏷️',guideline:'📋',product_image:'🖼️',promo_video:'🎬',other:'📁'})[t]||'📁'; }
  getIconBg(t: string) { return ({logo:'rgba(251,191,36,.12)',guideline:'rgba(139,92,246,.12)',product_image:'rgba(56,189,248,.12)',promo_video:'rgba(52,211,153,.12)',other:'rgba(148,163,184,.08)'})[t]||'rgba(148,163,184,.08)'; }

  constructor(private svc: BrandService) {}
  ngOnInit() { this.load(); }
  load() { this.loading=true; this.svc.getAssets().subscribe({ next:r=>{ this.assets=r.assets||[];this.loading=false; }, error:()=>this.loading=false }); }
  openModal(a?: any) { this.editing=a||null; this.form=a?{...a}:{name:'',type:'other',url:'',mimeType:''}; this.modal=true; }
  save() {
    if (!this.form.name||!this.form.url) return this.showToast('Name and URL required.','err');
    this.saving=true;
    const req=this.editing?this.svc.updateAsset(this.editing._id,this.form):this.svc.createAsset(this.form);
    req.subscribe({ next:()=>{ this.modal=false;this.saving=false;this.load();this.showToast(this.editing?'Asset updated!':'Asset uploaded!'); }, error:e=>{ this.saving=false;this.showToast(e?.error?.message||'Failed.','err'); } });
  }
  delete(a: any) { if (!confirm(`Remove "${a.name}"?`)) return; this.svc.deleteAsset(a._id).subscribe({ next:()=>{ this.load();this.showToast('Asset removed.'); }, error:()=>this.showToast('Failed.','err') }); }
  showToast(msg: string, type: 'ok'|'err'='ok') { clearTimeout(this.tt);this.toast={msg,type};this.tt=setTimeout(()=>this.toast=null,3200); }
  getIconBgClass(type: string) {
  switch (type) {
    case 'image':
      return 'bg-blue-500';
    case 'video':
      return 'bg-red-500';
    case 'document':
      return 'bg-green-500';
    default:
      return 'bg-gray-400';
  }
}
}