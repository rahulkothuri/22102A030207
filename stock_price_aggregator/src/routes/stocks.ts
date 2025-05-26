import { Router, Request, Response } from 'express';
import { getStockPriceHistory, getMultipleStockPriceHistories } from '../utils/fetchStockData';
import { AverageStockPriceResponse, CorrelationResponse } from '../types';

const router = Router();

router.get('/stocks/:ticker', async (req: Request, res: Response) => {
  const { ticker } = req.params;
  const { minutes, aggregation } = req.query;
  const auth = req.headers['authorization'];
  if (!auth || typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header. Format: Bearer <token>' });
  }
  if (!minutes || !aggregation || aggregation !== 'average') {
    return res.status(400).json({ error: 'Missing or invalid query parameters' });
  }
  const m = Number(minutes);
  if (isNaN(m) || m <= 0) {
    return res.status(400).json({ error: 'Invalid minutes parameter' });
  }
  try {
    const priceHistory = await getStockPriceHistory(ticker, m, auth);
    if (!priceHistory.length) {
      return res.status(404).json({ error: 'No price history found' });
    }
    const avg = priceHistory.reduce((a, b) => a + b.price, 0) / priceHistory.length;
    const response: AverageStockPriceResponse = {
      averageStockPrice: avg,
      priceHistory
    };
    res.json(response);
  } catch {
    res.status(502).json({ error: 'Failed to fetch stock data' });
  }
});

router.get('/stockcorrelation', async (req: Request, res: Response) => {
  const { minutes, ticker } = req.query;
  const auth = req.headers['authorization'];
  if (!auth || typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header. Format: Bearer <token>' });
  }
  if (!minutes || !ticker) {
    return res.status(400).json({ error: 'Missing query parameters' });
  }
  const m = Number(minutes);
  if (isNaN(m) || m <= 0) {
    return res.status(400).json({ error: 'Invalid minutes parameter' });
  }
  let tickers: string[] = [];
  if (Array.isArray(ticker)) {
    tickers = ticker.map(t => String(t));
  } else if (typeof ticker === 'string') {
    tickers = [ticker];
  }
  if (tickers.length !== 2) {
    return res.status(400).json({ error: 'Exactly two tickers must be provided' });
  }
  try {
    const histories = await getMultipleStockPriceHistories(tickers, m, auth);
    if (!histories[tickers[0]].length || !histories[tickers[1]].length) {
      return res.status(404).json({ error: 'No price history found for one or both tickers' });
    }
    const align = (a: { price: number; lastUpdatedAt: string }[], b: { price: number; lastUpdatedAt: string }[]) => {
      const mapA = new Map(a.map(x => [x.lastUpdatedAt, x.price]));
      const mapB = new Map(b.map(x => [x.lastUpdatedAt, x.price]));
      const common = Array.from(mapA.keys()).filter(k => mapB.has(k));
      const arrA = common.map(k => mapA.get(k) as number);
      const arrB = common.map(k => mapB.get(k) as number);
      return [arrA, arrB];
    };
    const [arrA, arrB] = align(histories[tickers[0]], histories[tickers[1]]);
    let correlation = 0;
    if (arrA.length > 1) {
      const n = arrA.length;
      const meanA = arrA.reduce((a, b) => a + b, 0) / n;
      const meanB = arrB.reduce((a, b) => a + b, 0) / n;
      const cov = arrA.map((a, i) => (a - meanA) * (arrB[i] - meanB)).reduce((a, b) => a + b, 0) / n;
      const stdA = Math.sqrt(arrA.map(a => (a - meanA) ** 2).reduce((a, b) => a + b, 0) / n);
      const stdB = Math.sqrt(arrB.map(b => (b - meanB) ** 2).reduce((a, b) => a + b, 0) / n);
      correlation = stdA && stdB ? cov / (stdA * stdB) : 0;
    }
    const avgA = histories[tickers[0]].reduce((a, b) => a + b.price, 0) / histories[tickers[0]].length;
    const avgB = histories[tickers[1]].reduce((a, b) => a + b.price, 0) / histories[tickers[1]].length;
    const response: CorrelationResponse = {
      correlation: Number(correlation.toFixed(4)),
      stocks: {
        [tickers[0]]: {
          averagePrice: avgA,
          priceHistory: histories[tickers[0]]
        },
        [tickers[1]]: {
          averagePrice: avgB,
          priceHistory: histories[tickers[1]]
        }
      }
    };
    res.json(response);
  } catch {
    res.status(502).json({ error: 'Failed to fetch stock data' });
  }
});

export default router;