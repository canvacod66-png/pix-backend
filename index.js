// ============================================================
// BACKEND COMPLETO - Recanto do Ceviche
// Rotas: Pix (gerar + checar status) e Cartão de crédito
// ============================================================

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors()); // libera chamadas vindas do site (Netlify/GitHub Pages)
app.use(express.json());

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN; // Access Token de PRODUÇÃO do Mercado Pago

// ============================================================
// PIX
// ============================================================

// Cria uma cobrança Pix de verdade e devolve o código Copia-e-Cola + QR Code
app.post('/gerar-pix', async (req, res) => {
  try {
    const { valor, descricao } = req.body;

    const idempotencyKey = 'pix-' + Date.now() + '-' + Math.random().toString(36).slice(2);

    const resposta = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + ACCESS_TOKEN,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        transaction_amount: Number(valor),
        description: descricao || 'Pedido - Recanto do Ceviche',
        payment_method_id: 'pix',
        payer: {
          email: 'cliente@recantodoceviche.com.br' // Mercado Pago exige um e-mail, não precisa ser real
        }
      })
    });

    const resultado = await resposta.json();

    if (!resultado.point_of_interaction) {
      console.error('Falha ao criar Pix:', JSON.stringify(resultado));
      return res.status(502).json({
        message: resultado.message || 'Não foi possível gerar o Pix',
        causa: resultado.cause || [],
        detalhe: resultado
      });
    }

    const dadosPix = resultado.point_of_interaction.transaction_data;

    res.json({
      id: resultado.id,
      qr_code: dadosPix.qr_code,
      qr_code_base64: dadosPix.qr_code_base64
    });

  } catch (erro) {
    console.error('Erro ao criar pagamento Pix:', erro);
    res.status(500).json({ message: 'Erro interno ao gerar Pix' });
  }
});

// Consulta se o Pix já foi pago
app.get('/status-pix/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const resposta = await fetch('https://api.mercadopago.com/v1/payments/' + id, {
      headers: { 'Authorization': 'Bearer ' + ACCESS_TOKEN }
    });
    const resultado = await resposta.json();

    res.json({
      status: resultado.status,          // 'approved', 'pending', 'rejected', 'cancelled', etc.
      status_detail: resultado.status_detail
    });

  } catch (erro) {
    console.error('Erro ao checar status do Pix:', erro);
    res.status(500).json({ status: 'error' });
  }
});

// ============================================================
// CARTÃO DE CRÉDITO
// ============================================================

app.post('/criar-pagamento-cartao', async (req, res) => {
  try {
    const dadosCartao = req.body; // vem pronto do Card Payment Brick (token, installments, payer, etc.)

    const idempotencyKey = 'cartao-' + Date.now() + '-' + Math.random().toString(36).slice(2);

    const resposta = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + ACCESS_TOKEN,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        transaction_amount: Number(dadosCartao.transaction_amount),
        token: dadosCartao.token,
        description: 'Pedido - Recanto do Ceviche',
        installments: Number(dadosCartao.installments),
        payment_method_id: dadosCartao.payment_method_id,
        issuer_id: dadosCartao.issuer_id,
        payer: {
          email: dadosCartao.payer.email,
          identification: {
            type: dadosCartao.payer.identification.type,
            number: dadosCartao.payer.identification.number
          }
        }
      })
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      // A REQUISIÇÃO em si falhou (não é o cartão sendo recusado) — o Mercado
      // Pago manda o motivo detalhado em "message" e "cause". Logamos tudo
      // aqui pra você conseguir ver a causa real no log do Render.
      console.error('Mercado Pago recusou a requisição de cartão:', JSON.stringify(resultado));
      return res.status(400).json({
        status: 'error',
        status_detail: resultado.message || 'requisicao_invalida',
        causa: resultado.cause || []
      });
    }

    res.json({
      status: resultado.status,          // 'approved', 'in_process', 'rejected'
      status_detail: resultado.status_detail,
      id: resultado.id
    });

  } catch (erro) {
    console.error('Erro ao criar pagamento com cartão:', erro);
    res.status(500).json({ status: 'error', status_detail: 'erro_interno' });
  }
});

// ============================================================
// INICIA O SERVIDOR
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor rodando na porta ' + PORT);
});
