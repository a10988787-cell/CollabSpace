// src/app/Creator/creator-dashboard/creator-dashboard.component.ts
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { CreatorService } from '../../services/creator.service';

import { CreatorOverviewComponent }      from '../creator-overview/creator-overview.component';
import { CreatorProfileComponent }       from '../creator-profile/creator-profile.component';
import { CreatorSocialComponent }        from '../creator-social/creator-social.component';
import { CreatorPortfolioComponent }     from '../creator-portfolio/creator-portfolio.component';
import { CreatorApplicationsComponent }  from '../creator-applications/creator-applications.component';
import { CreatorInvitationsComponent }   from '../creator-invitations/creator-invitations.component';
import { CreatorCollabPostsComponent }   from '../creator-collab-posts/creator-collab-posts.component';
import { CreatorContentComponent }       from '../creator-content/creator-content.component';
import { CreatorAiToolsComponent }       from '../creator-ai-tools/creator-ai-tools.component';
import { CreatorAnalyticsComponent }     from '../creator-analytics/creator-analytics.component';
import { CreatorAudienceComponent }      from '../creator-audience/creator-audience.component';
import { CreatorGrowthComponent }        from '../creator-growth/creator-growth.component';
import { CreatorRevenueComponent }       from '../creator-revenue/creator-revenue.component';
import { CreatorContractsComponent }     from '../creator-contracts/creator-contracts.component';
import { CreatorMessagesComponent }      from '../creator-messages/creator-messages.component';
import { CreatorNotificationsComponent } from '../creator-notifications/creator-notifications.component';

@Component({
  selector: 'app-creator-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    CreatorOverviewComponent, CreatorProfileComponent, CreatorSocialComponent,
    CreatorPortfolioComponent, CreatorApplicationsComponent, CreatorInvitationsComponent,
    CreatorCollabPostsComponent, CreatorContentComponent, CreatorAiToolsComponent,
    CreatorAnalyticsComponent, CreatorAudienceComponent, CreatorGrowthComponent,
    CreatorRevenueComponent, CreatorContractsComponent,
    CreatorMessagesComponent, CreatorNotificationsComponent,
  ],
  templateUrl: './creator-dashboard.component.html',
  styleUrls: ['./creator-dashboard.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class CreatorDashboardComponent implements OnInit {
  user: User | null = null;
  initials = 'CR';
  collapsed = false;
  activePage = 'overview';
  unreadNotifications = 0;
  pendingInvitations = 0;

  navItems = [
    { id:'overview',     label:'Overview',        icon:'grid',      section:'Main' },
    { id:'profile',      label:'My Profile',       icon:'user',      section:'Main' },
    { id:'social',       label:'Social Accounts',  icon:'share',     section:'Main' },
    { id:'portfolio',    label:'Portfolio',         icon:'briefcase', section:'Work' },
    { id:'applications', label:'Applications',      icon:'send',      section:'Work' },
    { id:'invitations',  label:'Invitations',       icon:'mail',      section:'Work', badge:'invitations' },
    { id:'collabposts',  label:'Collab Posts',      icon:'upload',    section:'Work' },
    { id:'content',      label:'Content Library',   icon:'folder',    section:'Content' },
    { id:'ai',           label:'AI Tools',          icon:'sparkles',  section:'Content' },
    { id:'analytics',    label:'Analytics',         icon:'chart',     section:'Insights' },
    { id:'audience',     label:'Audience',          icon:'users',     section:'Insights' },
    { id:'growth',       label:'Growth',            icon:'trending',  section:'Insights' },
    { id:'revenue',      label:'Revenue',           icon:'dollar',    section:'Finance' },
    { id:'contracts',    label:'Contracts',         icon:'document',  section:'Finance' },
    { id:'messages',     label:'Messages',          icon:'chat',      section:'Communication' },
    { id:'notifications',label:'Notifications',     icon:'bell',      section:'Communication', badge:'unread' },
  ];

  get sections(): string[] {
    const seen = new Set<string>(); const out: string[] = [];
    this.navItems.forEach(n => { if(!seen.has(n.section)){seen.add(n.section);out.push(n.section);} });
    return out;
  }
  itemsFor(s: string) { return this.navItems.filter(n => n.section === s); }
  badge(item: any): number {
    if(item.badge==='unread') return this.unreadNotifications;
    if(item.badge==='invitations') return this.pendingInvitations;
    return 0;
  }

  constructor(private auth: AuthService, private creator: CreatorService) {}

  ngOnInit(): void {
    this.user = this.auth.currentUser;
    if(this.user) this.initials = ((this.user.firstName?.[0]||'')+(this.user.lastName?.[0]||'')).toUpperCase();
    this.loadBadges();
  }

  loadBadges(): void {
    this.creator.getNotifications(true).subscribe({ next:r=>{ this.unreadNotifications=r.unreadCount; }, error:()=>{} });
    this.creator.getInvitations('pending').subscribe({ next:r=>{ this.pendingInvitations=r.invitations.length; }, error:()=>{} });
  }

  navigate(page: string): void {
    this.activePage = page;
    if(page==='notifications') this.unreadNotifications=0;
    if(page==='invitations') this.pendingInvitations=0;
  }

  logout(): void { this.auth.logout(); }
}