import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-creator-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './creator-dashboard.component.html',
  styleUrls: ['./creator-dashboard.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class CreatorDashboardComponent implements OnInit {
  user: User | null = null;
  initials = 'CR';
  collapsed = false;
  nav = 'overview';
  range = '6M';
  pendingCount = 3;

  banStats = [
    { lbl:'Total Earned',   val:'$12.4K', chg:'+18%',  pos:true },
    { lbl:'Active Deals',   val:'4',       chg:'+2',    pos:true },
    { lbl:'Engagement',     val:'7.2%',    chg:'+1.1%', pos:true },
  ];

  kpis = [
    { key:'earnings',   label:'Total Earnings',   val:'$12,400', chg:'+18%',  pos:true,  ib:'rgba(139,92,246,.12)', ic:'#A78BFA', spark:[30,55,40,70,50,80,65,90,75,95,85,100] },
    { key:'campaigns',  label:'Active Campaigns', val:'4',        chg:'+2',    pos:true,  ib:'rgba(251,191,36,.12)', ic:'#FBBF24', spark:[20,35,50,40,65,55,72,60,80,70,85,90]  },
    { key:'followers',  label:'Total Followers',  val:'842K',     chg:'+5.4%', pos:true,  ib:'rgba(52,211,153,.12)', ic:'#34D399', spark:[40,55,45,68,58,75,65,80,72,85,78,95]  },
    { key:'engagement', label:'Engagement Rate',  val:'7.2%',     chg:'+1.1%', pos:true,  ib:'rgba(56,189,248,.12)', ic:'#38BDF8', spark:[25,40,35,55,45,62,52,70,60,75,68,82]  },
  ];

  private bd = [38,52,44,68,58,78,65,82,72,88,80,95];
  private ld = [28,44,36,58,48,68,55,74,62,80,70,88];
  xlbl = ['Jan','Feb','Mar','Apr','May','Jun'].map((t,i) => ({ x:30+i*(570/5), t }));

  get bars() { const n=this.bd.length,s=570/(n-1),bw=28,b=165; return this.bd.map((v,i)=>{ const h=(v/100)*120; return{x:30+i*s-bw/2,y:b-h,w:bw,h}; }); }
  get dots() { return this.ld.map((v,i)=>({x:30+i*(570/(this.ld.length-1)),y:165-(v/100)*120})); }
  get linePath() { return this.dots.map((d,i)=>`${i===0?'M':'L'}${d.x},${d.y}`).join(' '); }
  get areaPath() { const d=this.dots; return `${this.linePath} L${d[d.length-1].x},165 L${d[0].x},165 Z`; }

  camps = [
    { name:'Summer Vibes Collection', brand:'LuxeWear',   niche:'Fashion', budget:12000, status:'active',  deadline:'Jun 30', slots:3, pct:75, type:'Video', grad:'linear-gradient(135deg,#8B5CF6,#6D28D9)' },
    { name:'Tech Unboxing Series',    brand:'Nexagen',    niche:'Tech',    budget:8500,  status:'active',  deadline:'Jul 15', slots:2, pct:40, type:'Reel',  grad:'linear-gradient(135deg,#38BDF8,#0EA5E9)' },
    { name:'Wellness Challenge',      brand:'Aura Health',niche:'Health',  budget:9500,  status:'pending', deadline:'Jul 5',  slots:5, pct:20, type:'Story', grad:'linear-gradient(135deg,#34D399,#059669)' },
  ];

  content = [
    { title:'Summer Lookbook 2024', type:'video', views:'284K', likes:'18K', grad:'linear-gradient(135deg,#1E0A4A,#3B1FA8)' },
    { title:'Morning Routine GRWM', type:'reel',  views:'1.2M', likes:'94K', grad:'linear-gradient(135deg,#0A1520,#0E3460)' },
    { title:'Tech Setup Tour',      type:'video', views:'567K', likes:'32K', grad:'linear-gradient(135deg,#0A2020,#0D4040)' },
    { title:'Glow Skincare Review', type:'photo', views:'89K',  likes:'7K',  grad:'linear-gradient(135deg,#2A0A20,#6D1042)' },
  ];

  notifs = [
    { type:'campaign', msg:'LuxeWear approved your application!',   time:'2m ago',    read:false, ib:'rgba(139,92,246,.12)', ic:'#A78BFA' },
    { type:'payment',  msg:'$2,400 payment received from Nexagen.', time:'1h ago',    read:false, ib:'rgba(52,211,153,.12)',  ic:'#34D399' },
    { type:'follower', msg:'You gained 1,200 new followers today.',  time:'3h ago',    read:true,  ib:'rgba(56,189,248,.12)',  ic:'#38BDF8' },
    { type:'message',  msg:'New message from Aura Health team.',     time:'Yesterday', read:true,  ib:'rgba(251,191,36,.12)',  ic:'#FBBF24' },
  ];

  get unread() { return this.notifs.filter(n=>!n.read).length; }

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.user = this.auth.currentUser;
    if (this.user) this.initials = ((this.user.firstName?.[0]||'')+(this.user.lastName?.[0]||'')).toUpperCase();
  }

  logout(): void { this.auth.logout(); }
}