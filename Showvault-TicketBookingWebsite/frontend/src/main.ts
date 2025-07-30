import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
// Import the global polyfill to fix "global is not defined" error
import './app/polyfills/global.polyfill';

// Enable production mode when in production environment
if (environment.production) {
  console.log('Running in production mode');
  // Enable production mode if needed
}

// Use traditional module-based bootstrapping
platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));