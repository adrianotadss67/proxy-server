// server.js
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { pipeline } from 'stream';
import { promisify } from 'util';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const streamPipeline = promisify(pipeline);

// Middleware JSON
app.use(express.json());

/**
 * ROTA 1 — API de clima
 */
app.post('/api/clima', async (req, res) => {
  const { lat, lon } = req.body;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude e longitude são obrigatórias.' });
  }

  console.log(`[+] Localização recebida: lat=${lat}, lon=${lon}, hora=${new Date().toISOString()}`);

  const apiKey = process.env.OPENWEATHER_KEY;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=pt_br&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('[!] Erro ao buscar clima:', err);
    res.status(500).json({ error: 'Erro ao buscar clima' });
  }
});

/**
 * ROTA 2 — Proxy para contornar X-Frame-Options
 */
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('URL obrigatória');
  }

  try {
    console.log(`[Proxy] Requisitando: ${targetUrl}`);
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    // Clonar os cabeçalhos e remover restrições
    const headers = {};
    response.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k !== 'x-frame-options' && k !== 'content-security-policy') {
        headers[key] = value;
      }
    });

    res.writeHead(response.status, headers);
    await streamPipeline(response.body, res);
  } catch (err) {
    console.error('[!] Erro no proxy:', err);
    res.status(500).send('Erro ao carregar conteúdo proxy');
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

