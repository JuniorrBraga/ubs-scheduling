// Arquivo: netlify/functions/chat.js
// Este é o seu novo "servidor", adaptado para o Netlify.

const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');
// IMPORTANTE: O caminho para a base de conhecimento precisa ser ajustado
// para sair da pasta /netlify/functions e encontrar o arquivo na raiz.
const { ubsInfo } = require('../../knowledge_base.js');

const app = express();

// --- Configurações do Servidor ---
app.use(cors());
app.use(express.json());

// Inicializa o cliente do Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Cria um "roteador" para a nossa API. É uma boa prática para organizar rotas.
const router = express.Router();

// --- Rota da API do Chat ---
// Note que a rota agora é só '/', pois o caminho completo será definido abaixo.
router.post('/', async (req, res) => {
    try {
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({ error: 'Nenhuma pergunta foi fornecida.' });
        }

        // O prompt continua exatamente o mesmo
        const prompt = `
            Você é um assistente virtual de uma Unidade Básica de Saúde (UBS).
            Sua principal função é tirar dúvidas gerais dos pacientes sobre a unidade e sobre saúde, de forma clara e objetiva.
            Use APENAS as informações fornecidas abaixo no "CONTEXTO DA UBS" para responder a perguntas sobre horários, serviços, e procedimentos da unidade. Não invente informações.
            Para perguntas gerais sobre saúde, seja informativo mas sempre reforce que você não substitui uma consulta médica real e que, em caso de sintomas graves, o paciente deve procurar atendimento.
            Seja amigável e empático.

            ---
            CONTEXTO DA UBS:
            ${ubsInfo}
            ---

            PERGUNTA DO PACIENTE: "${question}"

            RESPOSTA:
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        res.json({ answer: text });

    } catch (error) {
        console.error("Erro ao processar a requisição do chat:", error);
        res.status(500).json({ error: 'Ocorreu um erro ao comunicar com o assistente virtual.' });
    }
});

// Diz ao Express para usar nosso roteador no caminho específico do Netlify
app.use('/.netlify/functions/chat', router);

// Exporta o handler. Esta é a "mágica" que conecta o Express ao Netlify.
module.exports.handler = serverless(app);
