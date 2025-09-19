import { Component, OnInit, OnDestroy, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, takeUntil, Observable, map, debounceTime } from 'rxjs';

// Import shared components
import { PageContainerComponent } from '../../shared/page-container/page-container.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { SearchFilterComponent } from '../../shared/search-filter/search-filter.component';

// Import services
import { ToastService } from '../../services/toast.service';

// Import interfaces
import { DataEntry, DataSection, CoreData } from './data-guide.interfaces';

// Bootstrap types for tooltips
declare const bootstrap: {
  Tooltip: {
    new (element: Element, options?: Record<string, unknown>): {
      dispose(): void;
    };
    getInstance(element: Element): { dispose(): void } | null;
  };
};

@Component({
  selector: 'app-data-guide',
  templateUrl: './data-guide.component.html',
  styleUrls: ['./data-guide.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    TranslateModule,
    PageContainerComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    SearchFilterComponent
  ]
})
export class DataGuideComponent implements OnInit, OnDestroy, AfterViewInit {
  isLoading = false;
  coreData: CoreData | null = null;
  sections: DataSection[] = [];
  filteredSections: DataSection[] = [];
  sectionFilterText = ''; // Filter for section names and types
  entryFilterText = ''; // Filter for entry names and descriptions  
  searchHighlightTerm = ''; // Store search term for highlighting
  expandedSections = new Set<string>();
  expandedEntries = new Set<string>();
  bookmarkedEntries = new Set<string>(); // Store bookmarked entry names
  entryNotes = new Map<string, string>(); // Store notes for entries
  notesSaveSubject = new Subject<{key: string, note: string}>(); // Subject for debounced note saving
  showDeprecatedEntries = false; // Toggle for deprecated entries, default hidden

