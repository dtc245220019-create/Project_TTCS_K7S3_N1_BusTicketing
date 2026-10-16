/**
 * Frontend API Layer - Central Aggregator
 * 
 * Modular API client functions connecting the React UI to Backend FastAPI:
 * - client.js: Core API client, Auth, Trips, Bookings, Tickets, Payments, Vouchers, Monthly Pass, Admin
 * - chatbotApi.js: Smart AI Chatbot integrations (Gemini / OpenAI)
 * - feedbackApi.js: Customer Feedback API
 */

export * from './client.js';
export * from './chatbotApi.js';
export * from './feedbackApi.js';
