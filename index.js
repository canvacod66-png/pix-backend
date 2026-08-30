const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || 'APP_USR-2242036982054961-083009-865836b0c6479c6fc59ccd36d111a527-3650222029';

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
        description: descricao || 'Doacao SOS Nepal',
        payment_method_id: 'pix',
        payer: {
          email: 'teste@teste.com'
        }
      })
    });

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
