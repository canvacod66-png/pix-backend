const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const ACCESS_TOKEN = 'APP_USR-2242036982054961-083009-865836b0c6479c6fc59ccd36d111a527-3650222029' // vamos colocar isso depois no Render

app.post('/gerar-pix', async (req, res) => {
  try {
    const { valor, descricao } = req.body;

    if (!valor) {
      return res.status(400).json({ error: 'Valor é obrigatório' });
    }

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'X-Idempotency-Key': Date.now().toString()
      },
      body: JSON.stringify({
        transaction_amount: Number(valor),
        description: Doacao SOS Nepal || 'Pedido do cardápio',
        payment_method_id: 'pix',
        payer: {
          email: 'teste@teste.com'
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      return res.status(response.status).json(data);
    }

    const qrCode = data.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64;

    res.json({
      id: data.id,
      status: data.status,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao gerar PIX' });
  }
});

app.get('/', (req, res) => {
  res.send('Backend PIX rodando!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
