import express from 'express';
import makeWASocket from 'baileys';
import P from 'pino';

const app = express();
app.use(express.json());

const sessions: Record<string, any> = {};

app.post('/session', async (req, res) => {
  const { action, accountId } = req.body;

  if (action === 'generate-qr') {
    const sock = makeWASocket({
      logger: P({ level: 'silent' }),
      printQRInTerminal: false
    });

    sock.ev.on('connection.update', ({ qr, connection }) => {
      if (qr) sessions[accountId] = { sock, qr, status: 'awaiting_qr' };
      if (connection === 'open') sessions[accountId].status = 'active';
    });

    return res.json({ status: 'awaiting_qr' });
  }

  if (action === 'check-status') {
    const sess = sessions[accountId];
    if (!sess) return res.json({ status: 'not_found' });
    if (sess.status === 'active') return res.json({ status: 'active' });
    if (sess.qr) return res.json({ status: 'awaiting_qr', qr: sess.qr });
  }

  return res.status(400).json({ error: 'Invalid action' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend WhatsApp rodando na porta ${PORT}`));
