export interface UserReport {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  retentionRate: number;
  userTypes: {
    regular: number;
    organizer: number;
    admin: number;
  };
  growthByMonth: Array<{
    month: string;
    count: number;
  }>;
  maxMonthlyUsers: number;
  registrationSources: {
    [key: string]: number;
  };
  mostActiveUsers: Array<{
    name: string;
    role: string;
    bookings: number;
    lastActive: Date;
  }>;
}