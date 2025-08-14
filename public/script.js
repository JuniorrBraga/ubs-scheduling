document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO GLOBAL DA APLICAÇÃO ---
    const state = {
        currentPage: 'home', // 'home', 'triage', 'result', 'dashboard', 'callPanel'
        patientQueue: [
            { 
                id: 1, 
                name: 'Carlos Pereira', 
                priority: 'Média', 
                priorityLevel: 2, 
                arrivalTime: new Date(Date.now() - 30 * 60000) 
            },
            { 
                id: 2, 
                name: 'Ana Souza', 
                priority: 'Baixa', 
                priorityLevel: 1, 
                arrivalTime: new Date(Date.now() - 45 * 60000) 
            },
            { 
                id: 3, 
                name: 'Juliana Costa', 
                priority: 'Alta', 
                priorityLevel: 3, 
                arrivalTime: new Date(Date.now() - 10 * 60000) 
            },
        ],
        currentTriage: {
            answers: {},
            score: 0,
            patientName: ''
        },
        currentlyCalling: null, // Armazena o paciente sendo chamado
        activeInterval: null // Para controlar o relógio do painel
    };

    const appContainer = document.getElementById('app');

    // --- BANCO DE DADOS DAS PERGUNTAS DE TRIAGEM ---
    const triageQuestions = {
    'start': {
        text: 'Qual o motivo principal da sua consulta hoje?',
        icon: 'stethoscope',
        options: [
            { text: 'Novo problema ou sintoma', value: 1, next: 'symptoms' },
            { text: 'Consulta de retorno', value: 3, next: 'final' },
            { text: 'Renovação de receita', value: 1, next: 'final' },
            { text: 'Exames de rotina', value: 1, next: 'final' }
        ]
    },
    'symptoms': {
        text: 'Você apresenta algum destes sintomas graves?',
        icon: 'alert-triangle',
        options: [
            { text: 'Dor no peito ou falta de ar', value: 10, next: 'fever' },
            { text: 'Febre alta (acima de 38.5°C)', value: 5, next: 'pain' },
            { text: 'Sangramento incomum', value: 8, next: 'pain' },
            { text: 'Nenhum dos anteriores', value: 0, next: 'pain' }
        ]
    },
    'fever': {
        text: 'Você tem febre?',
        icon: 'thermometer',
        options: [
            { text: 'Sim', value: 3, next: 'pain' },
            { text: 'Não', value: 0, next: 'pain' }
        ]
    },
    'pain': {
        text: 'Em uma escala de 0 a 10, qual o seu nível de dor?',
        icon: 'frown',
        options: [
            { text: 'Leve (1-3)', value: 1, next: 'chronic' },
            { text: 'Moderada (4-6)', value: 3, next: 'chronic' },
            { text: 'Intensa (7-10)', value: 6, next: 'chronic' }
        ]
    },
    'chronic': {
        text: 'Você possui alguma condição crônica?',
        icon: 'heart-pulse',
        options: [
            { text: 'Sim', value: 2, next: 'final' },
            { text: 'Não', value: 0, next: 'final' }
        ]
    }
};

    // --- LÓGICA DE RENDERIZAÇÃO ---
    function render() {
        // Limpa qualquer intervalo ativo (como o relógio) antes de renderizar uma nova página
        if (state.activeInterval) {
            clearInterval(state.activeInterval);
            state.activeInterval = null;
        }

        appContainer.innerHTML = '';
        let content = '';

        switch (state.currentPage) {
            case 'home':
                content = renderHomeScreen();
                break;
            case 'triage':
                content = renderTriageScreen('start');
                break;
            case 'result':
                content = renderResultScreen();
                break;
            case 'dashboard':
                content = renderDashboardScreen();
                setTimeout(() => {
                    const dashboardContent = document.getElementById('dashboard-content');
                    if(dashboardContent) {
                        dashboardContent.innerHTML = renderDashboardContent();
                        if (typeof lucide !== 'undefined') {
                            lucide.createIcons();
                        }
                    }
                }, 500);
                break;
            case 'callPanel':
                content = renderCallPanelScreen();
                // Inicia o relógio para a tela do painel
                state.activeInterval = setInterval(updateClock, 1000);
                break;
            default:
                content = renderHomeScreen();
        }

        appContainer.innerHTML = content;
        
        // Inicializa os ícones Lucide se estiver disponível
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // --- GERADORES DE CONTEÚDO HTML (VIEWS) ---
    function renderHomeScreen() {
        const nextPatients = [...state.patientQueue]
            .sort((a, b) => b.priorityLevel - a.priorityLevel || a.arrivalTime - b.arrivalTime)
            .slice(0, 2);

        return `
        <header class="main-header fade-in">
            <div class="logo">
                <i data-lucide="heart-pulse"></i> <span>UBS Atendimentos</span>
            </div>
            <nav>
                <button data-action="view-dashboard" class="btn">
                    <i data-lucide="shield"></i>
                    <span>Área da Equipe</span>
                </button>
            </nav>
        </header>
        
        <main class="health-portal">
            <div class="portal-actions slide-up">
                <h2>Saiba tudo que a UBS oferece para cuidar da sua saúde</h2>
                <div class="actions-grid">
                    <div data-action="start-triage" class="action-card">
                        <i data-lucide="clipboard-list"></i> <span>Pronto Atendimento<br></span>
                    </div>
                    <div data-action="start-chat" class="action-card">
                        <i data-lucide="message-square"></i> <span>Falar com Assistente Virtual</span>
                    </div>
                </div>
            </div>
            
            <div class="feature-card panel-preview-card fade-in" style="animation-delay: 0.2s;">
                <div class="panel-preview">
                    <div class="preview-header">
                        <h4>Painel de Atendimento</h4>
                        <span class="live-dot"></span>
                    </div>
                    <div class="preview-calling">
                        <p>Chamando Agora</p>
                        <span>${state.currentlyCalling ? state.currentlyCalling.name : 'Aguardando...'}</span>
                    </div>
                    <div class="preview-next">
                        <p>Próximos Pacientes</p>
                        <ul>
                            ${nextPatients.map(p => `<li>${p.name}</li>`).join('')}
                            ${nextPatients.length === 0 ? '<li>Nenhum paciente na fila</li>' : ''}
                        </ul>
                    </div>
                </div>
                <div class="feature-card-content">
                    <h3>Acompanhe a Fila em Tempo Real</h3>
                    <button data-action="view-call-panel" class="btn">Veja o Painel</button>
                </div>
            </div>
        </main>
        `;
    }

    function renderHeader(title) {
        return `
        <header class="main-header fade-in">
            <div class="logo">
                <i data-lucide="heart-pulse"></i> <span>${title}</span>
            </div>
            <nav>
                <button data-action="go-home" class="btn">Voltar ao Início</button>
            </nav>
        </header>
        `;
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
                <button data-action="submit-name" class="btn btn-large">Continuar</button>
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

        if (score >= 9) {
            priority = 'Alta';
            priorityLevel = 3;
            icon = 'alert-triangle'; // CORRIGIDO: AlertTriangle -> alert-triangle
        } else if (score >= 4) {
            priority = 'Média';
            priorityLevel = 2;
            icon = 'clock'; // CORRIGIDO: Clock -> clock
        } else {
            priority = 'Baixa';
            priorityLevel = 1;
            icon = 'check-circle'; // CORRIGIDO: CheckCircle -> check-circle
        }

        const recommendations = {
            'Alta': 'Seus sintomas indicam necessidade de atendimento prioritário. Por favor, dirija-se à recepção imediatamente.',
            'Média': 'Seu atendimento tem prioridade moderada. Aguarde o chamado no painel.',
            'Baixa': 'Seu caso é de baixa urgência. O atendimento será realizado em breve.'
        };

        const priorityClassMap = {
            'Alta': 'high',
            'Média': 'medium',
            'Baixa': 'low'
        };

        const priorityClass = priorityClassMap[priority];

        if (!state.patientQueue.some(p => p.id === state.currentTriage.id)) {
            state.patientQueue.push({
                id: state.currentTriage.id,
                name: state.currentTriage.patientName,
                priority,
                priorityLevel,
                arrivalTime: new Date()
            });
        }

        return `
        ${renderHeader('Resultado da Triagem')}
        <main class="page-content">
            <div class="content-card fade-in">
                <div class="result-icon bg-${priorityClass}">
                    <i data-lucide="${icon}" class="priority-${priorityClass}"></i>
                </div>
                <h2>Olá, ${state.currentTriage.patientName}!</h2>
                <p class="text-light" style="margin-top: -1.5rem; margin-bottom: 1rem;">Sua prioridade de atendimento é:</p>
                <p class="result-priority priority-${priorityClass}">${priority}</p>
                <div class="recommendation-box">
                    <h3 style="font-weight: 700; margin-bottom: 0.5rem;">Recomendação:</h3>
                    <p class="text-light">${recommendations[priority]}</p>
                </div>
                <button data-action="go-home" class="btn btn-large" style="margin-top: 2rem;">Entendido</button>
            </div>
        </main>
        `;
    }

    function renderDashboardScreen() {
        return `
        ${renderHeader('Painel de Atendimento')}
        <main id="dashboard-content" class="page-content">
            <div class="dashboard-grid">
                <div class="patient-card skeleton"></div>
                <div class="patient-card skeleton"></div>
                <div class="patient-card skeleton"></div>
            </div>
        </main>
        `;
    }

    function renderDashboardContent() {
        const sortedQueue = [...state.patientQueue].sort((a, b) => 
            b.priorityLevel - a.priorityLevel || a.arrivalTime - b.arrivalTime
        );

        if (sortedQueue.length === 0) {
            return `
            <div class="content-card fade-in">
                <i data-lucide="check-square" class="result-icon bg-low priority-low"></i> <h2>Nenhum paciente na fila.</h2>
            </div>
            `;
        }

        const patientCards = sortedQueue.map((p, i) => {
            const timeWaiting = Math.round((new Date() - new Date(p.arrivalTime)) / 60000);
            const priorityClass = p.priority === 'Média' ? 'medium' : p.priority.toLowerCase();
            
            return `
            <div class="patient-card priority-${priorityClass} fade-in" style="animation-delay: ${i * 50}ms">
                <div class="patient-info">
                    <div class="name">${p.name}</div>
                    <div class="details">
                        <i data-lucide="clock" style="width:16px;"></i> Aguardando há ${timeWaiting} min
                    </div>
                </div>
                <div class="patient-actions">
                    <span class="priority-tag tag-${priorityClass}">${p.priority}</span>
                    <button data-action="call-patient" data-id="${p.id}" class="btn">
                        <i data-lucide="megaphone"></i> Chamar
                    </button>
                </div>
            </div>
            `;
        }).join('');

        return `<div class="dashboard-grid">${patientCards}</div>`;
    }

    function renderCallPanelScreen() {
        const sortedQueue = [...state.patientQueue].sort((a, b) => 
            b.priorityLevel - a.priorityLevel || a.arrivalTime - b.arrivalTime
        );
        const nextPatients = sortedQueue.filter(p => 
            !state.currentlyCalling || p.id !== state.currentlyCalling.id
        ).slice(0, 3);
        const callingPatient = state.currentlyCalling;
        const now = new Date();
        
        // **MUDANÇA AQUI**: Separamos a data em duas partes
        const weekday = now.toLocaleDateString('pt-BR', { weekday: 'long' });
        const dayAndMonth = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
        const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

        return `
        <div class="call-panel-page">
            <header class="panel-header">
                <div>
                    <h1>Painel de Atendimento</h1>
                    <p>UBS Atendimentos</p>
                </div>
                <div class="clock">
                    <span id="clock-time">${now.toLocaleTimeString('pt-BR')}</span>
                    
                    <!-- **MUDANÇA AQUI**: A data agora tem uma estrutura com spans -->
                    <span id="clock-date">
                        <span class="clock-weekday">${capitalizedWeekday}</span>
                        <span class="clock-day-month">${dayAndMonth}</span>
                    </span>
                </div>
            </header>
            
            <main class="panel-main">
                <div class="calling-now ${callingPatient ? 'active' : ''}">
                    <p>Chamando Agora</p>
                    <span class="patient-name">${callingPatient ? callingPatient.name : 'Aguardando chamada...'}</span>
                </div>
                
                <div class="next-patients">
                    <h2>Próximos Pacientes</h2>
                    <ul>
                        ${nextPatients.map(p => {
                            const priorityClass = p.priority === 'Média' ? 'medium' : p.priority.toLowerCase();
                            return `<li><span>${p.name}</span><span class="priority-tag tag-${priorityClass}">${p.priority}</span></li>`;
                        }).join('')}
                        ${nextPatients.length === 0 ? '<li class="empty">Nenhum paciente na fila</li>' : ''}
                    </ul>
                </div>
            </main>
            
            <button data-action="go-home" class="close-panel-btn">
                <i data-lucide="x"></i>
            </button>
        </div>
        `;
    }

    // **MUDANÇA AQUI**: A função agora atualiza a data também
    function updateClock() {
        const now = new Date();
        const timeEl = document.getElementById('clock-time');
        const dateEl = document.getElementById('clock-date');

        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString('pt-BR');
        }

        // Atualiza a data a cada segundo também, para o caso de virar o dia
        if (dateEl) {
            const weekdayEl = dateEl.querySelector('.clock-weekday');
            const dayMonthEl = dateEl.querySelector('.clock-day-month');

            const weekday = now.toLocaleDateString('pt-BR', { weekday: 'long' });
            const dayAndMonth = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
            const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

            // Apenas atualiza o texto se ele mudou para evitar repintura desnecessária
            if (weekdayEl && weekdayEl.textContent !== capitalizedWeekday) {
                weekdayEl.textContent = capitalizedWeekday;
            }
            if (dayMonthEl && dayMonthEl.textContent !== dayAndMonth) {
                dayMonthEl.textContent = dayAndMonth;
            }
        }
    }

    // --- MANIPULADOR DE EVENTOS ÚNICO ---
    document.body.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        event.preventDefault();

        if (action === 'start-triage') {
            state.currentPage = 'triage';
            state.currentTriage = { id: Date.now(), answers: {}, score: 0, patientName: '' };
            render();
        }

        if (action === 'view-dashboard') {
            state.currentPage = 'dashboard';
            render();
        }

        if (action === 'go-home') {
            state.currentPage = 'home';
            render();
        }

        if (action === 'start-chat') {
            // Força a abertura do chat
            setTimeout(() => {
                const chatWindow = document.querySelector('.chat-window');
                if (chatWindow) {
                    chatWindow.classList.add('open');
                    // Adiciona mensagem de boas-vindas se necessário
                    const messagesContainer = document.getElementById('chat-messages');
                    if (messagesContainer && messagesContainer.children.length === 0) {
                        const messageElement = document.createElement('div');
                        messageElement.classList.add('message', 'ai-message');
                        messageElement.textContent = "Olá! Sou o assistente virtual da UBS. Como posso ajudar a tirar suas dúvidas sobre nossos serviços ou sobre saúde?";
                        messagesContainer.appendChild(messageElement);
                    }
                }
            }, 100);
        }

        if (action === 'view-call-panel') {
            state.currentPage = 'callPanel';
            render();
        }

        if (action === 'submit-name') {
            const input = document.getElementById('patient-name-input');
            const existingError = document.querySelector('.error-message');
            if (existingError) existingError.remove();
            input.classList.remove('input-error');

            if (input && input.value.trim()) {
                state.currentTriage.patientName = input.value.trim();
                render();
            } else {
                const errorElement = document.createElement('p');
                errorElement.className = 'error-message';
                errorElement.textContent = 'Por favor, preencha seu nome para continuar.';
                input.insertAdjacentElement('afterend', errorElement);
                input.classList.add('input-error');
            }
        }

        if (action === 'answer-triage') {
            state.currentTriage.score += parseInt(target.dataset.value, 10);
            if (target.dataset.next === 'final') {
                state.currentPage = 'result';
                render();
            } else {
                appContainer.innerHTML = renderTriageScreen(target.dataset.next);
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        }

        if (action === 'call-patient') {
            const patientId = parseInt(target.dataset.id, 10);
            state.currentlyCalling = state.patientQueue.find(p => p.id === patientId);
            state.patientQueue = state.patientQueue.filter(p => p.id !== patientId);

            const dashboardContent = document.getElementById('dashboard-content');
            if (dashboardContent) {
                dashboardContent.innerHTML = renderDashboardContent();
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }

            // Simula o fim do atendimento
            setTimeout(() => {
                state.currentlyCalling = null;
            }, 15000); // Paciente fica "em chamado" por 15s
        }
    });

    // --- INICIALIZAÇÃO ---
    render();
});
