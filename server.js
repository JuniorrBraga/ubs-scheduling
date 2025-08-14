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

// Informa ao Express para servir os arquivos estáticos da pasta