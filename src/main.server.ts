import 'zone.js/node';
import './styles.css';
import { bootstrapApplication, type BootstrapContext } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

/** Must forward `context` so SSR uses the server platform (`DOCUMENT`, transfer state, etc.). */
const bootstrap = (context: BootstrapContext) => bootstrapApplication(AppComponent, config, context);

export default bootstrap;
