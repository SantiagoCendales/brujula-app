import { createApp } from './app.js';
import { config } from './config.js';

createApp().listen(config.port, () => {
  console.log(`Brújula API at http://localhost:${config.port}/api/health`);
});
