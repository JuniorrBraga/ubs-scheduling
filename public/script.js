document.addEventListener('DOMContentLoaded', () => {

    // --- BANCO DE DADOS E PERGUNTAS (Simulado) ---
    const patientDatabase = { 'Carlos Pereira': { hasChronicCondition: true, conditions: ['Hipertensão'] } };
    const triageQuestions = { 'start': { text: 'Qual o motivo principal da sua consulta hoje?', icon: 'Stethoscope', options: [ { text: 'Novo problema ou sintoma', value: 1, next: 'symptoms' }, { text: 'Consulta de retorno', value: 3, next: 'final' } ] }, 'symptoms': { text: 'Você apresenta algum destes sintomas de alerta?', icon: 'AlertTriangle', options: [ { text: 'Dor no peito ou falta de ar severa', value: 10, next: 'final' }, { text: 'Nenhum dos anteriores', value: 0, next: 'final' } ] } };

    // --- ESTADO GLOBAL DA APLICAÇÃO ---
    const state = {
        currentPage: 'home', // 'home', 'triage', 'result', 'chat', 'dashboard', 'callPanel'
        patientQueue: [ { id: 3, name: 'Juliana Costa', priority: 'Alta', priorityLevel: 3, symptoms: ['Dor no peito'], arrivalTime: new Date(Date.now() - 10 * 60000) } ],
        currentTriage: { answers: {}, score: 0, patientName: '' },
        currentUser: null,
        currentlyCalling: null,
        chatMessages: [],
        activeIntervals: []
    };

    const appContainer = document.getElementById('app');

    // --- LÓGICA DE RENDERIZAÇÃO ---
    function render() {
        state.activeIntervals.forEach(clearInterval);
        state.activeIntervals = [];

        let content = '';
        switch (state.currentPage) {
            case 'home': content = renderHomeScreen(); break;
            case 'triage': content = renderTriageScreen('start'); break;
            case 'result': content = renderResultScreen(); break;
            case 'chat': content = renderChatScreen(); break;
            case 'dashboard': content = renderDashboardScreen(); break;
            case 'callPanel': content = renderCallPanelScreen(); break;
        }
        appContainer.innerHTML = content;
        attachEventListeners();
        lucide.createIcons();
    }
    
    // --- TEMPLATES DE TELA (VIEWS) ---

    function renderHeader(isStaff = false) {
        const staffButton = `<button data-action="view-dashboard" class="btn btn-primary">Área do Colaborador</button>`;
        const homeButton = `<button data-action="go-home" class="btn btn-primary">Voltar ao Início</button>`;
        
        return `
            <header class="main-header">
                <div class="logo">
                    <i data-lucide="HeartPulse" class="h-8 w-8"></i>
                    <span>UBS | Agendamento Inteligente</span>
                </div>
                <nav class="nav-actions">
                    ${state.currentPage === 'home' ? staffButton : homeButton}
                </nav>
            </header>
        `;
    }

    function renderHomeScreen() {
        return `
            ${renderHeader()}
            <main class="health-portal fade-in">
                <div class="portal-actions slide-up">
                    <h2>Acesso Rápido e Inteligente aos Serviços da sua UBS</h2>
                    <div class="actions-grid grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div data-action="start-triage" class="action-card">
                            <i data-lucide="ClipboardList"></i>
                            <span>Entrar na Fila de Atendimento<br>(Triagem Inteligente)</span>
                        </div>
                        <div data-action="start-chat" class="action-card">
                            <i data-lucide="MessageCircle"></i>
                            <span>Falar com Atendente<br>(Assistente Virtual)</span>
                        </div>
                    </div>
                </div>
                <div class="feature-card slide-up" style="animation-delay: 0.2s;">
                    <img src="https://images.pexels.com/photos/8460157/pexels-photo-8460157.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" alt="Enfermeira atendendo paciente em uma UBS">
                    <div class="feature-card-content">
                        <h3>Sua Saúde, Nossa Prioridade</h3>
                        <p class="text-slate-300 mb-4">Utilize nosso sistema para um atendimento mais ágil e eficiente na sua Unidade Básica de Saúde.</p>
                        <button class="btn">Saiba mais</button>
                    </div>
                    <div class="feature-card-accent"></div>
                </div>
            </main>
        `;
    }

    function renderChatScreen() {
        const messagesHtml = state.chatMessages.map(msg => `
            <div class="chat-message ${msg.sender === 'user' ? 'user-message' : 'ai-message'}">
                ${msg.text}
            </div>
        `).join('');

        return `
            ${renderHeader()}
            <div class="chat-container fade-in">
                <div class="chat-header">Assistente Virtual da UBS</div>
                <div class="chat-messages" id="chat-messages">
                    ${messagesHtml}
                </div>
                <div class="chat-input-area">
                    <input type="text" id="chat-input" placeholder="Digite sua mensagem...">
                    <button id="send-chat-message" class="btn btn-primary" style="border-radius: 50%; padding: 0.75rem;"><i data-lucide="Send"></i></button>
                </div>
            </div>
        `;
    }

    // Por uma questão de exemplo, as telas de triagem e dashboard estão simplificadas.
    // A lógica interna delas deve ser mantida, aplicando apenas o novo cabeçalho e as classes de estilo.
    function renderTriageScreen(questionId) {
        return `${renderHeader()} 
                <main class="p-8">
                    <h1 class="text-2xl font-bold text-center">Tela de Triagem</h1>
                    <p class="text-center text-slate-600 mt-2">A lógica das perguntas da triagem deve ser mantida aqui, dentro de um card.</p>
                </main>`;
    }
    
    function renderDashboardScreen() {
         return `${renderHeader(true)} 
                <main class="p-8">
                    <h1 class="text-2xl font-bold text-center">Painel da Equipe</h1>
                    <p class="text-center text-slate-600 mt-2">O painel de gerenciamento da fila de pacientes deve ser renderizado aqui.</p>
                </main>`;
    }

    function renderResultScreen() { return ``; }
    function renderCallPanelScreen() { return ``; }


    // --- LÓGICA DE NEGÓCIO E EVENTOS ---

    function attachEventListeners() {
        const actions = {
            'go-home': goHome,
            'start-triage': startTriage,
            'start-chat': startChat,
            'view-dashboard': viewDashboard,
        };
        document.querySelectorAll('[data-action]').forEach(el => {
            const actionName = el.dataset.action;
            if (actions[actionName]) {
                el.addEventListener('click', actions[actionName]);
            }
        });

        if (state.currentPage === 'chat') {
            document.getElementById('send-chat-message')?.addEventListener('click', handleSendMessage);
            document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleSendMessage();
            });
        }
    }
    
    // --- Funções de Ação ---
    function goHome() { state.currentPage = 'home'; render(); }
    function startTriage() { state.currentPage = 'triage'; render(); }
    function viewDashboard() { state.currentPage = 'dashboard'; render(); }
    
    function startChat() {
        state.currentPage = 'chat';
        if (state.chatMessages.length === 0) {
            // ALTERAÇÃO: Mensagem inicial do assistente
            state.chatMessages.push({ sender: 'ai', text: 'Olá! Sou o assistente virtual do sistema de agendamento da UBS. Como posso ajudar você hoje?' });
        }
        render();
        // Garante que a tela de chat comece no final após a renderização
        setTimeout(scrollToChatBottom, 0);
    }

    function handleSendMessage() {
        const input = document.getElementById('chat-input');
        if (!input || input.value.trim() === '') return;

        state.chatMessages.push({ sender: 'user', text: input.value });
        const userMessage = input.value;
        input.value = '';

        render();
        scrollToChatBottom();

        setTimeout(() => {
            const aiResponse = getAIResponse(userMessage);
            state.chatMessages.push({ sender: 'ai', text: aiResponse });
            render();
            scrollToChatBottom();
        }, 1200);
    }
    
    function getAIResponse(userMessage) {
        const lowerCaseMessage = userMessage.toLowerCase();
        if (lowerCaseMessage.includes('endereço') || lowerCaseMessage.includes('local')) {
            return 'Para saber o endereço da sua UBS, por favor, consulte o site da prefeitura da sua cidade.';
        } else if (lowerCaseMessage.includes('documentos')) {
            return 'Para ser atendido, por favor, traga um documento de identidade com foto e o seu cartão do SUS.';
        } else if (lowerCaseMessage.includes('horário')) {
            return 'Nossa UBS funciona de segunda a sexta, das 07h às 19h. A sala de vacinas fecha às 18:30h.';
        } else {
            return 'Desculpe, não entendi sua pergunta. Você pode tentar reformular ou, se for um caso de emergência, ligue para o 192.';
        }
    }

    function scrollToChatBottom() {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // --- INICIALIZAÇÃO ---
    render();
});