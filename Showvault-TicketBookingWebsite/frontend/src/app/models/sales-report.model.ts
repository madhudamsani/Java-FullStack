export interface SalesReport {
    totalRevenue: number;
    ticketsSold: number;
    averageTicketPrice: number;
    conversionRate: number;
    revenueTrend: 'increasing' | 'decreasing' | 'stable';
    
    // For the admin-reports component
    revenueByShow: Array<{
        showTitle: string;
        revenue: number;
    }>;
    
    // For the admin-reports component
    revenueByCategory: Array<{
        category: string;
        revenue: number;
    }>;
    
    // For the admin-reports component
    revenueByMonth: Array<{
        month: string;
        amount: number;
    }>;
    
    // For the admin-reports component
    maxMonthlyRevenue: number;
    
    // For the admin-reports component
    revenueByPaymentMethod: Array<{
        method: string;
        revenue: number;
    }>;
    
    // Updated to match backend structure
    topSellingShows: Array<{
        id?: number;
        name?: string;
        title?: string;
        organizer?: string;
        ticketsSold: number;
        revenue: number;
        averagePrice: number;
        category?: string;
    }>;
    
    // Additional fields from backend
    ticketsByMonth?: { [key: string]: number };
    revenueByPlatform?: { [key: string]: number };
    salesByPriceCategory?: Array<{
        category: string;
        ticketsSold: number;
        revenue: number;
        averagePrice: number;
    }>;
    refundRate?: { [key: string]: number };
    promotionEffectiveness?: Array<{
        code: string;
        usageCount: number;
        revenue: number;
        discountAmount: number;
        conversionRate: number;
        note?: string;
    }>;
}