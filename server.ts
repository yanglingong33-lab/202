import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const API_KEY = process.env.APIMART_API_KEY || 'sk-vkQ5Q2K7Ap8BkQujcjVeFE9xMRrQbJaIR0vo8pP7Jj5aqpR4';
  let API_BASE = process.env.API_BASE_URL || 'https://api.apimart.ai/v1';
  if (API_BASE.endsWith('/images/generations')) {
      API_BASE = API_BASE.replace('/images/generations', '');
  }
  if (API_BASE.endsWith('/')) {
      API_BASE = API_BASE.slice(0, -1);
  }

  // Chat completions endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const response = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(req.body)
      });
      
      const text = await response.text();
      let data;
      try {
          data = text ? JSON.parse(text) : {};
      } catch (e) {
          throw new Error(`Failed to parse JSON target. Status: ${response.status}. Response text: ${text.substring(0, 200)}`);
      }
      
      if (!response.ok) {
        throw new Error(data.error?.message || `Failed to fetch from apimart chat: ${response.statusText}`);
      }
      res.json(data);
    } catch (e: any) {
      console.error('/api/chat error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Image generations endpoint
  app.post('/api/images', async (req, res) => {
    try {
        const response = await fetch(`${API_BASE}/images/generations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(req.body)
        });

        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (e) {
            throw new Error(`Failed to parse JSON image target. Status: ${response.status}. Response text: ${text.substring(0, 200)}`);
        }
        
        if (!response.ok) {
           throw new Error(data.error?.message || 'Failed to fetch from apimart images: ' + JSON.stringify(data));
        }

        // Check if apimart returned a task_id
        if (data.data && data.data[0] && data.data[0].task_id) {
            const taskId = data.data[0].task_id;
            let isCompleted = false;
            let taskData: any = {};
            
            // Poll task endpoint
            while (!isCompleted) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const taskRes = await fetch(`${API_BASE}/tasks/${taskId}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${API_KEY}` }
                });
                
                const taskText = await taskRes.text();
                try {
                    taskData = taskText ? JSON.parse(taskText) : {};
                } catch (e) {
                     throw new Error(`Failed to parse task JSON. Status: ${taskRes.status}. Output: ${taskText.substring(0, 200)}`);
                }
                
                if (taskData.data && taskData.data.status === 'completed') {
                    isCompleted = true;
                } else if (taskData.data && taskData.data.status === 'failed') {
                    throw new Error('Image generation task failed.');
                }
            }
            
            // Standardize output for frontend
            let urls = [];
            if (taskData.data.result && taskData.data.result.images) {
                urls = taskData.data.result.images.map((img: any) => ({
                    url: Array.isArray(img.url) ? img.url[0] : img.url
                }));
            } else if (taskData.data.images) {
                urls = taskData.data.images.map((img: any) => ({ url: img.url || img }));
            }
            
            res.json({ data: urls });
        } else {
            res.json(data);
        }
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: { message: e.message } });
    }
  });

  // Vite middleware for development
  const distPath = path.join(process.cwd(), 'dist');
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath, {
      setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
