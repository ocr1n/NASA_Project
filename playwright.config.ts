import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/browser',workers:1,timeout:45000,use:{baseURL:'http://127.0.0.1:4173',headless:true,screenshot:'only-on-failure',trace:'retain-on-failure'},reporter:[['list']],webServer:{command:'npm run preview',url:'http://127.0.0.1:4173',reuseExistingServer:false,timeout:30000}});
