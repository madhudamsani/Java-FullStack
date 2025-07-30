import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface FileInfo {
  name: string;
  path: string;
  size: string;
  type: 'file' | 'folder';
  mimeType?: string;
  lastModified?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class FileBrowserService {
  private apiUrl = `${environment.apiUrl}/files`;

  constructor(private http: HttpClient) {}

  /**
   * Get files and folders in a directory
   * @param path Directory path to browse
   * @returns Observable of file and folder list
   */
  browseDirectory(path: string = 'assets/images'): Observable<FileInfo[]> {
    // Try to load from real-time JSON file first
    return this.loadFromImagesJson(path).pipe(
      catchError(error => {
        console.warn('Images JSON not found, using mock data. Run "npm run scan-images" to generate real-time file list.', error);
        return of(this.getMockFiles(path));
      })
    );
  }

  /**
   * Load files from generated images JSON file
   * @param path Directory path to browse
   * @returns Observable of file and folder list
   */
  private loadFromImagesJson(path: string): Observable<FileInfo[]> {
    return this.http.get<any>('assets/images-list.json').pipe(
      map(imagesList => {
        // Get files for the specific path
        const pathFiles = imagesList.directories[path] || [];
        
        // Sort: folders first, then files alphabetically
        return pathFiles.sort((a: FileInfo, b: FileInfo) => {
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
      })
    );
  }



  /**
   * Get mock files for demonstration
   * @param path Directory path
   * @returns Array of mock files
   */
  private getMockFiles(path: string): FileInfo[] {
    const baseFiles: FileInfo[] = [
      {
        name: 'hariharaveeramallu.jpg',
        path: 'assets/images/hariharaveeramallu.jpg',
        size: '245 KB',
        type: 'file',
        mimeType: 'image/jpeg',
        lastModified: new Date('2024-01-15')
      },
      {
        name: 'placeholder-movie.jpg',
        path: 'assets/images/placeholder-movie.jpg',
        size: '128 KB',
        type: 'file',
        mimeType: 'image/jpeg',
        lastModified: new Date('2024-01-10')
      },
      {
        name: 'placeholder-venue.jpg',
        path: 'assets/images/placeholder-venue.jpg',
        size: '156 KB',
        type: 'file',
        mimeType: 'image/jpeg',
        lastModified: new Date('2024-01-08')
      }
    ];

    const folders: FileInfo[] = [
      {
        name: 'movies',
        path: 'assets/images/movies',
        size: '12 items',
        type: 'folder',
        lastModified: new Date('2024-01-20')
      },
      {
        name: 'theater',
        path: 'assets/images/theater',
        size: '8 items',
        type: 'folder',
        lastModified: new Date('2024-01-18')
      },
      {
        name: 'concerts',
        path: 'assets/images/concerts',
        size: '15 items',
        type: 'folder',
        lastModified: new Date('2024-01-22')
      },
      {
        name: 'events',
        path: 'assets/images/events',
        size: '6 items',
        type: 'folder',
        lastModified: new Date('2024-01-16')
      }
    ];

    // Return different files based on path
    switch (path) {
      case 'assets/images':
        return [...folders, ...baseFiles];
      
      case 'assets/images/movies':
        return [
          {
            name: 'avengers-endgame.jpg',
            path: 'assets/images/movies/avengers-endgame.jpg',
            size: '312 KB',
            type: 'file',
            mimeType: 'image/jpeg',
            lastModified: new Date('2024-01-20')
          },
          {
            name: 'spider-man.jpg',
            path: 'assets/images/movies/spider-man.jpg',
            size: '289 KB',
            type: 'file',
            mimeType: 'image/jpeg',
            lastModified: new Date('2024-01-19')
          },
          {
            name: 'the-batman.jpg',
            path: 'assets/images/movies/the-batman.jpg',
            size: '267 KB',
            type: 'file',
            mimeType: 'image/jpeg',
            lastModified: new Date('2024-01-18')
          }
        ];
      
      case 'assets/images/theater':
        return [
          {
            name: 'hamilton.jpg',
            path: 'assets/images/theater/hamilton.jpg',
            size: '198 KB',
            type: 'file',
            mimeType: 'image/jpeg',
            lastModified: new Date('2024-01-17')
          },
          {
            name: 'lion-king.jpg',
            path: 'assets/images/theater/lion-king.jpg',
            size: '234 KB',
            type: 'file',
            mimeType: 'image/jpeg',
            lastModified: new Date('2024-01-16')
          }
        ];
      
      case 'assets/images/concerts':
        return [
          {
            name: 'coldplay.jpg',
            path: 'assets/images/concerts/coldplay.jpg',
            size: '345 KB',
            type: 'file',
            mimeType: 'image/jpeg',
            lastModified: new Date('2024-01-22')
          },
          {
            name: 'ed-sheeran.jpg',
            path: 'assets/images/concerts/ed-sheeran.jpg',
            size: '278 KB',
            type: 'file',
            mimeType: 'image/jpeg',
            lastModified: new Date('2024-01-21')
          }
        ];
      
      default:
        return baseFiles;
    }
  }

  /**
   * Check if a file exists
   * @param filePath Path to check
   * @returns Observable boolean indicating if file exists
   */
  fileExists(filePath: string): Observable<boolean> {
    // In production: return this.http.head(filePath).pipe(map(() => true), catchError(() => of(false)));
    
    // For mock, check against known files
    const allFiles = this.getMockFiles('assets/images');
    return of(allFiles.some(file => file.path === filePath));
  }

  /**
   * Get file info
   * @param filePath Path to file
   * @returns Observable with file information
   */
  getFileInfo(filePath: string): Observable<FileInfo | null> {
    const allFiles = this.getMockFiles('assets/images');
    const file = allFiles.find(f => f.path === filePath);
    return of(file || null);
  }

  /**
   * Refresh images list by calling the scan script
   * @returns Observable with refresh result
   */
  refreshImagesList(): Observable<{success: boolean, totalScanned: number, message: string}> {
    // Try to call backend refresh endpoint
    if (environment.apiUrl) {
      return this.http.post<{success: boolean, totalScanned: number, message: string}>(`${environment.apiUrl}/assets/refresh`, {})
        .pipe(
          catchError(error => {
            console.warn('Backend refresh not available, using fallback:', error);
            return this.fallbackRefresh();
          })
        );
    } else {
      return this.fallbackRefresh();
    }
  }

  /**
   * Fallback refresh method when backend is not available
   */
  private fallbackRefresh(): Observable<{success: boolean, totalScanned: number, message: string}> {
    return new Observable(observer => {
      setTimeout(() => {
        observer.next({
          success: true,
          totalScanned: 0,
          message: 'To see new images, please run "npm run scan-images" in your terminal and refresh the browser.'
        });
        observer.complete();
      }, 1000);
    });
  }
}