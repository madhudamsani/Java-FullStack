import { Injectable } from '@angular/core';
import { Show, ShowSchedule, Venue, ShowStatus, ShowCreator } from '../models/show.model';
import { convert12hTo24h } from '../utils/time-formatter';

@Injectable({
  providedIn: 'root'
})
export class DataTransformerService {
  constructor() {}

  transformShow(backendShow: any): Show {
    if (!backendShow) {
      console.error('Received null or undefined show data');
      return this.createEmptyShow();
    }

    // Handle price calculation
    let price = 0;
    if (backendShow.price !== undefined && backendShow.price !== null) {
      price = typeof backendShow.price === 'string' ? 
        parseFloat(backendShow.price) : 
        backendShow.price;
    } else if (backendShow.schedules && backendShow.schedules.length > 0) {
      // If no direct price but has schedules, use the minimum schedule price
      const schedulePrices = backendShow.schedules
        .filter((s: any) => s.basePrice !== undefined && s.basePrice !== null)
        .map((s: any) => typeof s.basePrice === 'string' ? parseFloat(s.basePrice) : s.basePrice);
      
      if (schedulePrices.length > 0) {
        price = Math.min(...schedulePrices);
      } else {
        price = 250; // Default price if no prices found
      }
    } else {
      price = 250; // Default price if no price info available
    }

    return {
      id: backendShow.id,
      title: backendShow.title || 'Untitled Show',
      type: this.determineShowType(backendShow),
      posterUrl: backendShow.posterUrl || backendShow.imageUrl || '',
      trailerUrl: backendShow.trailerUrl || '',
      description: backendShow.description || '',
      duration: backendShow.duration || 120,
      genre: backendShow.genre || '',
      language: backendShow.language || '',
      status: backendShow.status || ShowStatus.UPCOMING,
      createdAt: backendShow.createdAt ? new Date(backendShow.createdAt) : undefined,
      updatedAt: backendShow.updatedAt ? new Date(backendShow.updatedAt) : undefined,
      schedules: this.transformSchedules(backendShow.schedules || []),
      createdBy: this.transformCreator(backendShow),
      
      // Soft deletion fields
      isDeleted: backendShow.isDeleted || false,
      deletionReason: backendShow.deletionReason || '',
      
      // Backward compatibility fields
      venue: backendShow.venue || (backendShow.schedules && backendShow.schedules.length > 0 ? 
        (backendShow.schedules[0].venue ? backendShow.schedules[0].venue.name : backendShow.schedules[0].venueName) : ''),
      date: backendShow.date || (backendShow.schedules && backendShow.schedules.length > 0 ? backendShow.schedules[0].showDate : ''),
      time: backendShow.time || (backendShow.schedules && backendShow.schedules.length > 0 ? backendShow.schedules[0].showTime : ''),
      price: price,
      availableSeats: backendShow.availableSeats,
      totalSeats: backendShow.totalSeats,
      image: backendShow.posterUrl || backendShow.imageUrl || ''
    };
  }

  transformShows(backendShows: any[]): Show[] {
    if (!Array.isArray(backendShows)) {
      console.error('Expected array of shows but received:', typeof backendShows);
      return [];
    }
    return backendShows.map(show => this.transformShow(show));
  }

  private createEmptyShow(): Show {
    return {
      title: '',
      type: 'Other',
      description: '',
      status: ShowStatus.DRAFT,
      venue: '',
      date: '',
      price: 0
    };
  }

  private determineShowType(backendShow: any): Show['type'] {
    const type = backendShow.type?.toLowerCase() || '';
    switch (type) {
      case 'movie':
        return 'Movie';
      case 'theater':
      case 'theatrical':
        return 'Theatrical';
      case 'concert':
        return 'Concert';
      case 'event':
        return 'Event';
      default:
        return 'Other';
    }
  }

  private transformSchedules(schedules: any[]): ShowSchedule[] {
    console.log('Transforming schedules:', schedules);
    
    if (!Array.isArray(schedules)) {
      console.error('Expected array of schedules but received:', typeof schedules);
      return [];
    }
    
    return schedules.map(schedule => {
      console.log('Processing schedule:', schedule);
      
      // Handle basePrice conversion
      let basePrice = 0;
      if (schedule.basePrice !== undefined && schedule.basePrice !== null) {
        basePrice = typeof schedule.basePrice === 'string' ? 
          parseFloat(schedule.basePrice) : 
          schedule.basePrice;
      }

      // Create a venue object if it's not already provided
      let venue: any = schedule.venue;
      if (!venue && schedule.venueName) {
        venue = {
          id: schedule.venueId,
          name: schedule.venueName,
          address: '',
          city: '',
          state: '',
          country: '',
          capacity: schedule.totalSeats || 100,
          amenities: []
        };
        console.log('Created venue object from venueName:', venue);
      }

      // Convert time to 24-hour format if needed
      let showTime = schedule.showTime || schedule.startTime;
      if (showTime && (showTime.includes('AM') || showTime.includes('PM'))) {
        showTime = convert12hTo24h(showTime);
      }
      
      const transformedSchedule = {
        id: schedule.id,
        showId: schedule.showId,
        showDate: schedule.showDate,
        showTime: showTime, // Now using the converted time
        venue: venue,
        basePrice: basePrice,
        status: schedule.status,
        availableSeats: schedule.availableSeats,
        totalSeats: schedule.totalSeats
      };
      
      console.log('Transformed schedule:', transformedSchedule);
      return transformedSchedule;
    });
  }

  /**
   * Transform creator information from backend format to frontend format
   */
  private transformCreator(backendShow: any): ShowCreator | undefined {
    // Handle both old format (createdBy object) and new format (createdById/createdByUsername)
    if (backendShow.createdBy) {
      // Old format - already an object
      return backendShow.createdBy;
    } else if (backendShow.createdById || backendShow.createdByUsername) {
      // New format - separate fields
      return {
        id: backendShow.createdById,
        username: backendShow.createdByUsername
      };
    }
    
    return undefined;
  }
}