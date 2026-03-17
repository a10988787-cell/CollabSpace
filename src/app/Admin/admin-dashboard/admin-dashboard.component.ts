import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';
import { AdminUsersComponent } from '../admin-users/admin-users.component';
import { AdminCreatorsComponent } from '../admin-creators/admin-creators.component';
import { AdminBrandsComponent } from '../admin-brands/admin-brands.component';
import { AdminCampaignsComponent } from '../admin-campaigns/admin-campaigns.component';
import { AdminContentComponent } from '../admin-content/admin-content.component';
import { AdminAnalyticsComponent } from '../admin-analytics/admin-analytics.component';
import { AdminPaymentsComponent } from '../admin-payments/admin-payments.component';
import { AdminReportsComponent } from '../admin-reports/admin-reports.component';
import { AdminNotificationsComponent } from '../admin-notifications/admin-notifications.component';
import { AdminRolesComponent } from '../admin-roles/admin-roles.component';
import { AdminSettingsComponent } from '../admin-settings/admin-settings.component';
import { AdminCategoriesComponent } from '../admin-categories/admin-categories.component';
import { AdminAuditLogsComponent } from '../admin-audit-logs/admin-audit-logs.component';
import { AdminSubscriptionsComponent } from '../admin-subscriptions/admin-subscriptions.component';
import { AdminFeatureFlagsComponent } from '../admin-feature-flags/admin-feature-flags.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, AdminUsersComponent, AdminCreatorsComponent, AdminBrandsComponent, AdminCampaignsComponent, AdminContentComponent, AdminAnalyticsComponent, AdminPaymentsComponent, AdminReportsComponent, AdminNotificationsComponent, AdminRolesComponent, AdminSettingsComponent, AdminCategoriesComponent, AdminAuditLogsComponent, AdminSubscriptionsComponent, AdminFeatureFlagsComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class AdminDashboardComponent implements OnInit {
  user: User | null = null;
  initials = 'AD';
  collapsed = false;
  nav = 'overview';
  range = '6M';

  banStats = [
    { lbl:'Total Users',      val:'1,284', chg:'+8.2%', pos:true },
    { lbl:'Platform Revenue', val:'$284K', chg:'+18%',  pos:true },
    { lbl:'Active Campaigns', val:'47',    chg:'+12',   pos:true },
  ];

  kpis = [
    { label:'Total Users',       val:'1,284',  chg:'+8.2%', pos:true, ib:'rgba(251,113,133,.12)', ic:'#FB7185', spark:[30,45,38,60,50,72,62,80,70,85,75,95] },
    { label:'Platform Revenue',  val:'$28.4K', chg:'+18%',  pos:true, ib:'rgba(52,211,153,.12)',  ic:'#34D399', spark:[20,35,50,40,65,55,72,60,80,70,85,90] },
    { label:'Active Campaigns',  val:'47',      chg:'+12',   pos:true, ib:'rgba(251,191,36,.12)',  ic:'#FBBF24', spark:[40,55,45,68,58,75,65,80,72,85,78,95] },
    { label:'Brands Onboarded',  val:'138',     chg:'+5',    pos:true, ib:'rgba(139,92,246,.12)',  ic:'#A78BFA', spark:[25,40,35,55,45,62,52,70,60,75,68,82] },
  ];

  platformStats = [
    { label:'Creator Retention',  val:'87%',  pct:87, color:'#34D399', sub:'active this month'    },
    { label:'Campaign Success',   val:'92%',  pct:92, color:'#8B5CF6', sub:'completed on time'    },
    { label:'Brand Satisfaction', val:'4.8★', pct:96, color:'#FBBF24', sub:'average brand rating' },
  ];

  private bd = [45,62,52,78,68,84,72,90,80,94,86,100];
  private ld = [32,50,42,65,55,74,64,80,70,87,78,94];
  xlbl = ['Jan','Feb','Mar','Apr','May','Jun'].map((t,i) => ({ x:30+i*(570/5), t }));

  get bars() { const n=this.bd.length,s=570/(n-1),bw=28,b=165; return this.bd.map((v,i)=>{const h=(v/100)*120;return{x:30+i*s-bw/2,y:b-h,w:bw,h};}); }
  get dots() { return this.ld.map((v,i)=>({x:30+i*(570/(this.ld.length-1)),y:165-(v/100)*120})); }
  get linePath() { return this.dots.map((d,i)=>`${i===0?'M':'L'}${d.x},${d.y}`).join(' '); }
  get areaPath() { const d=this.dots; return `${this.linePath} L${d[d.length-1].x},165 L${d[0].x},165 Z`; }

  users = [
    { name:'Aria Chen',    email:'aria@example.com',    init:'AC', role:'creator', detail:'Instagram',     verified:true,  joined:'Today',      grad:'linear-gradient(135deg,#8B5CF6,#6D28D9)' },
    { name:'LuxeWear',     email:'brand@luxewear.com',  init:'LW', role:'brand',   detail:'LuxeWear Inc.', verified:true,  joined:'Yesterday',  grad:'linear-gradient(135deg,#FBBF24,#D97706)' },
    { name:'Marcus Webb',  email:'marcus@example.com',  init:'MW', role:'creator', detail:'YouTube',       verified:true,  joined:'2 days ago', grad:'linear-gradient(135deg,#38BDF8,#0EA5E9)' },
    { name:'Aura Health',  email:'hello@aura.com',      init:'AH', role:'brand',   detail:'Aura Health',   verified:false, joined:'3 days ago', grad:'linear-gradient(135deg,#34D399,#059669)' },
    { name:'Sofia Reyes',  email:'sofia@example.com',   init:'SR', role:'creator', detail:'TikTok',        verified:true,  joined:'4 days ago', grad:'linear-gradient(135deg,#FB7185,#E11D48)' },
    { name:'ByteGadget',   email:'hi@bytegadget.com',   init:'BG', role:'brand',   detail:'ByteGadget',    verified:true,  joined:'5 days ago', grad:'linear-gradient(135deg,#6EE7B7,#10B981)' },
    { name:'Jayden Park',  email:'jayden@example.com',  init:'JP', role:'creator', detail:'Instagram',     verified:false, joined:'1 week ago', grad:'linear-gradient(135deg,#FCD34D,#F59E0B)' },
  ];

  activity = [
    { type:'user',     msg:'New creator registered: Aria Chen',        time:'2 min ago',   ib:'rgba(251,113,133,.12)', ic:'#FB7185' },
    { type:'campaign', msg:'LuxeWear launched "Summer Vibes"',          time:'18 min ago',  ib:'rgba(251,191,36,.12)',  ic:'#FBBF24' },
    { type:'payment',  msg:'$2,400 payout processed to Marcus Webb',   time:'1h ago',      ib:'rgba(52,211,153,.12)',  ic:'#34D399' },
    { type:'report',   msg:'Monthly analytics report generated',        time:'3h ago',      ib:'rgba(139,92,246,.12)', ic:'#A78BFA' },
    { type:'user',     msg:'Brand account verified: Aura Health',      time:'5h ago',      ib:'rgba(56,189,248,.12)',  ic:'#38BDF8' },
    { type:'campaign', msg:'Adventure Gear Collab marked as complete', time:'Yesterday',   ib:'rgba(251,191,36,.12)',  ic:'#FBBF24' },
  ];

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.user = this.auth.currentUser;
    if (this.user) this.initials = ((this.user.firstName?.[0]||'')+(this.user.lastName?.[0]||'')).toUpperCase();
  }

  logout(): void { this.auth.logout(); }
}