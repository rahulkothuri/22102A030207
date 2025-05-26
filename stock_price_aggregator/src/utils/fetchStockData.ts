import fetch from 'node-fetch';
import { StockPrice } from '../types';

const BASE_URL = 'http://20.244.56.144/evaluation-service/stocks';

function normalizeToStockPriceArray(data: any): StockPrice[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.filter(
      (v: any) => v && typeof v === 'object' && typeof v.price === 'number' && typeof v.lastUpdatedAt === 'string'
    );
  }
  if (typeof data === 'object') {
    if (Array.isArray(data.priceHistory)) {
      return data.priceHistory.filter(
        (v: any) => v && typeof v === 'object' && typeof v.price === 'number' && typeof v.lastUpdatedAt === 'string'
      );
    }
    if (Array.isArray(data.stock)) {
      return data.stock.filter(
        (v: any) => v && typeof v === 'object' && typeof v.price === 'number' && typeof v.lastUpdatedAt === 'string'
      );
    }
    if (data.stock && Array.isArray(data.stock.priceHistory)) {
      return data.stock.priceHistory.filter(
        (v: any) => v && typeof v === 'object' && typeof v.price === 'number' && typeof v.lastUpdatedAt === 'string'
      );
    }
    if ('price' in data && 'lastUpdatedAt' in data && typeof data.price === 'number' && typeof data.lastUpdatedAt === 'string') {
      return [{ price: data.price, lastUpdatedAt: data.lastUpdatedAt }];
    }
    const arr: StockPrice[] = [];
    for (const key in data) {
      const v = data[key];
      if (v && typeof v === 'object' && typeof v.price === 'number' && typeof v.lastUpdatedAt === 'string') {
        arr.push({ price: v.price, lastUpdatedAt: v.lastUpdatedAt });
      }
    }
    if (arr.length) return arr;
  }
  return [];
}

export async function getStockPriceHistory(ticker: string, minutes: number, bearer: string): Promise<StockPrice[]> {
  const url = `${BASE_URL}/${ticker}?minutes=${minutes}`;
  const resp = await fetch(url, {
    headers: {
      'Authorization': bearer,
      'Accept': 'application/json'
    }
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  return normalizeToStockPriceArray(data);
}

export async function getMultipleStockPriceHistories(tickers: string[], minutes: number, bearer: string): Promise<{ [ticker: string]: StockPrice[] }> {
  const result: { [ticker: string]: StockPrice[] } = {};
  await Promise.all(
    tickers.map(async t => {
      result[t] = await getStockPriceHistory(t, minutes, bearer);
    })
  );
  return result;
}
