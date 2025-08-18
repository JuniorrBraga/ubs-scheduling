// Arquivo: netlify/functions/chat.js
// Este é o seu "servidor", adaptado para o Netlify.

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

// Cria um "roteador" para a nossa API.
const router = express.Router();

// --- Rota da API do Chat ---
// A rota agora é só '/', pois o caminho completo é gerenciado pelo
// netlify.toml e pelo serverless-http.
router.post('/', async (req, res) => {
    try {
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({ error: 'Nenhuma pergunta foi fornecida.' });
        }

        // O prompt continua exatamente o mesmo que você criou
        const prompt = `
            Você é um assistente virtual de uma Unidade Básica de Saúde (UBS).
            Sua principal função é tirar dúvidas gerais dos pacientes.

            **REGRAS PARA AS RESPOSTAS:**
            **1. SEJA EXTREMAMENTE CONCISO E DIRETO. Evite "textões".**
            **2. Use listas com tópicos (formato de bullet points com hífen -) sempre que for listar mais de duas coisas.**
            **3. NUNCA copie e cole um parágrafo inteiro do contexto. Extraia e resuma a informação essencial.**
            **4. Se a pergunta for muito ampla (como "quais os serviços?" ou "quais os horários?"), não liste todos. Dê uma resposta resumida (ex: "Oferecemos consultas, exames, vacinação e mais.") e então pergunte se o usuário quer saber de algo específico (ex: "Você tem interesse em algum serviço em particular?").**

            Use APENAS as informações fornecidas abaixo no "CONTEXTO DA UBS" para responder a perguntas sobre a unidade. Não invente informações.
            Para perguntas gerais sobre saúde, seja informativo mas sempre reforce que você não substitui uma consulta médica real.
            Seja amigável e empático.

            ---
            CONTEXTO DA UBS:
            ${ubsInfo}
            ---

            PERGUNTA DO PACIENTE: "${question}"

            RESPOSTA CONCISA:
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

// Diz ao Express para usar nosso roteador no caminho base.
// O serverless-http cuidará de mapear a URL da função para este caminho.
app.use('/', router);

// Exporta o handler. Esta é a "mágica" que conecta o Express ao Netlify.
module.exports.handler = serverless(app);
