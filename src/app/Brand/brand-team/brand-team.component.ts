import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-brand-team',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-team.component.html',
  styleUrls: ['./brand-team.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandTeamComponent implements OnInit {
  team: any[] = []; loading = true; saving = false; modal = false; editing: any = null;
  form: any = { name:'', email:'', role:'Marketing Manager', phone:'' };
  roles = ['Marketing Manager','Campaign Manager','Content Strategist','Finance','Other'];
  toast: any = null; private tt: any;
  initials(n: string) { return n.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }
  constructor(private svc: BrandService) {}
  ngOnInit() { this.load(); }
  load() { this.loading=true; this.svc.getTeam().subscribe({ next:r=>{ this.team=r.team||[];this.loading=false; }, error:()=>this.loading=false }); }
  openModal(m?: any) { this.editing=m||null; this.form=m?{...m}:{name:'',email:'',role:'Marketing Manager',phone:''}; this.modal=true; }
  save() {
    if (!this.form.name||!this.form.email) return this.showToast('Name and email required.','err');
    this.saving=true;
    const req=this.editing?this.svc.updateTeamMember(this.editing._id,this.form):this.svc.addTeamMember(this.form);
    req.subscribe({ next:()=>{ this.modal=false;this.saving=false;this.load();this.showToast(this.editing?'Member updated!':'Member added!'); }, error:e=>{ this.saving=false;this.showToast(e?.error?.message||'Failed.','err'); } });
  }
  remove(m: any) { if (!confirm(`Remove ${m.name}?`)) return; this.svc.removeTeamMember(m._id).subscribe({ next:()=>{ this.load();this.showToast('Member removed.'); }, error:()=>this.showToast('Failed.','err') }); }
  showToast(msg: string, type: 'ok'|'err'='ok') { clearTimeout(this.tt);this.toast={msg,type};this.tt=setTimeout(()=>this.toast=null,3200); }
}