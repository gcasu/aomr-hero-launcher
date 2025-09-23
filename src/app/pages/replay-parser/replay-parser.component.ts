import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ReplayParserService, ParseOptions, ParseResult } from '../../services/replay-parser.service';
import { ToastService } from '../../services/toast.service';

// Import shared components
import { PageContainerComponent } from '../../shared/page-container/page-container.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { GlassCardComponent } from '../../shared/glass-card/glass-card.component';

@Component({
  selector: 'app-replay-parser',
  templateUrl: './replay-parser.component.html',
  styleUrls: ['./replay-parser.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    PageContainerComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    GlassCardComponent
  ]
})
export class ReplayParserComponent implements OnInit {
  selectedFile: File | null = null;
  parseOptions: ParseOptions = {
    slim: false,
    stats: false,
    prettyPrint: true,
    isGzip: false,
    verbose: false
  };
  isProcessing = false;
  parseResult: ParseResult | null = null;
  isDragOver = false;

  private replayParserService = inject(ReplayParserService);
  private toastService = inject(ToastService);

  ngOnInit(): void {
    // Component initialization
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelection(input.files[0]);
    }
  }

  private handleFileSelection(file: File): void {
    // Check if file has supported extension
    const supportedExtensions = ['.mythrec', '.mythrec.gz'];
    const hasValidExtension = supportedExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      this.toastService.showError('REPLAY_PARSER.ERRORS.INVALID_FILE_TYPE');
      return;
    }

    this.selectedFile = file;
    this.parseResult = null;

    // Auto-detect gzip compression based on file extension
    this.parseOptions.isGzip = file.name.toLowerCase().endsWith('.mythrec.gz');
  }

  async parseReplay(): Promise<void> {
    if (!this.selectedFile) {
      this.toastService.showError('REPLAY_PARSER.ERRORS.NO_FILE_SELECTED');
      return;
    }

    this.isProcessing = true;
    this.parseResult = null;

    try {
      const result = await this.replayParserService.parseReplay(
        this.selectedFile,
        this.parseOptions
      );
      
      this.parseResult = result;

      if (result.success) {
        this.toastService.showSuccess('REPLAY_PARSER.MESSAGES.PARSE_SUCCESS');
      } else {
        this.toastService.showError(
          result.error || 'REPLAY_PARSER.ERRORS.PARSE_FAILED'
        );
      }
    } catch (error) {
      console.error('Error parsing replay:', error);
      this.toastService.showError('REPLAY_PARSER.ERRORS.PARSE_FAILED');
    } finally {
      this.isProcessing = false;
    }
  }

  downloadResult(): void {
    if (!this.parseResult?.data || !this.selectedFile) {
      return;
    }

    const jsonData = JSON.stringify(this.parseResult.data, null, this.parseOptions.prettyPrint ? 2 : 0);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.selectedFile.name.replace(/\.(mythrec|mythrec\.gz)$/i, '')}_parsed.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  clearFile(): void {
    this.selectedFile = null;
    this.parseResult = null;
    this.isDragOver = false;
  }

  getFileSizeString(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  getResultSizeString(): string {
    if (!this.parseResult?.data) return '0 Bytes';
    const jsonString = JSON.stringify(this.parseResult.data);
    return this.getFileSizeString(jsonString.length);
  }
}