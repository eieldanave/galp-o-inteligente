import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import aiRouter from './routes/ai.js';
import historyRouter from './routes/history.js';
import resourcesRouter from './routes/resources.js';
import summaryRouter from './routes/summary.js';
import configRouter from './routes/config.js';
import classifierRouter from './routes/classifier.js';
import assistenteRouter from './routes/assistente.js';
import internalIARouter from './routes/internalIA.js';
import reportsRouter from './routes/reports.js';
import productsRouter from './routes/products.js';
import enderecosRouter from './routes/enderecos.js';
import ocrRouter from './routes/ocr.js';
import chatRouter from './routes/chat.js';
import debugRouter from './routes/debug.js';
import layoutRouter from './routes/layout.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: [/^http:\/\/localhost:\d+$/],
}));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api', aiRouter);
app.use('/api', historyRouter);
app.use('/api', resourcesRouter);
app.use('/api', summaryRouter);
app.use('/api', configRouter);
app.use('/api', classifierRouter);
app.use('/api', assistenteRouter);
app.use('/api', internalIARouter);
app.use('/api', reportsRouter);
app.use('/api', productsRouter);
app.use('/api', enderecosRouter);
app.use('/api', ocrRouter);
app.use('/api', chatRouter);
app.use('/api', debugRouter);
app.use('/api', layoutRouter);

app.listen(port, () => {
  console.log(`Smart Location backend rodando em http://localhost:${port}`);
});