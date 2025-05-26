import express from 'express';
import stocksRouter from './routes/stocks';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/', stocksRouter);

app.listen(PORT, () => {
  console.log(`Stock Price Aggregator running at http://localhost:${PORT}`);
});
