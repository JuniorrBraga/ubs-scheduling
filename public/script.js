// script.js

document.addEventListener('DOMContentLoaded', () => {

    // --- BANCO DE DADOS E PERGUNTAS (Simulado) ---
    // Usaremos a primeira versão do seu banco de dados para manter a aplicação principal funcionando
    const patientDatabase = {
        'Carlos Pereira': { hasChronicCondition: true, conditions: ['Hipertensão'] },
        'Ana Souza': { hasChronicCondition: false, conditions: [] },
        'Juliana Costa': { hasChronicCondition: true, conditions: ['Asma'] },
    };

    const triageQuestions = {
        'start': {
            text: 'Qual o motivo principal da sua consulta hoje?',
            icon: 'Stethoscope',
            options: [
                { text: 'Novo problema ou sintoma', value: 1, next: 'symptoms' },
                { text: 'Consulta de retorno', value: 3, next: 'final' },
                { text: 'Renovação de receita', value: 1, next: 'final' },
                { text: 'Exames de rotina', value: 1, next: 'final' }
            ]
        },
        'symptoms': {
            text: 'Você apresenta algum destes sintomas graves?',
            icon: 'AlertTriangle',
            options: [
                { text: 'Dor no peito ou falta de ar', value: 10, next: 'fever' },
                { text: 'Febre alta (acima de 38.5°C)', value: 5, next: 'pain' },
                { text: 'Sangramento incomum', value: 8, next: 'pain' },
                { text: 'Nenhum dos anteriores', value: 0, next: 'pain' }
            ]
        },
        'fever': { /* ... Mantenha as outras perguntas ... */ },
        'pain': { /* ... Mantenha as outras perguntas ... */ },
        'chronic': { /* ... Mantenha as outras perguntas ... */ }
    };

    // --- ESTADO GLOBAL DA APLICAÇÃO ---
    const state = {
        currentPage: 'login', // 'login', 'triage', 'result', 'dashboard', 'callPanel'
        patientQueue: [
            { id: 1, name: 'Carlos Pereira', priority: 'Média', priorityLevel: 2, symptoms: ['Tosse persistente', 'Febre baixa'], arrivalTime: new Date(Date.now() - 30 * 60000) },
            { id: 2, name: 'Ana Souza', priority: 'Baixa', priorityLevel: 1, symptoms: ['Renovação de receita'], arrivalTime: new Date(Date.now() - 45 * 60000) },
            { id: 3, name: 'Juliana Costa', priority: 'Alta', priorityLevel: 3, symptoms: ['Dor no peito', 'Falta de ar'], arrivalTime: new Date(Date.now() - 10 * 60000) },
        ],
        currentTriage: {
            answers: {},
            score: 0,
            patientName: ''
        },
        currentUser: null,
        currentlyCalling: null
    };

    const appContainer = document.getElementById('app');

    // --- LÓGICA DE RENDERIZAÇÃO ---
    function render() {
        appContainer.innerHTML = '';
        let content = '';

        // O switch agora não tem mais o case 'chat'
        switch (state.currentPage) {
            case 'login':
                content = renderLoginScreen(); // Mantenha sua função original renderLoginScreen
                break;
            case 'triage':
                content = renderTriageScreen('start'); // Mantenha sua função original renderTriageScreen
                break;
            case 'result':
                content = renderResultScreen(); // Mantenha sua função original renderResultScreen
                break;
            case 'dashboard':
                content = renderDashboardScreen(); // Mantenha sua função original renderDashboardScreen
                break;
            case 'callPanel':
                content = renderCallPanelScreen(); // Mantenha sua função original renderCallPanelScreen
                break;
        }

        appContainer.innerHTML = content;
        attachEventListeners();
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // --- GERADORES DE CONTEÚDO HTML (VIEWS) ---
    // Mantenha todas as suas funções de renderização originais aqui:
    // renderLoginScreen(), renderTriageScreen(), renderResultScreen(), renderDashboardScreen(), etc.
    // **NÃO** adicione a antiga função renderChatScreen().

    // Exemplo de como uma de suas funções de renderização deve ser.
    // Cole aqui suas funções originais.
    function renderLoginScreen() {
        // ...seu código HTML para a tela de login...
        // O botão "Falar com Atendente" deve ter o atributo data-action="start-chat"
        return `
            <main class="health-portal">
                <div data-action="start-triage" class="action-card">
                    <i data-lucide="ClipboardList"></i>
                    <span>Entrar na Fila de Atendimento</span>
                </div>
                <div data-action="start-chat" class="action-card">
                    <i data-lucide="MessageCircle"></i>
                    <span>Falar com Assistente Virtual</span>
                </div>
            </main>
        `;
    }
    // ... cole as outras funções de renderização aqui ...


    // --- MANIPULADORES DE EVENTOS ---
    function attachEventListeners() {
        // Este listener agora é mais genérico e funciona para todas as ações
        document.body.addEventListener('click', (event) => {
            const actionTarget = event.target.closest('[data-action]');
            if (!actionTarget) return;

            const action = actionTarget.dataset.action;
            switch(action) {
                case 'start-triage': startTriage(); break;
                case 'start-chat': startChat(); break; // <-- Ação do chat
                case 'view-dashboard': viewDashboard(); break;
                case 'go-home': goHome(); break;
                // Adicione outros 'cases' para outras ações como 'call-patient', etc.
            }
        });
    }

    // --- Funções de Ação ---
    function goHome() { state.currentPage = 'login'; render(); }
    function startTriage() { state.currentPage = 'triage'; render(); }
    function viewDashboard() { state.currentPage = 'dashboard'; render(); }

    // ESTA É A NOVA FUNÇÃO DE CHAT - ELA ATIVA O WIDGET DO chat.js
    function startChat() {
        // Encontra o balão de chat criado pelo chat.js e simula um clique
        const chatBubble = document.getElementById('chat-bubble');
        if (chatBubble) {
            chatBubble.click();
        } else {
            console.error("O widget de chat (chat.js) não parece estar carregado.");
        }
    }

    // --- Lógica da Aplicação (Triagem, Dashboard, etc.) ---
    // Mantenha aqui toda a sua lógica de negócio original:
    // submitNameAndStart(), handleTriageAnswer(), callPatient(), etc.
    
    // --- INICIALIZAÇÃO ---
    render();
});