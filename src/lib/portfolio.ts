import { defaultPortfolio } from '../data';
import type { PortfolioData } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';

const LOCAL_KEY = 'shashank-portfolio-data-v1';

export async function loadPortfolio(): Promise<PortfolioData> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('portfolio_content').select('data, updated_at').eq('id', 'main').maybeSingle();
    if (error) throw error;
    if (data?.data) return { ...(data.data as PortfolioData), updatedAt: data.updated_at };
    return defaultPortfolio;
  }
  try {
    const saved = localStorage.getItem(LOCAL_KEY);
    return saved ? { ...defaultPortfolio, ...JSON.parse(saved) } : defaultPortfolio;
  } catch {
    return defaultPortfolio;
  }
}

export async function savePortfolio(next: PortfolioData): Promise<PortfolioData> {
  const value = { ...next, updatedAt: new Date().toISOString() };
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('portfolio_content').upsert({ id: 'main', data: value, updated_at: value.updatedAt });
    if (error) throw error;
    return value;
  }
  localStorage.setItem(LOCAL_KEY, JSON.stringify(value));
  return value;
}

export async function uploadAsset(file: File): Promise<string> {
  if (!supabase) throw new Error('File uploads require Supabase. Configure the Supabase environment variables first.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from('portfolio-assets').upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('portfolio-assets').getPublicUrl(path);
  return data.publicUrl;
}
