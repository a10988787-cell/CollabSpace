// src/app/Creator/creator-overview/creator-overview.component.ts
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreatorService } from '../../services/creator.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-creator-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './creator-overview.component.html',
  styleUrls: ['../creator-shared.css','./creator-overview.component.css'],
})
export class CreatorOverviewComponent implements OnInit {
  @Output() navigate = new EventEmitter<string>();
  user: any = null;
  loading = true;
  recentInvitations: any[] = [];
  recentApplications: any[] = [];
  recentPosts: any[] = [];
  recentNotifications: any[] = [];

  kpis = [
    { label:'Total Earned',   val:'$0',  chg:'+0%', pos:true, ic:'#A78BFA', ib:'rgba(139,92,246,.12)', nav:'revenue',      icon:'dollar' },
    { label:'Active Collabs', val:'0',   chg:'+0',  pos:true, ic:'#FBBF24', ib:'rgba(251,191,36,.12)', nav:'applications', icon:'collab' },
    { label:'Followers',      val:'0',   chg:'+0%', pos:true, ic:'#34D399', ib:'rgba(52,211,153,.12)', nav:'analytics',    icon:'users'  },
    { label:'Engagement',     val:'0%',  chg:'+0%', pos:true, ic:'#38BDF8', ib:'rgba(56,189,248,.12)', nav:'analytics',    icon:'chart'  },
  ];

  quickLinks = [
    { label:'Browse Campaigns',nav:'applications',icon:'search',  color:'#A78BFA'},
    { label:'Upload Content',  nav:'content',     icon:'upload',  color:'#34D399'},
    { label:'Invitations',     nav:'invitations', icon:'mail',    color:'#FBBF24'},
    { label:'Check Revenue',   nav:'revenue',     icon:'dollar',  color:'#38BDF8'},
    { label:'AI Tools',        nav:'ai',          icon:'sparkles',color:'#FB7185'},
    { label:'Messages',        nav:'messages',    icon:'chat',    color:'#6EE7B7'},
  ];

  constructor(private creator: CreatorService, private auth: AuthService) {}

  ngOnInit(): void {
    this.user = this.auth.currentUser;
    this.creator.getRevenue().subscribe({ next: r => { this.kpis[0].val = '$'+r.totalReceived.toLocaleString(); }, error: ()=>{} });
    this.creator.getApplications('accepted').subscribe({ next: r => { this.kpis[1].val = r.applications.length.toString(); this.recentApplications = r.applications.slice(0,4); }, error: ()=>{} });
    this.creator.getAnalytics().subscribe({ next: r => { if(r.analytics){ this.kpis[2].val = r.analytics.followers >= 1000 ? (r.analytics.followers/1000).toFixed(1)+'K' : r.analytics.followers.toString(); this.kpis[3].val = r.analytics.engagementRate.toFixed(1)+'%'; } }, error: ()=>{} });
    this.creator.getInvitations('pending').subscribe({ next: r => { this.recentInvitations = r.invitations.slice(0,3); }, error: ()=>{} });
    this.creator.getNotifications(true).subscribe({ next: r => { this.recentNotifications = r.notifications.slice(0,5); }, error: ()=>{} });
    this.creator.getCollabPosts().subscribe({ next: r => { this.recentPosts = r.posts.slice(0,3); this.loading = false; }, error: ()=>{ this.loading = false; } });
  }

  go(nav: string): void { this.navigate.emit(nav); }

  timeAgo(date: string): string {
    if(!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff/60000);
    if(m<60) return m+'m ago';
    const h = Math.floor(m/60);
    if(h<24) return h+'h ago';
    return Math.floor(h/24)+'d ago';
  }

  hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  }
}