  private destroy$ = new Subject<void>();
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);

  ngOnInit(): void {
    this.loadBookmarks();
    this.loadNotes();
    this.setupNotesDebouncing();
    this.loadCoreData();
  }

  ngOnDestroy(): void {
    // Clean up tooltips before destroying component
    this.disposeTooltips();
    
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    // Initialize Bootstrap tooltips after view is loaded
    this.initializeTooltips();
  }

  private initializeTooltips(): void {
    // Check if we're in a browser environment and Bootstrap is available
    if (typeof document !== 'undefined' && typeof bootstrap !== 'undefined') {
      setTimeout(() => {
        // First dispose of any existing tooltips to prevent stuck tooltips
        this.disposeTooltips();
        
        const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(tooltipTriggerEl => {
          new bootstrap.Tooltip(tooltipTriggerEl, {
            html: true,
            placement: 'top',
            trigger: 'hover focus'
          });
        });
      }, 100);
    }
  }

  private disposeTooltips(): void {
    // Dispose of all existing tooltip instances to prevent stuck tooltips
    if (typeof document !== 'undefined' && typeof bootstrap !== 'undefined') {
      const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
      tooltipTriggerList.forEach(tooltipTriggerEl => {
        const tooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
        if (tooltip) {
          tooltip.dispose();
        }
      });
    }
  }

  private loadCoreData(): void {
    this.isLoading = true;
    
    this.http.get<CoreData>('assets/data/aom_retold_core_data.json').pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data: CoreData) => {
        this.coreData = data;
        this.processCoreData();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load core data:', error);
        this.isLoading = false;
      }
    });
  }

  private processCoreData(): void {
    if (!this.coreData) return;

    this.sections = [];

    // Process each main category
    Object.entries(this.coreData).forEach(([categoryName, categoryData]) => {
      Object.entries(categoryData).forEach(([sectionName, entries]) => {
        this.sections.push({
          name: sectionName,
          type: categoryName,
          entries: entries as DataEntry[]
        });
      });
    });

    // Apply filtering (including deprecated filter) from the start
    this.applyFiltering();
    
    // Initialize tooltips after data is loaded
    setTimeout(() => this.initializeTooltips(), 100);
  }

  onFilterChange(): void {
    this.applyFiltering();
  }

  onSectionFilterChange(): void {
    this.applyFiltering();
  }

  onEntryFilterChange(): void {
    this.applyFiltering();
  }

  private applyFiltering(): void {
    const sectionSearchTerm = this.sectionFilterText.trim().toLowerCase();
    const entrySearchTerm = this.entryFilterText.trim().toLowerCase();
    
    // Set highlight term only if entry search is at least 2 characters
    this.searchHighlightTerm = entrySearchTerm.length >= 2 ? entrySearchTerm : '';

    this.filteredSections = this.sections.map(section => {
      // First, check if section should be included based on section filter
      const sectionMatches = !sectionSearchTerm || 
        section.name.toLowerCase().includes(sectionSearchTerm) ||
        section.type.toLowerCase().includes(sectionSearchTerm);
      
      if (!sectionMatches) {
        return null; // Exclude entire section
      }

      // Then filter entries within the section
      const filteredEntries = this.filterEntriesRecursively(section.entries, entrySearchTerm);
      
      if (filteredEntries.length > 0 || !entrySearchTerm) {
        return {
          ...section,
          entries: filteredEntries
        };
      }
      
      return null;
    }).filter(section => section !== null) as DataSection[];
    
    // Apply bookmark sorting to filtered results
    this.applySortingWithBookmarks();
    
    // Reinitialize tooltips after filtering
    setTimeout(() => this.initializeTooltips(), 50);
  }

  onDeprecatedToggle(): void {
    // Immediately dispose tooltips to prevent stuck tooltips on toggle
    this.disposeTooltips();
    
    // Re-apply filtering to show/hide deprecated entries
    this.applyFiltering();
    
    // Show toast message
    const messageKey = this.showDeprecatedEntries ? 
      'DATA_GUIDE.DEPRECATED_SHOWN' : 'DATA_GUIDE.DEPRECATED_HIDDEN';
    this.toastService.showInfo(this.translate.instant(messageKey));
  }

  private filterEntriesRecursively(entries: DataEntry[], searchTerm: string): DataEntry[] {
    return entries.map(entry => {
      // Filter out deprecated entries if toggle is off
      if (entry.deprecated && !this.showDeprecatedEntries) {
        return null;
      }
      
      // If no search term, include all non-deprecated entries
      if (!searchTerm) {
        return {
          ...entry,
          parameters: entry.parameters || []
        };
      }
      
      const matchesName = entry.name.toLowerCase().includes(searchTerm);
      const matchesDescription = entry.description.toLowerCase().includes(searchTerm);
      const matchesSyntax = entry.syntax?.toLowerCase().includes(searchTerm) || false;
      
      // Check if any parameter matches (recursively)
      const hasMatchingParameters = entry.parameters ? 
        this.hasAnyMatchingEntry(entry.parameters, searchTerm) : false;
      
      if (matchesName || matchesDescription || matchesSyntax || hasMatchingParameters) {
        // Return the entire entry with ALL parameters, not just filtered ones
        return {
          ...entry,
          parameters: entry.parameters || []
        };
      }
      
      return null;
    }).filter(entry => entry !== null) as DataEntry[];
  }

  private hasAnyMatchingEntry(entries: DataEntry[], searchTerm: string): boolean {
    return entries.some(entry => {
      // Filter out deprecated entries if toggle is off
      if (entry.deprecated && !this.showDeprecatedEntries) {
        return false;
      }
      
      // If no search term, include all non-deprecated entries
      if (!searchTerm) {
        return true;
      }
      
      const matchesName = entry.name.toLowerCase().includes(searchTerm);
      const matchesDescription = entry.description.toLowerCase().includes(searchTerm);
      const matchesSyntax = entry.syntax?.toLowerCase().includes(searchTerm) || false;
      
      // Check if any nested parameter matches
      const hasMatchingNestedParameters = entry.parameters ? 
        this.hasAnyMatchingEntry(entry.parameters, searchTerm) : false;
      
      return matchesName || matchesDescription || matchesSyntax || hasMatchingNestedParameters;
    });
  }

  toggleSection(sectionKey: string): void {
    if (this.expandedSections.has(sectionKey)) {
      this.expandedSections.delete(sectionKey);
    } else {
      this.expandedSections.add(sectionKey);
    }
    // Reinitialize tooltips after toggle
    setTimeout(() => this.initializeTooltips(), 50);
  }

  toggleEntry(entryKey: string): void {
    if (this.expandedEntries.has(entryKey)) {
      this.expandedEntries.delete(entryKey);
    } else {
      this.expandedEntries.add(entryKey);
    }
    // Reinitialize tooltips after toggle
    setTimeout(() => this.initializeTooltips(), 50);
  }

  isSectionExpanded(sectionKey: string): boolean {
    return this.expandedSections.has(sectionKey);
  }

  isEntryExpanded(entryKey: string): boolean {
    return this.expandedEntries.has(entryKey);
  }

  getSectionKey(section: DataSection): string {
    return `${section.type}-${section.name}`;
  }

  getEntryKey(section: DataSection, entry: DataEntry, index: number): string {
    return `${this.getSectionKey(section)}-${entry.name}-${index}`;
  }

  getParameterKey(parentKey: string, parameter: DataEntry, index: number): string {
    return `${parentKey}-${parameter.name}-${index}`;
  }

  expandAll(): void {
    this.filteredSections.forEach(section => {
      const sectionKey = this.getSectionKey(section);
      this.expandedSections.add(sectionKey);
      
      section.entries.forEach((entry, index) => {
        const entryKey = this.getEntryKey(section, entry, index);
        this.expandedEntries.add(entryKey);
      });
    });
    // Reinitialize tooltips after expanding all
    setTimeout(() => this.initializeTooltips(), 50);
  }

  collapseAll(): void {
    this.expandedSections.clear();
    this.expandedEntries.clear();
    // Reinitialize tooltips after collapsing all
    setTimeout(() => this.initializeTooltips(), 50);
  }

  getTotalEntriesCount(): number {
    return this.filteredSections.reduce((total, section) => total + section.entries.length, 0);
  }

  trackBySection = (index: number, section: DataSection): string => {
    return `${section.type}-${section.name}`;
  }

  trackByEntry = (index: number, entry: DataEntry): string => {
    return entry.name;
  }

  formatXmlSyntax(syntax: string): SafeHtml {
    if (!syntax) return this.sanitizer.bypassSecurityTrustHtml('');
    
    // First format the XML with proper indentation
    const formattedXml = this.formatXmlIndentation(syntax);
    
    // Simple and robust XML highlighting
    let highlighted = formattedXml
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Highlight complete tags first
    highlighted = highlighted.replace(/&lt;(\/?[a-zA-Z_][\w-]*)([^&]*?)&gt;/g, (match: string, tagName: string, content: string) => {
      let result = `&lt;<span class="xml-tag">${tagName}</span>`;
      
      // Process attributes in the content
      if (content.trim()) {
        result += content.replace(/\s+([a-zA-Z_][\w-]*)\s*=\s*(['"]?)([^'"]*)\2/g, (attrMatch: string, attrName: string, quote: string, value: string) => {
          return ` <span class="xml-attr">${attrName}</span>=<span class="xml-value">${quote}${value}${quote}</span>`;
        });
      }
      
      return result + '&gt;';
    });
      
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }

  private formatXmlIndentation(xml: string): string {
    if (!xml || !xml.includes('<')) return xml;
    
    // Clean up the XML first
    const cleanXml = xml.replace(/>\s*</g, '><').trim();
    
    // Format with proper indentation
    return this.indentXml(cleanXml, 0);
  }

  private indentXml(xml: string, depth: number): string {
    const indent = '  '.repeat(depth);
    const nextIndent = '  '.repeat(depth + 1);
    
    // Check if this is a simple text-only element: <tag>text</tag>
    const simpleMatch = xml.match(/^<([a-zA-Z_][\w-]*(?:\s[^>]*)?)>([^<]+)<\/[a-zA-Z_][\w-]*>$/);
    if (simpleMatch) {
      return xml; // Keep simple elements on one line
    }
    
    let result = '';
    let pos = 0;
    let elementCount = 0; // Track number of elements processed
    
    while (pos < xml.length) {
      const tagStart = xml.indexOf('<', pos);
      
      if (tagStart === -1) {
        // No more tags
        const remaining = xml.substring(pos).trim();
        if (remaining) {
          result += remaining;
        }
        break;
      }
      
      // Add any text before this tag
      const textBefore = xml.substring(pos, tagStart).trim();
      if (textBefore) {
        result += textBefore;
      }
      
      const tagEnd = xml.indexOf('>', tagStart);
      if (tagEnd === -1) break;
      
      const tag = xml.substring(tagStart, tagEnd + 1);
      const isClosing = tag.startsWith('</');
      const isSelfClosing = tag.endsWith('/>');
      
      if (isClosing) {
        // Closing tag
        result += tag;
        pos = tagEnd + 1;
      } else if (isSelfClosing) {
        // Self-closing tag
        result += tag;
        pos = tagEnd + 1;
      } else {
        // Opening tag - find its matching closing tag
        const tagName = tag.match(/<([a-zA-Z_][\w-]*)/)?.[1];
        if (!tagName) {
          result += tag;
          pos = tagEnd + 1;
          continue;
        }
        
        const closingTagIndex = this.findMatchingClosingTag(xml, tagStart, tagName);
        if (closingTagIndex === -1) {
          result += tag;
          pos = tagEnd + 1;
          continue;
        }
        
        const closingTag = `</${tagName}>`;
        const content = xml.substring(tagEnd + 1, closingTagIndex);
        
        // Check if content is simple text (no XML tags)
        if (!content.includes('<')) {
          // Add line break for consecutive elements (except the first one)
          if (elementCount > 0) {
            result += '\n' + indent;
          }
          // Simple text content - keep on same line
          result += tag + content.trim() + closingTag;
        } else {
          // Complex content with nested elements
          result += tag;
          
          if (content.trim()) {
            // Format nested content
            const formattedContent = this.formatNestedElements(content, depth + 1);
            if (formattedContent) {
              result += '\n' + formattedContent + '\n' + indent;
            }
          }
          
          result += closingTag;
        }
        
        elementCount++; // Increment element count
        pos = closingTagIndex + closingTag.length;
      }
    }
    
    return result;
  }

  private formatNestedElements(content: string, depth: number): string {
    const indent = '  '.repeat(depth);
    let result = '';
    let pos = 0;
    
    while (pos < content.length) {
      const tagStart = content.indexOf('<', pos);
      
      if (tagStart === -1) {
        break;
      }
      
      // Skip any text before the tag
      pos = tagStart;
      
      const tagEnd = content.indexOf('>', tagStart);
      if (tagEnd === -1) break;
      
      const tag = content.substring(tagStart, tagEnd + 1);
      const isClosing = tag.startsWith('</');
      const isSelfClosing = tag.endsWith('/>');
      
      if (isClosing) {
        // This shouldn't happen in well-formed XML at this level
        pos = tagEnd + 1;
        continue;
      }
      
      if (isSelfClosing) {
        // Self-closing tag
        if (result) result += '\n';
        result += indent + tag;
        pos = tagEnd + 1;
        continue;
      }
      
      // Opening tag - find matching closing tag
      const tagName = tag.match(/<([a-zA-Z_][\w-]*)/)?.[1];
      if (!tagName) {
        pos = tagEnd + 1;
        continue;
      }
      
      const closingTagIndex = this.findMatchingClosingTag(content, tagStart, tagName);
      if (closingTagIndex === -1) {
        pos = tagEnd + 1;
        continue;
      }
      
      const closingTag = `</${tagName}>`;
      const elementContent = content.substring(tagEnd + 1, closingTagIndex);
      
      // Add newline before each element (except first)
      if (result) result += '\n';
      
      // Check if element content is simple text
      if (!elementContent.includes('<')) {
        // Simple text content - keep on same line
        result += indent + tag + elementContent.trim() + closingTag;
      } else {
        // Complex nested content
        result += indent + tag;
        const nestedFormatted = this.formatNestedElements(elementContent, depth + 1);
        if (nestedFormatted) {
          result += '\n' + nestedFormatted + '\n' + indent;
        }
        result += closingTag;
      }
      
      pos = closingTagIndex + closingTag.length;
    }
    
    return result;
  }

  private findMatchingClosingTag(xml: string, openTagStart: number, tagName: string): number {
    const openPattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, 'g');
    const closePattern = new RegExp(`</${tagName}>`, 'g');
    
    let openCount = 1; // We already found the first opening tag
    let searchStart = xml.indexOf('>', openTagStart) + 1;
    
    while (searchStart < xml.length && openCount > 0) {
      // Find next opening or closing tag
      openPattern.lastIndex = searchStart;
      closePattern.lastIndex = searchStart;
      
      const openMatch = openPattern.exec(xml);
      const closeMatch = closePattern.exec(xml);
      
      // Determine which comes first
      const nextOpen = openMatch ? openMatch.index : Infinity;
      const nextClose = closeMatch ? closeMatch.index : Infinity;
      
      if (nextClose < nextOpen) {
        // Found closing tag first
        openCount--;
        if (openCount === 0) {
          return nextClose;
        }
        searchStart = nextClose + closeMatch![0].length;
      } else if (nextOpen < Infinity) {
        // Found opening tag first
        const foundTag = openMatch![0];
        if (!foundTag.endsWith('/>')) {
          openCount++;
        }
        searchStart = nextOpen + foundTag.length;
      } else {
        // No more tags found
        break;
      }
    }
    
    return -1;
  }

  private wasSimpleTextNode(xml: string, closingTagIndex: number): boolean {
    // This method is no longer used with the new approach
    return false;
  }

  // Text highlighting functionality
  highlightSearchTerm(text: string): SafeHtml {
    if (!text || !this.searchHighlightTerm) {
      return this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(text));
    }

    // Escape HTML characters first
    const escapedText = this.escapeHtml(text);
    
    // Create a case-insensitive regex to find all occurrences of the search term
    const regex = new RegExp(`(${this.escapeRegex(this.searchHighlightTerm)})`, 'gi');
    
    // Replace all matches with highlighted version
    const highlighted = escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
    
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Copy to clipboard functionality
  async copyEntryToClipboard(entry: DataEntry): Promise<void> {
    let content = `Name: ${entry.name}\n`;
    content += `Description: ${entry.description}\n`;
    
    if (entry.syntax) {
      content += `Syntax:\n${entry.syntax}\n`;
    }
    
    if (entry.parameters && entry.parameters.length > 0) {
      content += `\nParameters:\n`;
      content += this.formatParametersForClipboard(entry.parameters, 1);
    }
    
    try {
      await navigator.clipboard.writeText(content);
      this.toastService.showSuccess(this.translate.instant('DATA_GUIDE.COPY_ENTRY_SUCCESS'));
    } catch (err) {
      console.error('Failed to copy entry: ', err);
      this.toastService.showError(this.translate.instant('DATA_GUIDE.COPY_ERROR'));
      // Fallback for older browsers
      this.fallbackCopyToClipboard(content);
    }
  }

  async copySyntaxToClipboard(syntax: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(syntax);
      this.toastService.showSuccess(this.translate.instant('DATA_GUIDE.COPY_SYNTAX_SUCCESS'));
    } catch (err) {
      console.error('Failed to copy syntax: ', err);
      this.toastService.showError(this.translate.instant('DATA_GUIDE.COPY_ERROR'));
      // Fallback for older browsers
      this.fallbackCopyToClipboard(syntax);
    }
  }

  private formatParametersForClipboard(parameters: DataEntry[], indent: number): string {
    let result = '';
    const indentStr = '  '.repeat(indent);
    
    parameters.forEach(param => {
      result += `${indentStr}• ${param.name}: ${param.description}\n`;
      if (param.syntax) {
        result += `${indentStr}  Syntax: ${param.syntax}\n`;
      }
      if (param.parameters && param.parameters.length > 0) {
        result += this.formatParametersForClipboard(param.parameters, indent + 1);
      }
    });
    
    return result;
  }

  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.toastService.showSuccess(this.translate.instant('DATA_GUIDE.COPY_FALLBACK_SUCCESS'));
    } catch (err) {
      this.toastService.showError(this.translate.instant('DATA_GUIDE.COPY_ERROR'));
      console.error('Fallback copy failed: ', err);
    }
    
    document.body.removeChild(textArea);
  }

  // Bookmark management methods
  private createBookmarkKey(sectionType: string, sectionName: string, entryName: string): string {
    return `${sectionType}|${sectionName}|${entryName}`;
  }

  private loadBookmarks(): void {
    try {
      const savedBookmarks = localStorage.getItem('dataGuideBookmarks');
      if (savedBookmarks) {
        const bookmarkArray = JSON.parse(savedBookmarks);
        
        // Migration: Check if bookmarks are in old format (just entry names)
        const migratedBookmarks = bookmarkArray.filter((bookmark: string) => 
          bookmark.includes('|') // New format has pipe separators
        );
        
        this.bookmarkedEntries = new Set(migratedBookmarks);
        
        // If we had old format bookmarks, save the migrated version
        if (migratedBookmarks.length !== bookmarkArray.length) {
          this.saveBookmarks();
        }
      }
    } catch (error) {
      console.warn('Failed to load bookmarks from localStorage:', error);
      this.bookmarkedEntries = new Set();
    }
  }

  private saveBookmarks(): void {
    try {
      localStorage.setItem('dataGuideBookmarks', JSON.stringify(Array.from(this.bookmarkedEntries)));
    } catch (error) {
      console.warn('Failed to save bookmarks to localStorage:', error);
    }
  }

  toggleBookmark(sectionType: string, sectionName: string, entryName: string): void {
    const bookmarkKey = this.createBookmarkKey(sectionType, sectionName, entryName);
    
    if (this.bookmarkedEntries.has(bookmarkKey)) {
      this.bookmarkedEntries.delete(bookmarkKey);
      this.toastService.showInfo(this.translate.instant('DATA_GUIDE.BOOKMARK_REMOVED', { name: entryName }));
    } else {
      this.bookmarkedEntries.add(bookmarkKey);
      this.toastService.showSuccess(this.translate.instant('DATA_GUIDE.BOOKMARK_ADDED', { name: entryName }));
    }
    
    this.saveBookmarks();
    // Re-sort sections to move bookmarked entries to top
    this.applySortingWithBookmarks();
  }

  isBookmarked(sectionType: string, sectionName: string, entryName: string): boolean {
    const bookmarkKey = this.createBookmarkKey(sectionType, sectionName, entryName);
    return this.bookmarkedEntries.has(bookmarkKey);
  }

  private applySortingWithBookmarks(): void {
    // Sort entries in each section to put bookmarked ones at the top
    this.filteredSections = this.filteredSections.map(section => ({
      ...section,
      entries: this.sortEntriesByBookmarks(section.entries, section.type, section.name)
    }));
  }

  private sortEntriesByBookmarks(entries: DataEntry[], sectionType: string, sectionName: string): DataEntry[] {
    return [...entries].sort((a, b) => {
      const aBookmarked = this.isBookmarked(sectionType, sectionName, a.name);
      const bBookmarked = this.isBookmarked(sectionType, sectionName, b.name);
      
      if (aBookmarked && !bBookmarked) return -1;
      if (!aBookmarked && bBookmarked) return 1;
      
      // If both are bookmarked or both are not, maintain original order
      return 0;
    });
  }

  // Notes management methods
  private createNoteKey(sectionType: string, sectionName: string, entryName: string): string {
    return `${sectionType}|${sectionName}|${entryName}`;
  }

  private loadNotes(): void {
    try {
      const savedNotes = localStorage.getItem('dataGuideNotes');
      if (savedNotes) {
        const notesObject = JSON.parse(savedNotes);
        this.entryNotes = new Map(Object.entries(notesObject));
      }
    } catch (error) {
      console.warn('Failed to load notes from localStorage:', error);
      this.entryNotes = new Map();
    }
  }

  private saveNotes(): void {
    try {
      const notesObject = Object.fromEntries(this.entryNotes);
      localStorage.setItem('dataGuideNotes', JSON.stringify(notesObject));
    } catch (error) {
      console.warn('Failed to save notes to localStorage:', error);
    }
  }

  private setupNotesDebouncing(): void {
    // Set up debounced saving for notes
    this.notesSaveSubject.pipe(
      debounceTime(1000), // Wait 1 second after the last change
      takeUntil(this.destroy$)
    ).subscribe(({key, note}) => {
      if (note.trim()) {
        this.entryNotes.set(key, note.trim());
      } else {
        this.entryNotes.delete(key);
      }
      this.saveNotes();
    });
  }

  getEntryNote(sectionType: string, sectionName: string, entryName: string): string {
    const noteKey = this.createNoteKey(sectionType, sectionName, entryName);
    return this.entryNotes.get(noteKey) || '';
  }

  hasEntryNote(sectionType: string, sectionName: string, entryName: string): boolean {
    const noteKey = this.createNoteKey(sectionType, sectionName, entryName);
    const note = this.entryNotes.get(noteKey);
    return note !== undefined && note.trim().length > 0;
  }

  onNoteChange(sectionType: string, sectionName: string, entryName: string, note: string): void {
    const noteKey = this.createNoteKey(sectionType, sectionName, entryName);
    // Emit to debounced subject for saving
    this.notesSaveSubject.next({key: noteKey, note});
  }
}
