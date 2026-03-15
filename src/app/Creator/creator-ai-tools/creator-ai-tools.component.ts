import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService } from '../../services/creator.service';

@Component({
  selector: 'app-creator-ai-tools',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creator-ai-tools.component.html',
  styleUrls: ['../creator-shared.css', './creator-ai-tools.component.css'],
})
export class CreatorAiToolsComponent implements OnInit {
  suggestions: any[] = [];
  savedSuggestions: any[] = [];   // pre-filtered list for saved tab
  loading    = true;
  generating = false;
  saving     = false;
  activeTab: 'generate' | 'saved' = 'generate';
  editId     = '';
  editContent = '';
  toast = { show: false, msg: '', type: 'success' };

  form: any = { type: 'caption', prompt: '', platform: 'Instagram', niche: 'Fashion' };
  aiTypes   = ['caption', 'hashtags', 'content_idea', 'full_post'];
  platforms = ['Instagram', 'YouTube', 'TikTok', 'Twitter', 'Blog'];
  niches    = ['Fashion', 'Beauty', 'Tech', 'Gaming', 'Food', 'Travel', 'Fitness', 'Lifestyle'];

  constructor(private creator: CreatorService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.creator.getAiSuggestions().subscribe({
      next: r => {
        this.suggestions      = r.suggestions;
        this.savedSuggestions = r.suggestions.filter(s => s.isSaved);
        this.loading          = false;
      },
      error: () => { this.loading = false; },
    });
  }

  generate(): void {
    this.generating = true;
    this.creator.generateAiSuggestion(this.form).subscribe({
      next: () => { this.load(); this.generating = false; this.showToast('Content generated!'); },
      error: e  => { this.generating = false; this.showToast(e?.friendlyMessage || 'Error', 'error'); },
    });
  }

  startEdit(s: any): void {
    this.editId      = s._id;
    this.editContent = s.editedContent || s.generatedCaption || s.contentIdea || '';
  }

  saveEdit(): void {
    this.saving = true;
    this.creator.updateAiSuggestion(this.editId, { editedContent: this.editContent, isSaved: true }).subscribe({
      next: () => { this.load(); this.editId = ''; this.saving = false; this.showToast('Saved!'); },
      error: ()  => { this.saving = false; this.showToast('Error saving', 'error'); },
    });
  }

  remove(id: string): void {
    this.creator.deleteAiSuggestion(id).subscribe({
      next: () => { this.load(); this.showToast('Removed.'); },
      error: () => {},
    });
  }

  copy(text: string): void {
    navigator.clipboard.writeText(text);
    this.showToast('Copied to clipboard!');
  }

  showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toast = { show: true, msg, type };
    setTimeout(() => this.toast.show = false, 3500);
  }
}