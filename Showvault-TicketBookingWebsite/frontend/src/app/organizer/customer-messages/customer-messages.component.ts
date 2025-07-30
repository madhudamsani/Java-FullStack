import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ShowService } from '../../services/show.service';
import { MessageService, Message } from '../../services/message.service';

@Component({
  selector: 'app-customer-messages',
  templateUrl: './customer-messages.component.html',
  styleUrls: ['./customer-messages.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, DecimalPipe]
})
export class CustomerMessagesComponent implements OnInit {
  messages: Message[] = [];
  shows: any[] = [];
  showId: number | null = null;
  isLoading = true;
  error = '';
  successMessage = '';
  
  // For creating/editing messages
  messageForm: FormGroup;
  isEditing = false;
  selectedMessageId: number | null = null;
  showMessageModal = false;
  
  // For filtering
  statusFilter = 'all';
  showFilter = 'all';
  searchQuery = '';
  
  // For preview
  previewMessage: Message | null = null;
  showPreviewModal = false;

  constructor(
    private showService: ShowService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.messageForm = this.fb.group({
      showId: [null],
      subject: ['', [Validators.required]],
      content: ['', [Validators.required, Validators.minLength(10)]],
      recipientType: ['ALL', [Validators.required]],
      recipientFilter: [''],
      scheduledFor: [null],
      status: ['DRAFT']
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.showId = +params['id'];
        this.loadMessages(this.showId);
      } else {
        this.loadAllMessages();
      }
    });
    
    this.loadShows();
  }

  loadMessages(showId: number): void {
    this.isLoading = true;
    this.messageService.getMessages(showId).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading messages:', error);
        this.error = 'Failed to load messages. Please try again.';
        this.isLoading = false;
      }
    });
  }

  loadAllMessages(): void {
    this.isLoading = true;
    this.messageService.getMessages().subscribe({
      next: (messages) => {
        this.messages = messages;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading messages:', error);
        this.error = 'Failed to load messages. Please try again.';
        this.isLoading = false;
      }
    });
    }

    createMessage(message: Partial<Message>): void {
      this.messageService.createMessage(message as any).subscribe({
        next: (newMessage) => {
          this.messages.unshift(newMessage);
          this.showMessageModal = false;
          this.successMessage = 'Message created successfully';
          this.resetForm();
        },
        error: (error) => {
          console.error('Error creating message:', error);
          this.error = 'Failed to create message. Please try again.';
        }
      });
    }

  updateMessage(message: Message): void {
    this.messageService.updateMessage(message.id, message).subscribe({
      next: (updatedMessage) => {
        const index = this.messages.findIndex(m => m.id === message.id);
        if (index !== -1) {
          this.messages[index] = updatedMessage;
        }
        this.showMessageModal = false;
        this.successMessage = 'Message updated successfully';
        this.resetForm();
      },
      error: (error) => {
        console.error('Error updating message:', error);
        this.error = 'Failed to update message. Please try again.';
      }
    });
  }

  

  scheduleMessage(message: Message): void {
    if (!message.id) return;
    
    const scheduledDate = prompt('Enter scheduled date (YYYY-MM-DD HH:mm)');
    if (scheduledDate) {
      const scheduledDateTime = new Date(scheduledDate);
      if (isNaN(scheduledDateTime.getTime())) {
        this.error = 'Invalid date format';
        return;
      }

      message.scheduledFor = scheduledDateTime;
      message.status = 'SCHEDULED';
      
      this.messageService.updateMessage(message.id, message).subscribe({
        next: (updatedMessage) => {
          const index = this.messages.findIndex(m => m.id === message.id);
          if (index !== -1) {
            this.messages[index] = updatedMessage;
          }
          this.successMessage = 'Message scheduled successfully';
        },
        error: (error) => {
          console.error('Error scheduling message:', error);
          this.error = 'Failed to schedule message. Please try again.';
        }
      });
    }
  }

  sendMessage(message: Message): void {
    if (!message.id) return;
    
    if (confirm('Are you sure you want to send this message now?')) {
      this.messageService.sendMessage(message.id).subscribe({
        next: () => {
          const updatedMessage = this.messages.find(m => m.id === message.id);
          if (updatedMessage) {
            updatedMessage.status = 'SENT';
            updatedMessage.sentAt = new Date();
          }
          this.successMessage = 'Message sent successfully';
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.error = 'Failed to send message. Please try again.';
        }
      });
    }
  }

  getRecipientCount(): void {
    if (!this.messageForm.value.showId || !this.messageForm.value.recipientType) return;

    this.messageService.getRecipientCount(
      this.messageForm.value.showId,
      this.messageForm.value.recipientType,
      this.messageForm.value.recipientFilter
    ).subscribe({
      next: (count) => {
        const message = this.messageForm.value;
        message.recipientCount = count;
        this.messageForm.patchValue(message);
      },
      error: (error) => {
        console.error('Error getting recipient count:', error);
        this.error = 'Failed to get recipient count';
      }
    });
  }

  private resetForm(): void {
    this.messageForm.reset({
      showId: null,
      subject: '',
      content: '',
      recipientType: 'ALL',
      recipientFilter: '',
      scheduledFor: null,
      status: 'DRAFT'
    });
    this.selectedMessageId = null;
    this.isEditing = false;
  }

  private loadShows(): void {
    this.showService.getMyShows().subscribe({
      next: (shows) => {
        this.shows = shows;
      },
      error: (error) => {
        console.error('Error loading shows:', error);
      }
    });
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.selectedMessageId = null;
    this.messageForm.reset({
      showId: this.showId || null,
      subject: '',
      content: '',
      recipientType: 'ALL',
      recipientFilter: '',
      scheduledFor: null,
      status: 'DRAFT'
    });
    this.showMessageModal = true;
  }

  openEditModal(message: Message): void {
    this.isEditing = true;
    this.selectedMessageId = message.id;
    this.messageForm.patchValue({
      showId: message.showId || null,
      subject: message.subject,
      content: message.content,
      recipientType: message.recipientType,
      scheduledFor: message.scheduledFor || null,
      status: message.status
    });
    this.showMessageModal = true;
  }

  closeMessageModal(): void {
    this.showMessageModal = false;
  }

  openPreviewModal(message: Message): void {
    this.previewMessage = message;
    this.showPreviewModal = true;
  }

  closePreviewModal(): void {
    this.showPreviewModal = false;
    this.previewMessage = null;
  }

  saveMessage(): void {
    if (this.messageForm.invalid) return;
    
    const messageData = {
      ...this.messageForm.value,
      id: this.isEditing ? this.selectedMessageId : this.messages.length + 1,
      recipientCount: this.messageForm.value.recipientType === 'ALL' ? 1500 : 250,
      createdAt: new Date(),
      showTitle: this.getShowTitle(this.messageForm.value.showId)
    };
    
    if (this.isEditing) {
      // Update existing message
      const index = this.messages.findIndex(m => m.id === this.selectedMessageId);
      if (index !== -1) {
        this.messages[index] = {
          ...this.messages[index],
          ...messageData
        };
      }
      
      this.successMessage = 'Message updated successfully.';
    } else {
      // Create new message
      this.messages.push(messageData);
      this.successMessage = 'Message created successfully.';
    }
    
    this.closeMessageModal();
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  deleteMessage(messageId: number): void {
    if (confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      this.messages = this.messages.filter(m => m.id !== messageId);
      this.successMessage = 'Message deleted successfully.';
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    }
  }

  onSendMessage(message: Message): void {
    if (message.status === 'SENT') {
      this.error = 'This message has already been sent.';
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        this.error = '';
      }, 3000);
      return;
    }
    
    if (confirm('Are you sure you want to send this message now? This action cannot be undone.')) {
      this.messageService.sendMessage(message.id).subscribe({
        next: () => {
          const index = this.messages.findIndex(m => m.id === message.id);
          if (index !== -1) {
            this.messages[index] = {
              ...this.messages[index],
              status: 'SENT',
              sentAt: new Date(),
              scheduledFor: undefined
            };
          }
          
          this.successMessage = 'Message sent successfully.';
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.error = 'Failed to send message. Please try again.';
        }
      });
    }
  }

  onScheduleMessage(message: Message): void {
    if (message.status === 'SENT') {
      this.error = 'This message has already been sent.';
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        this.error = '';
      }, 3000);
      return;
    }
    
    // Open edit modal with status set to scheduled
    this.isEditing = true;
    this.selectedMessageId = message.id;
    this.messageForm.patchValue({
      showId: message.showId || null,
      subject: message.subject,
      content: message.content,
      recipientType: message.recipientType,
      recipientFilter: message.recipientFilter || '',
      scheduledFor: message.scheduledFor || this.getTomorrowDate(),
      status: 'SCHEDULED'
    });
    this.showMessageModal = true;
  }

  private getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    return tomorrow.toISOString().split('T')[0];
  }

  private getShowTitle(showId: number | null): string {
    if (!showId) return '';
    
    const show = this.shows.find(s => s.id === showId);
    return show ? show.title : '';
  }

  get filteredMessages(): Message[] {
    let filtered = [...this.messages];
    
    // Apply status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(message => message.status === this.statusFilter);
    }
    
    // Apply show filter
    if (this.showFilter !== 'all') {
      const showId = parseInt(this.showFilter);
      filtered = filtered.filter(message => message.showId === showId);
    }
    
    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(message => 
        message.subject.toLowerCase().includes(query) ||
        message.content.toLowerCase().includes(query) ||
        (message.showTitle && message.showTitle.toLowerCase().includes(query))
      );
    }
    
    // Sort by created date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return filtered;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'draft':
        return 'badge bg-secondary';
      case 'scheduled':
        return 'badge bg-info';
      case 'sent':
        return 'badge bg-success';
      case 'failed':
        return 'badge bg-danger';
      default:
        return 'badge bg-secondary';
    }
  }

  getRecipientTypeLabel(type: string): string {
    switch (type) {
      case 'ALL':
        return 'All Customers';
      case 'TICKET_HOLDERS':
        return 'Ticket Holders';
      case 'SPECIFIC':
        return 'Specific Recipients';
      default:
        return type;
    }
  }

  getFormattedDate(dateString: string | Date | undefined): string {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}