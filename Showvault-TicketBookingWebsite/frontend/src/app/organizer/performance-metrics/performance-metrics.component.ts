import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ShowService } from '../../services/show.service';
import { ShowAnalytics } from '../../models/show.model';

@Component({
  selector: 'app-performance-metrics',
  templateUrl: './performance-metrics.component.html',
  styleUrls: ['./performance-metrics.component.css']
})
export class PerformanceMetricsComponent implements OnInit {
  showId: number;
  analytics: ShowAnalytics | null = null;
  isLoading = true;
  error = '';
  
  // Chart options
  salesChartOptions: any;
  categoryChartOptions: any;

  constructor(
    private route: ActivatedRoute,
    private showService: ShowService
  ) {
    this.showId = this.route.snapshot.params['id'];
  }

  ngOnInit(): void {
    this.loadPerformanceData();
  }

  loadPerformanceData(): void {
    this.isLoading = true;
    this.error = '';
    
    this.showService.getShowAnalytics(this.showId).subscribe({
      next: (data) => {
        if (!data) {
          this.error = 'No performance data available for this show.';
          this.isLoading = false;
          return;
        }
        
        // Debug log to see what data we're getting
        console.log('Analytics data received:', data);
        console.log('Revenue by date:', data.revenueByDate);
        
        this.analytics = data;
        this.initCharts();
        
        // Debug log to see if charts were initialized
        console.log('Sales chart options:', this.salesChartOptions);
        console.log('Category chart options:', this.categoryChartOptions);
        
        this.isLoading = false;
      },
      error: (error) => {
        this.error = error.message || 'Failed to load performance metrics. Please try again.';
        this.isLoading = false;
        console.error('Error loading performance metrics:', error);
      }
    });
  }

  initCharts(): void {
    if (!this.analytics) return;
    
    // Initialize sales chart
    this.initSalesChart();
    
    // Initialize category chart
    this.initCategoryChart();
  }

  initSalesChart(): void {
    // Use revenueByDate if available, fallback to salesByDay for backward compatibility
    if (!this.analytics) return;
    
    console.log('Initializing sales chart with analytics:', this.analytics);
    
    // Check if we have revenue data
    const salesData = this.analytics.revenueByDate || this.analytics.salesByDay;
    if (!salesData || Object.keys(salesData).length === 0) {
      console.log('No sales data available for chart');
      
      // Create dummy data for testing/demo purposes
      const dummyData = {
        '2023-06-01': 1200,
        '2023-06-02': 1500,
        '2023-06-03': 1800,
        '2023-06-04': 1300,
        '2023-06-05': 2000,
        '2023-06-06': 2200,
        '2023-06-07': 1900
      };
      
      const dates = Object.keys(dummyData);
      const sales = Object.values(dummyData);
      
      this.salesChartOptions = {
        series: [{
          name: 'Sales (Demo)',
          data: sales
        }],
        chart: {
          type: 'line',
          height: 350
        },
        xaxis: {
          categories: dates
        },
        title: {
          text: 'Daily Sales (Demo Data)'
        }
      };
      
      console.log('Created sales chart with demo data:', this.salesChartOptions);
      return;
    }
    
    const dates = Object.keys(salesData);
    const sales = Object.values(salesData);
    
    console.log('Sales data for chart:', { dates, sales });
    
    this.salesChartOptions = {
      series: [{
        name: 'Sales',
        data: sales
      }],
      chart: {
        type: 'line',
        height: 350
      },
      xaxis: {
        categories: dates
      },
      title: {
        text: 'Daily Sales'
      }
    };
    
    console.log('Created sales chart with real data:', this.salesChartOptions);
  }

  // Demographics chart has been removed

  initCategoryChart(): void {
    // Use salesByPriceCategory if available, fallback to salesByCategory for backward compatibility
    if (!this.analytics) return;
    
    let categories: string[] = [];
    let values: number[] = [];
    
    if (this.analytics.salesByPriceCategory && this.analytics.salesByPriceCategory.length > 0) {
      // Handle the new structure where salesByPriceCategory is an array of objects
      this.analytics.salesByPriceCategory.forEach(item => {
        const category = Object.keys(item)[0];
        const value = item[category];
        categories.push(category);
        values.push(value as number);
      });
    } else if (this.analytics.salesByCategory) {
      // Fallback to old structure
      categories = Object.keys(this.analytics.salesByCategory);
      values = Object.values(this.analytics.salesByCategory);
    } else {
      // No valid category data
      return;
    }
    
    this.categoryChartOptions = {
      series: [{
        name: 'Sales',
        data: values
      }],
      chart: {
        type: 'bar',
        height: 350
      },
      xaxis: {
        categories: categories
      },
      title: {
        text: 'Sales by Category'
      }
    };
  }

  getOccupancyRateClass(): string {
    if (!this.analytics) return '';
    
    const rate = this.analytics.occupancyRate;
    
    if (rate >= 80) {
      return 'text-success';
    } else if (rate >= 50) {
      return 'text-warning';
    } else {
      return 'text-danger';
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(value);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  /**
   * Check if revenue data exists and has entries
   */
  hasRevenueData(): boolean {
    return !!(this.analytics && 
              this.analytics.revenueByDate && 
              Object.keys(this.analytics.revenueByDate).length > 0);
  }

  /**
   * Get sorted dates from revenueByDate for display in the table
   */
  getSortedDates(): string[] {
    if (!this.analytics || !this.analytics.revenueByDate) return [];
    
    return Object.keys(this.analytics.revenueByDate).sort((a, b) => {
      // Sort dates in descending order (newest first)
      return new Date(b).getTime() - new Date(a).getTime();
    });
  }
  
  /**
   * Safely get revenue for a specific date
   */
  getRevenueForDate(date: string): number {
    if (!this.analytics || !this.analytics.revenueByDate) return 0;
    return this.analytics.revenueByDate[date] || 0;
  }

  /**
   * Check if category data exists
   */
  hasCategoryData(): boolean {
    if (!this.analytics) return false;
    
    return !!(
      (this.analytics.salesByPriceCategory && this.analytics.salesByPriceCategory.length > 0) ||
      (this.analytics.salesByCategory && Object.keys(this.analytics.salesByCategory).length > 0)
    );
  }

  /**
   * Get category data for display in the table
   */
  getCategoryData(): { name: string, value: number }[] {
    if (!this.analytics) return [];
    
    const result: { name: string, value: number }[] = [];
    
    if (this.analytics.salesByPriceCategory && this.analytics.salesByPriceCategory.length > 0) {
      // Handle the new structure where salesByPriceCategory is an array of objects
      this.analytics.salesByPriceCategory.forEach(item => {
        const category = Object.keys(item)[0];
        const value = item[category];
        result.push({ name: category, value: value as number });
      });
    } else if (this.analytics.salesByCategory) {
      // Fallback to old structure
      Object.entries(this.analytics.salesByCategory).forEach(([category, value]) => {
        result.push({ name: category, value: value as number });
      });
    }
    
    // Sort by value in descending order
    return result.sort((a, b) => b.value - a.value);
  }
}