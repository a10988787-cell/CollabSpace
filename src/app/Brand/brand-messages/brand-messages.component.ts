// src/app/Brand/brand-messages/brand-messages.component.ts
import {
  Component, OnInit, OnDestroy, AfterViewChecked,
  ElementRef, ViewChild, Inject, PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { BrandService } from '../../services/brand.service';
import { AuthService }  from '../../services/auth.service';
import { environment }  from '../../environment';

@Component({
  selector: 'app-brand-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-messages.component.html',
  styleUrls: ['../../Creator/creator-shared.css'],
})
export class BrandMessagesComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('msgList') msgList!: ElementRef;

  conversations: any[] = [];
  messages:      any[] = [];
  activeConvo:   any   = null;
  loading        = true;
  loadingMsgs    = false;
  sending        = false;
  newMessage     = '';
  currentUserId  = '';
  typingUser     = '';

  private socket:       any;
  private pollTimer:    any;
  private typingTimer:  any;
  private shouldScroll  = false;
  private isBrowser:    boolean;

  toast = { show: false, msg: '', type: 'success' };

  constructor(
    private svc:  BrandService,
    private auth: AuthService,
    @Inject(PLATFORM_ID) pid: object,
  ) { this.isBrowser = isPlatformBrowser(pid); }

  ngOnInit(): void {
    this.currentUserId = this.auth.currentUser?.id || this.auth.currentUser?._id || '';
    this.loadConversations();
    if (this.isBrowser) this.initSocket();
  }

  ngOnDestroy(): void {
    if (this.socket) { this.socket.disconnect(); this.socket = null; }
    clearInterval(this.pollTimer);
    clearTimeout(this.typingTimer);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
  }

  /* ── Socket.IO ──────────────────────────────────────────────────── */
  private initSocket(): void {
    try {
      const { io } = require('socket.io-client');
      const token   = localStorage.getItem('cs_token') || '';
      this.socket   = io(environment.apiUrl.replace('/api', ''), {
        auth: { token }, transports: ['websocket', 'polling'],
        reconnection: true, reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        if (this.activeConvo)
          this.socket.emit('join:thread', this.threadId(this.activeConvo.participant?._id));
      });

      this.socket.on('message:new', (msg: any) => {
        if (!this.activeConvo) return;
        const tid = this.threadId(this.activeConvo.participant?._id);
        if (msg.threadId === tid) {
          if (!this.messages.find(m => m._id === msg._id)) {
            this.messages.push(msg);
            this.shouldScroll = true;
          }
          this.socket.emit('messages:read', { threadId: tid });
        }
        this.loadConversations(false);
      });

      this.socket.on('message:sent', ({ tempId, message }: any) => {
        const idx = this.messages.findIndex(m => m._id === tempId);
        if (idx !== -1) this.messages[idx] = { ...message, _pending: false };
      });

      this.socket.on('typing:start', (data: any) => {
        if (data.userId !== this.currentUserId) {
          this.typingUser = data.name;
          clearTimeout(this.typingTimer);
          this.typingTimer = setTimeout(() => this.typingUser = '', 3000);
        }
      });
      this.socket.on('typing:stop', () => { this.typingUser = ''; });

      // Real-time alert when creator signs a contract
      this.socket.on('contract:signed', (data: any) => {
        this.showToast(`✍️ ${data.creatorName} signed "${data.title}"!`, 'success');
      });

      this.socket.on('connect_error', () => this.startPolling());
    } catch (_) {
      this.startPolling();
    }
  }

  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      if (this.activeConvo) this.loadMessages(this.activeConvo.participant?._id, false);
    }, 5000);
  }

  loadConversations(showLoading = true): void {
    if (showLoading) this.loading = true;
    this.svc.getConversations().subscribe({
      next: (r: any) => {
        this.conversations = r.conversations || [];
        this.loading = false;
        if (!this.activeConvo && this.conversations.length)
          this.selectConvo(this.conversations[0]);
      },
      error: () => { this.loading = false; },
    });
  }

  selectConvo(convo: any): void {
    this.activeConvo = convo;
    const otherId = convo.participant?._id;
    if (otherId) {
      this.loadMessages(otherId);
      this.socket?.emit('join:thread', this.threadId(otherId));
    }
  }

  loadMessages(userId: string, showLoading = true): void {
    if (showLoading) this.loadingMsgs = true;
    this.svc.getMessages(userId).subscribe({
      next: (r: any) => {
        this.messages     = r.messages || [];
        this.loadingMsgs  = false;
        this.shouldScroll = true;
        if (this.activeConvo) this.activeConvo.unreadCount = 0;
      },
      error: () => { this.loadingMsgs = false; },
    });
  }

  send(): void {
    const content = this.newMessage.trim();
    if (!content || !this.activeConvo || this.sending) return;

    const receiverId = this.activeConvo.participant?._id;
    if (!receiverId) return;

    const threadId = this.threadId(receiverId);
    this.newMessage = '';
    this.sending    = true;

    const tempId     = `temp_${Date.now()}`;
    const optimistic = {
      _id: tempId, sender: { _id: this.currentUserId },
      content, threadId, createdAt: new Date().toISOString(),
      isRead: false, _pending: true,
    };
    this.messages.push(optimistic);
    this.shouldScroll = true;

    if (this.socket?.connected) {
      this.socket.emit('message:send', { receiverId, content, threadId, tempId });
      this.sending = false;
    } else {
      this.svc.sendMessage({ receiverId, content }).subscribe({
        next: (r: any) => {
          this.sending = false;
          const idx = this.messages.findIndex(m => m._id === tempId);
          if (idx !== -1) this.messages[idx] = { ...r.message, _pending: false };
          this.loadConversations(false);
        },
        error: () => {
          this.sending = false;
          this.messages = this.messages.filter(m => m._id !== tempId);
          this.showToast('Message failed to send', 'error');
        },
      });
    }
  }

  onTyping(): void {
    if (!this.socket?.connected || !this.activeConvo) return;
    const receiverId = this.activeConvo.participant?._id;
    this.socket.emit('typing:start', { receiverId, threadId: this.threadId(receiverId) });
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      this.socket?.emit('typing:stop', { receiverId, threadId: this.threadId(receiverId) });
    }, 1500);
  }

  onEnter(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }

  private threadId(otherId: string): string {
    return [this.currentUserId, otherId].sort().join('_');
  }

  isOwn(msg: any): boolean {
    return (msg.sender?._id || msg.sender)?.toString() === this.currentUserId;
  }

  participantName(convo: any): string {
    const p = convo?.participant;
    if (!p) return 'Unknown';
    return p.companyName || `${p.firstName || ''} ${p.lastName || ''}`.trim();
  }

  participantInitial(convo: any): string {
    const n = this.participantName(convo);
    return n ? n[0].toUpperCase() : '?';
  }

  timeAgo(d: string): string {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const m    = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  formatTime(d: string): string {
    if (!d) return '';
    const dt  = new Date(d);
    const now = new Date();
    if (dt.toDateString() === now.toDateString())
      return dt.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
    return dt.toLocaleDateString('en', { month: 'short', day: 'numeric' }) + ' ' +
           dt.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    try {
      if (this.msgList?.nativeElement)
        this.msgList.nativeElement.scrollTop = this.msgList.nativeElement.scrollHeight;
    } catch (_) {}
  }

  showToast(msg: string, type = 'success'): void {
    this.toast = { show: true, msg, type };
    setTimeout(() => this.toast.show = false, 4000);
  }
}