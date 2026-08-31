// ============================================================
// ROTA NOVA PARA O BACKEND DO RENDER (pix-backend-lmzt.onrender.com)
// Processa o pagamento com CARTÃO DE CRÉDITO usando o token gerado
// pelo formulário de cartão (Card Payment Brick) no site.
//
// Cole este trecho no mesmo servidor Node.js que já processa o Pix,
// usando o MESMO Access Token de produção que já está configurado lá.
// ============================================================

const express = require('express'); // já deve existir no seu servidor
// const app = express(); // não recrie o app se ele já existe — apenas adicione a rota abaixo nele
// app.use(express.json()); // garanta que o body JSON já está sendo interpretado

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN; // o mesmo token de produção já usado no Pix

app.post('/criar-pagamento-cartao', async (req, res) => {
  try {
    const dadosCartao = req.body; // dados que vêm prontos do Card Payment Brick (token, installments, payer, etc.)

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

    // resultado.status pode ser: 'approved', 'in_process', 'rejected'
    res.json({
      status: resultado.status,
      status_detail: resultado.status_detail,
      id: resultado.id
    });

  } catch (erro) {
    console.error('Erro ao criar pagamento com cartão:', erro);
    res.status(500).json({ status: 'error', status_detail: 'erro_interno' });
  }
});

// ============================================================
// IMPORTANTE:
// 1. MP_ACCESS_TOKEN deve estar configurado como variável de ambiente
//    no Render (Settings > Environment), com o Access Token de PRODUÇÃO.
// 2. Depois que o pagamento vier como "approved", é nesse ponto que
//    você deve disparar a mensagem automática de WhatsApp para o
//    restaurante (mesma lógica já usada após a confirmação do Pix).
// 3. Faça o deploy dessa alteração no Render antes de testar o
//    formulário de cartão no site.
// ============================================================
