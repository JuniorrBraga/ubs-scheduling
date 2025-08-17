// Funções do Firebase que vamos usar
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Configura a região do servidor para São Paulo para menor latência
setGlobalOptions({ region: "southamerica-east1" });

// IMPORTANTE: Configure sua chave da API do Gemini no terminal
// Rode: firebase functions:config:set gemini.key="SUA_CHAVE_API_AQUI"
const API_KEY = process.env.GEMINI_KEY;
if (!API_KEY) {
    logger.error("Chave da API do Gemini não configurada.");
}

// Inicializa o cliente do Gemini
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Conhecimento da UBS
const ubsInfo = `
    Nome da Unidade: UBS Atendimentos
    Horário de Funcionamento: Segunda a Sexta, das 07:00 às 19:00.
    Serviços Oferecidos: Consultas médicas, vacinação, curativos, farmácia básica, coleta de exames.
    Telefone para Contato: (11) 5555-1234
    Agendamento: O agendamento de consultas de rotina é feito presencialmente ou por telefone. Atendimentos de urgência são por ordem de chegada após triagem.
`;

// Rota de chat como uma Cloud Function
exports.chat = onRequest({ cors: true }, async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).send("Método não permitido");
    }

    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ error: "Nenhuma pergunta foi fornecida." });
        }

        const prompt = `
            Você é um assistente virtual de uma Unidade Básica de Saúde (UBS).
            Sua principal função é tirar dúvidas gerais dos pacientes.
            Use APENAS as informações fornecidas no "CONTEXTO DA UBS". Não invente informações.
            Sempre reforce que você não substitui uma consulta médica real.
            Seja amigável e empático.

            ---
            CONTEXTO DA UBS: ${ubsInfo}
            ---

            PERGUNTA DO PACIENTE: "${question}"

            RESPOSTA:
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ answer: text });

    } catch (error) {
        logger.error("Erro ao processar a requisição do chat:", error);
        res.status(500).json({ error: "Ocorreu um erro ao comunicar com o assistente virtual." });
    }
});
