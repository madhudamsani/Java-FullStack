# ShowVault - Comprehensive Entertainment Booking Platform

[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.0-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Angular](https://img.shields.io/badge/Angular-16.2.0-red.svg)](https://angular.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg)](https://www.mysql.com/)

## 🎭 Overview

ShowVault is a comprehensive, enterprise-grade platform designed for booking movie tickets, events, and shows online. Built with modern technologies and following industry best practices, it provides a seamless experience for customers, organizers, and administrators.

## 🏗️ Architecture

ShowVault follows a **microservices-inspired architecture** with clear separation of concerns:

- **Frontend**: Angular 16 SPA with responsive design
- **Backend**: Spring Boot 3.2 REST API with JWT authentication
- **Database**: MySQL 8.0 with optimized schema design
- **Real-time Communication**: WebSocket integration for live updates
- **Security**: JWT-based authentication with role-based access control

## 🚀 Technology Stack

### Backend Technologies
- **Framework**: Spring Boot 3.2.0
- **Language**: Java 17
- **Security**: Spring Security with JWT (JSON Web Tokens)
- **Database**: MySQL 8.0.33 with JPA/Hibernate
- **Build Tool**: Maven
- **Documentation**: OpenAPI 3.0 (Swagger)
- **Real-time**: WebSocket with STOMP protocol
- **PDF Generation**: iText PDF
- **QR Code**: Google ZXing
- **Connection Pooling**: HikariCP

### Frontend Technologies
- **Framework**: Angular 16.2.0
- **Language**: TypeScript 4.9.5
- **UI Framework**: Bootstrap 5.3.2 with Angular Material
- **Charts**: Chart.js with ng2-charts
- **Real-time**: STOMP.js with SockJS
- **Date Handling**: date-fns
- **Build Tool**: Angular CLI

### Development Tools
- **IDE Support**: Visual Studio Code, Eclipse
- **Version Control**: Git
- **Package Management**: npm, Maven
- **Testing**: Jasmine, Karma (Frontend), JUnit (Backend)

## 🎯 Key Features

### 🎪 For Customers
- **User Management**: Registration, login, profile management
- **Show Discovery**: Browse shows with advanced filtering and search
- **Interactive Booking**: Real-time seat selection with visual seat maps
- **Payment Processing**: Multiple payment methods with secure transactions
- **Digital Tickets**: QR code-based tickets with PDF generation
- **Booking Management**: View, modify, and cancel bookings
- **Favorites & Ratings**: Save favorite shows and rate experiences
- **Notifications**: Real-time updates on bookings and show changes

### 🎨 For Organizers
- **Show Management**: Create, update, and manage shows and events
- **Venue Mapping**: Configure venues with detailed seat layouts
- **Schedule Management**: Set up show schedules with pricing tiers
- **Analytics Dashboard**: Comprehensive sales and audience analytics
- **Customer Communication**: Broadcast messages to ticket holders
- **Promotion Management**: Create and manage discount codes
- **Revenue Tracking**: Detailed sales reports and performance metrics

### 🛡️ For Administrators
- **System Monitoring**: Real-time system health and performance metrics
- **User Management**: Comprehensive user administration
- **Platform Settings**: Configure system-wide settings and parameters
- **Database Maintenance**: Tools for database optimization and cleanup
- **Audit Logging**: Complete audit trail of system activities
- **Report Generation**: Advanced reporting capabilities
- **Security Management**: Monitor and manage security aspects

## 📊 Database Schema

The platform uses a well-designed MySQL database with 23+ tables including:

- **Core Entities**: Users, Shows, Venues, Bookings
- **Security**: Roles, User Roles, Audit Logs
- **Business Logic**: Seats, Reservations, Payments, Promotions
- **Communication**: Notifications, Customer Messages
- **Analytics**: System Metrics, Sales Reports, User Ratings

## 🔧 Installation & Setup

### Prerequisites
- **Java 17** or higher
- **Node.js 18.20.7** with npm 10.8.2
- **MySQL 8.0** or higher
- **Angular CLI 16.2.3**

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd showvault/backend
   ```

2. **Configure Database**
   ```sql
   CREATE DATABASE showvault;
   ```
   Update `src/main/resources/application.properties` with your MySQL credentials.

3. **Build and Run**
   ```bash
   mvn clean install
   mvn spring-boot:run
   ```

4. **Access API Documentation**
   - Swagger UI: `http://localhost:8080/swagger-ui.html`
   - API Docs: `http://localhost:8080/api-docs`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd showvault/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   ng serve
   ```

4. **Access Application**
   - Frontend: `http://localhost:4200`

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/signin` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signout` - User logout

### Shows & Venues
- `GET /api/shows` - List all shows
- `GET /api/shows/{id}` - Get show details
- `GET /api/venues` - List venues
- `POST /api/venues` - Create venue (Organizer)

### Booking System
- `POST /api/bookings` - Create booking
- `GET /api/bookings/user/{userId}` - User bookings
- `PUT /api/bookings/{id}/cancel` - Cancel booking
- `GET /api/seats/{scheduleId}` - Get seat availability

### Administration
- `GET /api/admin/users` - Manage users
- `GET /api/admin/reports` - System reports
- `GET /api/admin/health` - System health

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Three-tier role system (User, Organizer, Admin)
- **Password Encryption**: BCrypt password hashing
- **CORS Configuration**: Secure cross-origin resource sharing
- **Input Validation**: Comprehensive input validation and sanitization
- **Audit Logging**: Complete activity tracking

## 📱 Real-time Features

- **Live Seat Updates**: Real-time seat availability using WebSocket
- **Instant Notifications**: Push notifications for booking updates
- **Concurrent Booking Protection**: Prevents double-booking scenarios
- **Live Dashboard Updates**: Real-time analytics and metrics

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach with Bootstrap
- **Modern Interface**: Clean, intuitive user interface
- **Accessibility**: WCAG compliant design
- **Progressive Web App**: PWA capabilities for mobile experience
- **Dark/Light Theme**: Theme customization options
- **Interactive Elements**: Smooth animations and transitions

## 📈 Performance Optimizations

- **Database Indexing**: Optimized database queries with proper indexing
- **Connection Pooling**: HikariCP for efficient database connections
- **Lazy Loading**: Angular lazy loading for improved initial load times
- **Caching Strategy**: Strategic caching for frequently accessed data
- **Pagination**: Efficient data pagination for large datasets

## 🧪 Testing

### Backend Testing
```bash
cd backend
mvn test
```

### Frontend Testing
```bash
cd frontend
ng test
```

## 📦 Deployment

### Production Build

**Backend**:
```bash
mvn clean package -Pprod
java -jar target/showvault-0.0.1-SNAPSHOT.jar
```

**Frontend**:
```bash
ng build --configuration production
```

### Docker Support
Docker configurations available for containerized deployment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## 🔮 Future Enhancements

- **Mobile Applications**: Native iOS and Android apps
- **Payment Gateway Integration**: Multiple payment providers
- **AI Recommendations**: Machine learning-based show recommendations
- **Social Features**: User reviews and social sharing
- **Multi-language Support**: Internationalization
- **Advanced Analytics**: Business intelligence dashboard

---

**ShowVault** - Revolutionizing the entertainment booking experience with cutting-edge technology and user-centric design.