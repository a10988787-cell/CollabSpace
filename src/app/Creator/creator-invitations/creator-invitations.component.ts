import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';

@Component({ selector:'app-creator-invitations', standalone:true, imports:[CommonModule,FormsModule],
  templateUrl:'./creator-invitations.component.html', styleUrls:['../creator-shared.css','./creator-invitations.component.css'] })
export class CreatorInvitationsComponent implements OnInit {
  invitations: any[] = []; loading = true; saving = false; filterStatus = 'pending';
  toast = { show:false, msg:'', type:'success' };
  showModal = false; selectedInv: any = null; responseMsg = '';

  constructor(private creator: CreatorService) {}
  ngOnInit(): void { this.load(); }
  load(): void { this.loading=true; this.creator.getInvitations(this.filterStatus||undefined).subscribe({ next:r=>{ this.invitations=r.invitations; this.loading=false; }, error:()=>this.loading=false }); }

  openRespond(inv: any): void { this.selectedInv=inv; this.responseMsg=''; this.showModal=true; }

  respond(action: 'accept'|'reject'): void {
    if(!this.selectedInv) return;
    this.saving=true;
    this.creator.respondToInvitation(this.selectedInv._id, action, this.responseMsg).subscribe({
      next:()=>{ this.load(); this.showModal=false; this.saving=false; this.showToast(action==='accept'?'Invitation accepted! 🎉':'Invitation declined.'); },
      error:(e)=>{ this.saving=false; this.showToast(e.friendlyMessage||'Error','error'); }
    });
  }

  remove(id: string): void { this.creator.deleteInvitation(id).subscribe({ next:()=>{ this.load(); this.showToast('Removed.'); }, error:()=>{} }); }
  showToast(msg: string, type: 'success'|'error'='success'): void { this.toast={show:true,msg,type}; setTimeout(()=>this.toast.show=false,3500); }
  statusPill(s: string): string { const m:any={pending:'amber',accepted:'jade',rejected:'rose',expired:'gray'}; return 'pill-'+(m[s]||'gray'); }
}