document.addEventListener('DOMContentLoaded', () => {

    // --- ESTADO GLOBAL DA APLICAÇÃO ---
    const state = {
        currentPage: 'home', // 'home', 'triage', 'result', 'dashboard'
        patientQueue: [
            { id: 1, name: 'Carlos Pereira', priority: 'Média', priorityLevel: 2, arrivalTime: new Date(Date.now() - 30 * 60000) },
            { id: 2, name: 'Ana Souza', priority: 'Baixa', priorityLevel: 1, arrivalTime: new Date(Date.now() - 45 * 60000) },
            { id: 3, name: 'Juliana Costa', priority: 'Alta', priorityLevel: 3, arrivalTime: new Date(Date.now() - 10 * 60000) },
        ],
        currentTriage: { answers: {}, score: 0, patientName: '' },
        currentUser: null
    };

    const appContainer = document.getElementById('app');

    // --- BANCO DE DADOS DAS PERGUNTAS DE TRIAGEM ---
    const triageQuestions = {
        'start': { text: 'Qual o motivo principal da sua consulta hoje?', icon: 'Stethoscope', options: [ { text: 'Novo problema ou sintoma', value: 1, next: 'symptoms' }, { text: 'Consulta de retorno', value: 3, next: 'final' }, { text: 'Renovação de receita', value: 1, next: 'final' }, { text: 'Exames de rotina', value: 1, next: 'final' } ] },
        'symptoms': { text: 'Você apresenta algum destes sintomas graves?', icon: 'AlertTriangle', options: [ { text: 'Dor no peito ou falta de ar', value: 10, next: 'fever' }, { text: 'Febre alta (acima de 38.5°C)', value: 5, next: 'pain' }, { text: 'Sangramento incomum', value: 8, next: 'pain' }, { text: 'Nenhum dos anteriores', value: 0, next: 'pain' } ] },
        'fever': { text: 'Você tem febre?', icon: 'Thermometer', options: [ { text: 'Sim', value: 3, next: 'pain' }, { text: 'Não', value: 0, next: 'pain' } ] },
        'pain': { text: 'Em uma escala de 0 a 10, qual o seu nível de dor?', icon: 'Frown', options: [ { text: 'Leve (1-3)', value: 1, next: 'chronic' }, { text: 'Moderada (4-6)', value: 3, next: 'chronic' }, { text: 'Intensa (7-10)', value: 6, next: 'chronic' } ] },
        'chronic': { text: 'Você possui alguma condição crônica?', icon: 'HeartPulse', options: [ { text: 'Sim', value: 2, next: 'final' }, { text: 'Não', value: 0, next: 'final' } ] }
    };

    // --- LÓGICA DE RENDERIZAÇÃO ---
    function render() {
        appContainer.innerHTML = '';
        let content = '';
        switch (state.currentPage) {
            case 'home': content = renderHomeScreen(); break;
            case 'triage': content = renderTriageScreen('start'); break;
            case 'result': content = renderResultScreen(); break;
            case 'dashboard':
                content = renderDashboardScreen();
                setTimeout(() => {
                    const dashboardContent = document.getElementById('dashboard-content');
                    if(dashboardContent) {
                        dashboardContent.innerHTML = renderDashboardContent();
                        attachDashboardListeners();
                    }
                }, 500);
                break;
            default: content = renderHomeScreen();
        }
        appContainer.innerHTML = content;
        attachEventListeners();
        lucide.createIcons();
    }

    // --- GERADORES DE CONTEÚDO HTML (VIEWS) ---
    function renderHomeScreen() {
        return `
            <header class="main-header fade-in">
                <div class="logo"><i data-lucide="HeartPulse"></i><span>UBS Atendimentos</span></div>
                <nav><button data-action="view-dashboard" class="btn">Área da Equipe</button></nav>
            </header>
            <main class="health-portal">
                <div class="portal-actions slide-up">
                    <h2>Saiba tudo que a UBS oferece para cuidar da sua saúde</h2>
                    <div class="actions-grid">
                        <div data-action="start-triage" class="action-card"><i data-lucide="ClipboardList"></i><span>Pronto Atendimento<br>(Iniciar Triagem)</span></div>
                        <div data-action="start-chat" class="action-card"><i data-lucide="MessageSquare"></i><span>Falar com Assistente Virtual</span></div>
                        <div data-action="view-results" class="action-card"><i data-lucide="FileText"></i><span>Resultados de Exames</span></div>
                        <div data-action="schedule-exam" class="action-card"><i data-lucide="Calendar"></i><span>Agende seus Exames</span></div>
                    </div>
                </div>
                <div class="feature-card fade-in" style="animation-delay: 0.2s;">
                    <img src="https://images.pexels.com/photos/5452293/pexels-photo-5452293.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" alt="Médico sorrindo">
                    <div class="feature-card-accent"></div>
                    <div class="feature-card-content">
                        <h3>Atendimento Humanizado</h3>
                        <p style="color: #e0e0e0; margin: 0.5rem 0 1rem 0;">Nossa prioridade é o seu bem-estar.</p>
                        <button class="btn">Saiba mais</button>
                    </div>
                </div>
            </main>
        `;
    }

    function renderHeader(title) {
        return `<header class="main-header fade-in"><div class="logo"><i data-lucide="HeartPulse"></i><span>${title}</span></div><nav><button data-action="go-home" class="btn">Voltar ao Início</button></nav></header>`;
    }

    function renderTriageScreen(questionId) {
        const question = triageQuestions[questionId];
        const optionsHtml = question.options.map(opt => `
            <button data-action="answer-triage" data-value="${opt.value}" data-next="${opt.next}" class="triage-option">
                <i data-lucide="${question.icon}"></i>
                <span>${opt.text}</span>
            </button>
        `).join('');

        return `
            ${renderHeader('Triagem Inteligente')}
            <main class="page-content">
                <div class="content-card fade-in">
                    ${!state.currentTriage.patientName ? `
                        <h2>Antes de começar, qual o seu nome?</h2>
                        <input type="text" id="patient-name-input" placeholder="Digite seu nome completo" class="input-field" />
                        <button data-action="submit-name" class="btn">Continuar</button>
                    ` : `
                        <h2>${question.text}</h2>
                        <div class="triage-options">${optionsHtml}</div>
                    `}
                </div>
            </main>
        `;
    }

    function renderResultScreen() {
        const score = state.currentTriage.score;
        let priority, priorityLevel, icon;
        if (score >= 9) { priority = 'Alta'; priorityLevel = 3; icon = 'AlertTriangle'; } 
        else if (score >= 4) { priority = 'Média'; priorityLevel = 2; icon = 'Clock'; } 
        else { priority = 'Baixa'; priorityLevel = 1; icon = 'CheckCircle'; }

        const recommendations = {
            'Alta': 'Seus sintomas indicam necessidade de atendimento prioritário. Por favor, dirija-se à recepção imediatamente.',
            'Média': 'Seu atendimento tem prioridade moderada. Aguarde o chamado no painel.',
            'Baixa': 'Seu caso é de baixa urgência. O atendimento será realizado em breve.'
        };
        const priorityClassMap = { 'Alta': 'high', 'Média': 'medium', 'Baixa': 'low' };
        const priorityClass = priorityClassMap[priority];
        
        state.patientQueue.push({ id: Date.now(), name: state.currentTriage.patientName, priority, priorityLevel, arrivalTime: new Date() });

        return `
            ${renderHeader('Resultado da Triagem')}
            <main class="page-content">
                <div class="content-card fade-in">
                    <div class="result-icon bg-${priorityClass}"><i data-lucide="${icon}" class="priority-${priorityClass}"></i></div>
                    <h2>Olá, ${state.currentTriage.patientName}!</h2>
                    <p class="text-light" style="margin-top: -1.5rem; margin-bottom: 1rem;">Sua prioridade de atendimento é:</p>
                    <p class="result-priority priority-${priorityClass}">${priority}</p>
                    <div class="recommendation-box">
                        <h3 style="font-weight: 700; margin-bottom: 0.5rem;">Recomendação:</h3>
                        <p class="text-light">${recommendations[priority]}</p>
                    </div>
                    <button data-action="go-home" class="btn" style="margin-top: 2rem; width: 100%;">Entendido</button>
                </div>
            </main>
        `;
    }

    function renderDashboardScreen() {
        return `
            ${renderHeader('Painel de Atendimento')}
            <main id="dashboard-content" class="page-content">
                <div class="dashboard-grid">
                    <div class="patient-card" style="background-color: #e9ecef; border: none; animation: pulse 1.5s infinite ease-in-out;"></div>
                    <div class="patient-card" style="background-color: #e9ecef; border: none; animation: pulse 1.5s infinite ease-in-out .2s;"></div>
                </div>
            </main>
        `;
    }

    function renderDashboardContent() {
        const sortedQueue = [...state.patientQueue].sort((a, b) => b.priorityLevel - a.priorityLevel || a.arrivalTime - b.arrivalTime);
        if (sortedQueue.length === 0) {
            return `<div class="content-card fade-in"><i data-lucide="CheckSquare" class="result-icon bg-low priority-low"></i><h2>Nenhum paciente na fila.</h2></div>`;
        }
        return sortedQueue.map((p, i) => {
            const timeWaiting = Math.round((new Date() - new Date(p.arrivalTime)) / 60000);
            const priorityClass = p.priority.toLowerCase();
            return `
                <div class="patient-card priority-${priorityClass} fade-in" style="animation-delay: ${i * 100}ms">
                    <div class="patient-info">
                        <div class="name">${p.name}</div>
                        <div class="details"><i data-lucide="Clock" style="width:16px;"></i>Aguardando há ${timeWaiting} min</div>
                    </div>
                    <div class="patient-actions">
                        <span class="priority-tag tag-${priorityClass}">${p.priority}</span>
                        <button data-action="call-patient" data-id="${p.id}" class="btn"><i data-lucide="Megaphone"></i>Chamar</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- MANIPULADORES DE EVENTOS ---
    function attachEventListeners() {
        document.body.addEventListener('click', (event) => {
            const target = event.target.closest('[data-action]');
            if (!target) return;
            const action = target.dataset.action;
            const actions = {
                'start-chat': () => document.getElementById('chat-bubble')?.click(),
                'start-triage': () => { state.currentPage = 'triage'; state.currentTriage = { answers: {}, score: 0, patientName: '' }; render(); },
                'view-dashboard': () => { state.currentPage = 'dashboard'; render(); },
                'go-home': () => { state.currentPage = 'home'; render(); },
                'submit-name': () => {
                    const input = document.getElementById('patient-name-input');
                    if (input && input.value.trim()) { state.currentTriage.patientName = input.value.trim(); render(); } 
                    else { alert('Por favor, digite seu nome.'); }
                },
                'answer-triage': () => {
                    state.currentTriage.score += parseInt(target.dataset.value, 10);
                    if (target.dataset.next === 'final') { state.currentPage = 'result'; render(); } 
                    else { appContainer.innerHTML = renderTriageScreen(target.dataset.next); attachEventListeners(); lucide.createIcons(); }
                },
                'call-patient': () => {
                    state.patientQueue = state.patientQueue.filter(p => p.id !== parseInt(target.dataset.id, 10));
                    document.getElementById('dashboard-content').innerHTML = renderDashboardContent();
                    attachDashboardListeners();
                },
                'view-results': () => alert('Funcionalidade a ser implementada.'),
                'schedule-exam': () => alert('Funcionalidade a ser implementada.'),
            };
            if (actions[action]) { event.preventDefault(); actions[action](); }
        });
    }

    function attachDashboardListeners() { lucide.createIcons(); }

    // --- INICIALIZAÇÃO ---
    render();
});