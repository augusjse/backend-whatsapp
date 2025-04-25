const express = require('express');
const { default: makeWASocket, useMultiFileAuthState } = require('baileys');
const P = require('pino');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

const sessions = {};

app.post('/session', async (req, res) => {
  const { action, accountId } = req.body;

  if (action === 'generate-qr') {
    const { state, saveCreds } = await useMultiFileAuthState(`auth_${accountId}`);

    const sock = makeWASocket({
      auth: state,
      logger: P({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Ubuntu', 'Firefox', '110.0.1']
    });

    sock.ev.on('creds.update', saveCreds);  // Salva o auth

    sock.ev.on('connection.update', ({ qr, connection, lastDisconnect }) => {
      console.log('🔄 Atualização de conexão:', { connection, lastDisconnect });
    
      if (qr) {
        sessions[accountId] = { sock, qr, status: 'awaiting_qr' };
        qrcode.generate(qr, { small: true });
        console.log('📲 QR Code gerado, escaneia aí!');
      }
      if (connection === 'open') {
        sessions[accountId].status = 'active';
        console.log('✅ Conectado ao WhatsApp com sucesso!');
      }
      if (connection === 'close') {
        console.log('❌ Conexão fechada:', lastDisconnect?.error?.message);
      }
    });

    return res.json({ status: 'awaiting_qr' });
  }

  if (action === 'check-status') {
    const sess = sessions[accountId];
    if (!sess) return res.json({ status: 'not_found' });
    if (sess.status === 'active') return res.json({ status: 'active' });
    if (sess.qr) return res.json({ status: 'awaiting_qr' });
  }

  return res.status(400).json({ error: 'Invalid action' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend WhatsApp rodando na porta ${PORT}`));
