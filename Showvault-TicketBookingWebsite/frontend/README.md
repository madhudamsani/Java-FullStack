# ShowVault Frontend

This is the frontend application for ShowVault, a comprehensive platform for booking movie tickets, events, and shows online.

## Technology Stack

- Angular
- Bootstrap (with red/blue theme)
- TypeScript
- HTML/CSS

## Setup Instructions

1. Make sure you have Node.js (v18.20.7) and npm (v10.8.2) installed
2. Install Angular CLI: `npm install -g @angular/cli@16.2.3`
3. Navigate to the frontend directory
4. Run `npm install` to install dependencies
5. Run `ng serve` to start the development server
6. Open your browser and navigate to `http://localhost:4200`

## Project Structure

- **components**: Contains all Angular components organized by module
  - **user**: Components for user registration, login, profile management
  - **show**: Components for browsing and viewing shows
  - **booking**: Components for booking tickets and managing bookings
  - **shared**: Reusable components across modules
- **services**: Contains services for API communication
- **models**: Contains TypeScript interfaces for data models
- **guards**: Contains route guards for authentication and authorization

## Features

- User registration and login
- Show browsing with filters
- Ticket booking with seat selection
- Booking management
- Mock payment system

## Theme

The application uses a red and blue color theme with Bootstrap for responsive design.