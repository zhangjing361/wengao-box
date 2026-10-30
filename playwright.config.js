import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',workers:1,use:{baseURL:'http://127.0.0.1:8770',headless:true,channel:process.env.PW_CHANNEL || 'msedge'},webServer:{command:'npm run build && npm run preview -- --port 8770 --strictPort',url:'http://127.0.0.1:8770',reuseExistingServer:!process.env.CI}});
