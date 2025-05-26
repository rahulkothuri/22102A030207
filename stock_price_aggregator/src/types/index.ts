export interface StockPrice {
  price: number;
  lastUpdatedAt: string; // ISO string
}

export interface AverageStockPriceResponse {
  averageStockPrice: number;
  priceHistory: StockPrice[];
}

export interface CorrelationResponse {
  correlation: number;
  stocks: {
    [ticker: string]: {
      averagePrice: number;
      priceHistory: StockPrice[];
    }
  };
}
