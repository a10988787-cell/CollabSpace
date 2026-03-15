import { Component, OnInit, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-creator-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creator-messages.component.html',
  styleUrls: ['../creator-shared.css', './creator-messages.component.css'],
})
export class CreatorMessagesComponent implements OnInit, AfterViewChecked {
  @ViewChild('msgList') msgList!: ElementRef;

  conversations: any[] = [];
  messages: any[] = [];
  activeConvo: any = null;
  loading     = true;
  loadingMsgs = false;
  sending     = false;
  newMessage  = '';
  currentUserId = '';
  toast = { show: false, msg: '', type: 'success' };

  constructor(private creator: CreatorService, private auth: AuthService) {}

  ngOnInit(): void {
    this.currentUserId = this.auth.currentUser?.id || '';
    this.loadConversations();
  }

  ngAfterViewChecked(): void { this.scrollToBottom(); }

  loadConversations(): void {
    this.loading = true;
    this.creator.getConversations().subscribe({
      next:  r  => { this.conversations = r.conversations; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openConversation(convo: any): void {
    this.activeConvo = convo;
    const otherId = convo.participant?._id || convo.lastMessage?.sender?._id;
    if (otherId) this.loadMessages(otherId);
  }

  loadMessages(userId: string): void {
    this.loadingMsgs = true;
    this.creator.getMessages(userId).subscribe({
      next:  r  => {
        this.messages     = r.messages;
        this.loadingMsgs  = false;
        if (this.activeConvo) this.activeConvo.unreadCount = 0;
      },
      error: () => { this.loadingMsgs = false; },
    });
  }

  send(): void {
    const content = this.newMessage.trim();
    if (!content || !this.activeConvo) return;
    const receiverId = this.activeConvo.participant?._id;
    if (!receiverId) return;

    this.sending = true;
    this.creator.sendMessage({ receiverId, content }).subscribe({
      next: r => {
        this.messages.push(r.message);
        this.newMessage = '';
        this.sending    = false;
        this.scrollToBottom();
        this.loadConversations();
      },
      error: e => {
        this.sending = false;
        this.showToast(e?.friendlyMessage || 'Error sending message', 'error');
      },
    });
  }

  /** Called from template on keydown.enter — avoids semicolon in binding */
  onEnter(event: KeyboardEvent): void {
    if ((event as KeyboardEvent).shiftKey) return;
    event.preventDefault();
    this.send();
  }

  /** Called from template on focus/blur — avoids inline style assignment */
  onFocus(event: Event): void {
    (event.target as HTMLTextAreaElement).style.borderColor = 'rgba(139,92,246,.5)';
  }
  onBlur(event: Event): void {
    (event.target as HTMLTextAreaElement).style.borderColor = '';
  }

  deleteMsg(id: string): void {
    this.creator.deleteMessage(id).subscribe({
      next: () => { this.messages = this.messages.filter(m => m._id !== id); },
      error: () => {},
    });
  }

  isMine(msg: any): boolean {
    return (msg.sender?._id || msg.sender) === this.currentUserId;
  }

  scrollToBottom(): void {
    try {
      if (this.msgList?.nativeElement) {
        this.msgList.nativeElement.scrollTop = this.msgList.nativeElement.scrollHeight;
      }
    } catch (_) {}
  }

  timeAgo(d: string): string {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const m    = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }

  formatTime(d: string): string {
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  participantName(convo: any): string {
    const p = convo?.participant;
    if (!p) return 'Unknown';
    return p.companyName || ((p.firstName || '') + (p.lastName ? ' ' + p.lastName : ''));
  }

  participantInitial(convo: any): string {
    const name = this.participantName(convo);
    return name ? name[0].toUpperCase() : '?';
  }

  showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toast = { show: true, msg, type };
    setTimeout(() => this.toast.show = false, 3500);
  }
}