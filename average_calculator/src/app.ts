import express from 'express';
import fetch from 'node-fetch';
import { NumberId, AverageResponse } from './types';

const app = express();
const PORT = 9876;
const WINDOW_SIZE = 8;

const ALLOWED_IDS: NumberId[] = ['p', 'f', 'e', 'r'];
let windowStore: number[] = [];

async function fetchNumbersFromThirdParty(id: NumberId, bearerToken: string): Promise<number[]> {
  let url = '';
  switch (id) {
    case 'e':
      url = 'http://20.244.56.144/evaluation-service/even';
      break;
    case 'p':
      url = 'http://20.244.56.144/evaluation-service/primes';
      break;
    case 'f':
      url = 'http://20.244.56.144/evaluation-service/fibo';
      break;
    case 'r':
      url = 'http://20.244.56.144/evaluation-service/rand';
      break;
    default:
      return [];
  }

  try {
    console.log('Outgoing Authorization header to third-party:', bearerToken);

    const response = await fetch(url, {
      headers: {
        'Authorization': bearerToken.trim(),
        'Accept': 'application/json'
      }
    });

    console.log(`Third-party response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      return [];
    }

    const data = await response.json() as { numbers?: unknown };
    return Array.isArray(data.numbers) ? data.numbers as number[] : [];
  } catch (error) {
    console.error(`Error fetching numbers for ${id}:`, error);
    return [];
  }
}

function calcAvg(nums: number[]): number {
  if (!nums.length) return 0;
  return parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
}

app.get('/numbers/:numberid', async (req, res) => {
  try {
    const numberid = req.params.numberid as NumberId;
    if (!ALLOWED_IDS.includes(numberid)) {
      return res.status(400).json({ error: 'Invalid numberid' });
    }

    const bearerToken = req.headers['authorization'];
    console.log('Incoming Authorization header:', bearerToken);

    if (!bearerToken || !bearerToken.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header. Format: Bearer <token>' });
    }

    const windowPrevState = [...windowStore];
    const numbers = await fetchNumbersFromThirdParty(numberid, bearerToken);

    if (numbers.length === 0) {
      return res.status(502).json({ 
        error: 'Failed to fetch numbers from third-party API. Check your Bearer token.',
        windowPrevState,
        windowCurrState: windowPrevState,
        numbers: [],
        avg: calcAvg(windowPrevState)
      });
    }

    for (const n of numbers) {
      if (!windowStore.includes(n)) {
        windowStore.push(n);
        if (windowStore.length > WINDOW_SIZE) {
          windowStore.shift();
        }
      }
    }

    const windowCurrState = [...windowStore];
    const avg = calcAvg(windowCurrState);

    const response: AverageResponse = {
      windowPrevState,
      windowCurrState,
      numbers,
      avg
    };

    res.json(response);
  } catch (err) {
    console.error('Request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Average Calculator Microservice running at http://localhost:${PORT}`);
});
