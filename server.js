// server.js



const express = require('express');

const cors = require('cors');

require('dotenv').config(); // Carrega as variáveis do arquivo .env



const { GoogleGenerativeAI } = require('@google/generative-ai');

const { ubsInfo } = require('./knowledge_base.js'); // Importa o nosso "banco de dados"



const app = express();

const port = 3000;



// --- Configurações do Servidor ---

app.use(cors()); // Permite que o frontend (em outra porta) acesse este servidor

app.use(express.json()); // Permite que o servidor entenda JSON nas requisições



// Informa ao Express para servir os arquivos estáticos da pasta 'public'

// É assim que o navegador encontrará seu index.html, script.js, etc.

app.use(express.static('public'));



// Inicializa o cliente do Gemini

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });



// --- Rota da API do Chat ---

app.post('/chat', async (req, res) => {

    try {

        const { question } = req.body;



        if (!question) {

            return res.status(400).json({ error: 'Nenhuma pergunta foi fornecida.' });

        }



        // Monta o prompt para a IA

        // DENTRO DO app.post('/chat', async (req, res) => { ... });

        const prompt = `
    Você é um assistente virtual de uma Unidade Básica de Saúde (UBS).
    Sua principal função é tirar dúvidas gerais dos pacientes sobre a unidade e sobre saúde, de forma clara e objetiva.
    Use APENAS as informações fornecidas abaixo no "CONTEXTO DA UBS" para responder a perguntas sobre horários, serviços, e procedimentos da unidade. Não invente informações.
    
    **REGRA DE SEGURANÇA CRÍTICA: Se a pergunta do paciente indicar sintomas de urgência (como "dor no peito", "falta de ar", "passando mal", "febre alta", "sangramento"), NÃO FAÇA UMA AVALIAÇÃO. Sua ÚNICA resposta deve ser orientá-lo de forma calma e clara a usar o sistema de "Pronto Atendimento" para uma triagem adequada. Exemplo de resposta: "Entendo sua preocupação. Para sintomas como esse, o mais seguro é fazer uma triagem. Por favor, volte ao início e clique em 'Pronto Atendimento' para começar."**

    Para perguntas gerais sobre saúde, seja informativo mas sempre reforce que você não substitui uma consulta médica real e que, em caso de sintomas graves, o paciente deve procurar atendimento (usando a ferramenta de Pronto Atendimento).
    Seja amigável e empático.

    ---
    CONTEXTO DA UBS:
    ${ubsInfo}
    ---

    PERGUNTA DO PACIENTE: "${question}"

    RESPOSTA:
`;



        // Chama a API do Gemini

        const result = await model.generateContent(prompt);

        const response = await result.response;

        const text = response.text();



        // Envia a resposta da IA de volta para o frontend

        res.json({ answer: text });



    } catch (error) {

        console.error("Erro ao processar a requisição do chat:", error);

        res.status(500).json({ error: 'Ocorreu um erro ao comunicar com o assistente virtual.' });

    }

});



app.listen(port, () => {

    console.log(`🤖 Servidor do chat rodando em http://localhost:${port}`);

});