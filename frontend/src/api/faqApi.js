/**
 * FAQ & Operational Guides API Service
 * 
 * Provides client methods to interact with Backend FAQ endpoints:
 * - Query FAQs with role, category, and live keyword filtering
 * - Fetch metadata of 4 roles and categories
 * - Vote helpful for answers
 * - Submit new inquiries
 */

import { fetchJson } from './client.js';

export async function getFaqs(params = {}) {
  const query = new URLSearchParams();
  if (params.role && params.role !== 'ALL') query.append('role', params.role);
  if (params.category && params.category !== 'ALL') query.append('category', params.category);
  if (params.search) query.append('search', params.search);
  if (params.limit) query.append('limit', params.limit);

  const qs = query.toString();
  const endpoint = `/api/v1/faqs${qs ? `?${qs}` : ''}`;
  return await fetchJson(endpoint);
}

export async function getFaqRoles() {
  return await fetchJson('/api/v1/faqs/roles');
}

export async function getFaqCategories() {
  return await fetchJson('/api/v1/faqs/categories');
}

export async function getFaqStats() {
  return await fetchJson('/api/v1/faqs/stats');
}

export async function getFaqDetail(faqId) {
  return await fetchJson(`/api/v1/faqs/${faqId}`);
}

export async function voteFaqHelpful(faqId) {
  return await fetchJson(`/api/v1/faqs/${faqId}/helpful`, {
    method: 'POST',
  });
}

export async function submitFaqInquiry(inquiryData) {
  return await fetchJson('/api/v1/faqs', {
    method: 'POST',
    body: JSON.stringify(inquiryData),
  });
}
