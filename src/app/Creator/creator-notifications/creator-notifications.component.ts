import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';

@Component({
  selector: 'app-creator-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creator-notifications.component.html',
  styleUrls: ['../creator-shared.css', './creator-notifications.component.css'],
})
export class CreatorNotificationsComponent implements OnInit {
  notifications: any[] = [];
  loading = true;
  unreadCount = 0;
  showUnreadOnly = false;
  toast = { show: false, msg: '', type: 'success' };

  // Notification type → fixed color (no regex in template)
  typeColors: Record<string, string> = {
    payment:          '#34D399',
    campaign_invite:  '#A78BFA',
    content_approved: '#34D399',
    content_revision: '#FB7185',
    message:          '#38BDF8',
    system:           '#9896BC',
    collab_update:    '#FBBF24',
    application_update: '#38BDF8',
  };

  typeIconBg(type: string): string {
    const hex = this.typeColors[type] || '#9896BC';
    // convert #RRGGBB → rgba(r,g,b,.12)
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},.12)`;
  }

  typeIconColor(type: string): string {
    return this.typeColors[type] || '#9896BC';
  }

  constructor(private creator: CreatorService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.creator.getNotifications(this.showUnreadOnly).subscribe({
      next: r => {
        this.notifications = r.notifications;
        this.unreadCount   = r.unreadCount;
        this.loading       = false;
      },
      error: () => { this.loading = false; },
    });
  }

  markRead(id: string): void {
    this.creator.markNotificationRead(id).subscribe({ next: () => this.load(), error: () => {} });
  }

  markAll(): void {
    this.creator.markAllRead().subscribe({
      next: () => { this.load(); this.showToast('All marked as read.'); },
      error: () => {},
    });
  }

  remove(id: string, event: Event): void {
    event.stopPropagation();
    this.creator.deleteNotification(id).subscribe({ next: () => this.load(), error: () => {} });
  }

  showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toast = { show: true, msg, type };
    setTimeout(() => this.toast.show = false, 3500);
  }

  timeAgo(d: string): string {
    if (!d) return '';
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 60)  return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24)  return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }
}