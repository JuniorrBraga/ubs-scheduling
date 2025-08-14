document.addEventListener('DOMContentLoaded', () => {
    
    // --- CONEXÃO COM O FIREBASE (Vem do index.html) ---
    // Garante que o código não quebre se o Firebase não carregar
    const db = window.db;
    const { collection, onSnapshot, addDoc, doc, deleteDoc, serverTimestamp } = window.firestore || {};

    // --- ESTADO GLOBAL DA APLICAÇÃO ---
    const state = {
        currentPage: 'home',
        // A FILA DE PACIENTES AGORA ESTÁ VAZIA E SERÁ PREENCHIDA PELO FIREBASE
        patientQueue: [], 
        currentTriage: {
            answers: {},
            score: 0,
            patientName: ''
        },
        currentlyCalling: null,
        activeInterval: null
    };

    const appContainer = document.getElementById('app');

    // --- BANCO DE DADOS DAS PERGUNTAS DE TRIAGEM ---
    const triageQuestions = {
        'start': { text: 'Qual o motivo principal da sua consulta hoje?', icon: 'stethoscope', options: [ { text: 'Novo problema ou sintoma', value: 1, next: 'symptoms' }, { text: 'Consulta de retorno', value: 3, next: 'final' }, { text: 'Renovação de receita', value: 1, next: 'final' }, { text: 'Exames de rotina', value: 1, next: 'final' } ] },
        'symptoms': { text: 'Você apresenta algum destes sintomas graves?', icon: 'alert-triangle', options: [ { text: 'Dor no peito ou falta de ar', value: 10, next: 'fever' }, { text: 'Febre alta (acima de 38.5°C)', value: 5, next: 'pain' }, { text: 'Sangramento incomum', value: 8, next: 'pain' }, { text: 'Nenhum dos anteriores', value: 0, next: 'pain' } ] },
        'fever': { text: 'Você tem febre?', icon: 'thermometer', options: [ { text: 'Sim', value: 3, next: 'pain' }, { text: 'Não', value: 0, next: 'pain' } ] },
        'pain': { text: 'Em uma escala de 0 a 10, qual o seu nível de dor?', icon: 'frown', options: [ { text: 'Leve (1-3)', value: 1, next: 'chronic' }, { text: 'Moderada (4-6)', value: 3, next: 'chronic' }, { text: 'Intensa (7-10)', value: 6, next: 'chronic' } ] },
        'chronic': { text: 'Você possui alguma condição crônica?', icon: 'heart-pulse', options: [ { text: 'Sim', value: 2, next: 'final' }, { text: 'Não', value: 0, next: 'final' } ] }
    };

    // --- LÓGICA DE RENDERIZAÇÃO ---
    function render() {
        if (state.activeInterval) {
            clearInterval(state.activeInterval);
            state.activeInterval = null;
        }

        let content = '';

        switch (state.currentPage) {
            case 'home': content = renderHomeScreen(); break;
            case 'triage': content = renderTriageScreen('start'); break;
            // A tela 'result' agora é renderizada diretamente pelo manipulador de eventos
            case 'dashboard': content = renderDashboardScreen(); break;
            case 'callPanel':
                content = renderCallPanelScreen();
                state.activeInterval = setInterval(updateClock, 1000);
                break;
            default: content = renderHomeScreen();
        }

        appContainer.innerHTML = content;
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO DE TELA (VIEWS) ---
    function renderHomeScreen() {
        // Garante que arrivalTime existe antes de tentar ordenar
        const sortedQueue = [...state.patientQueue].filter(p => p.arrivalTime)
            .sort((a, b) => b.priorityLevel - a.priorityLevel || a.arrivalTime.toMillis() - b.arrivalTime.toMillis());
        const nextPatients = sortedQueue.slice(0, 2);

        return `
        <header class="main-header fade-in">
            <div class="logo"><i data-lucide="heart-pulse"></i> <span>UBS Atendimentos</span></div>
            <nav><button data-action="view-dashboard" class="btn"><i data-lucide="shield"></i><span>Área da Equipe</span></button></nav>
        </header>
        <main class="health-portal">
            <div class="portal-actions slide-up">
                <h2>Saiba tudo que a UBS oferece para cuidar da sua saúde</h2>
                <div class="actions-grid">
                    <div data-action="start-triage" class="action-card"><i data-lucide="clipboard-list"></i> <span>Pronto Atendimento<br></span></div>
                    <div data-action="start-chat" class="action-card"><i data-lucide="message-square"></i> <span>Falar com Assistente Virtual</span></div>
                </div>
            </div>
            <div class="feature-card panel-preview-card fade-in" style="animation-delay: 0.2s;">
                <div class="panel-preview">
                    <div class="preview-header"><h4>Painel de Atendimento</h4><span class="live-dot"></span></div>
                    <div class="preview-calling"><p>Chamando Agora</p><span>${state.currentlyCalling ? state.currentlyCalling.name : 'Aguardando...'}</span></div>
                    <div class="preview-next"><p>Próximos Pacientes</p>
                        <ul>
                            ${nextPatients.map(p => `<li>${p.name}</li>`).join('')}
                            ${nextPatients.length === 0 ? '<li>Nenhum paciente na fila</li>' : ''}
                        </ul>
                    </div>
                </div>
                <div class="feature-card-content"><h3>Acompanhe a Fila em Tempo Real</h3><button data-action="view-call-panel" class="btn">Veja o Painel</button></div>
            </div>
        </main>`;
    }

    function renderHeader(title) {
        return `<header class="main-header fade-in"><div class="logo"><i data-lucide="heart-pulse"></i> <span>${title}</span></div><nav><button data-action="go-home" class="btn">Voltar ao Início</button></nav></header>`;
    }

    function renderTriageScreen(questionId) {
        const question = triageQuestions[questionId];
        const optionsHtml = question.options.map(opt => `<button data-action="answer-triage" data-value="${opt.value}" data-next="${opt.next}" class="triage-option"><i data-lucide="${question.icon}"></i><span>${opt.text}</span></button>`).join('');
        return `${renderHeader('Triagem Inteligente')}<main class="page-content"><div class="content-card fade-in">${!state.currentTriage.patientName ? `<h2>Antes de começar, qual o seu nome?</h2><input type="text" id="patient-name-input" placeholder="Digite seu nome completo" class="input-field" /><button data-action="submit-name" class="btn btn-large">Continuar</button>` : `<h2>${question.text}</h2><div class="triage-options">${optionsHtml}</div>`}</div></main>`;
    }

    async function renderResultScreenAndSavePatient() {
        const score = state.currentTriage.score;
        let priority, priorityLevel, icon;

        if (score >= 9) { priority = 'Alta'; priorityLevel = 3; icon = 'alert-triangle'; } 
        else if (score >= 4) { priority = 'Média'; priorityLevel = 2; icon = 'clock'; } 
        else { priority = 'Baixa'; priorityLevel = 1; icon = 'check-circle'; }

        const newPatient = {
            name: state.currentTriage.patientName,
            priority: priority,
            priorityLevel: priorityLevel,
            arrivalTime: serverTimestamp() // Usa o horário do servidor do Firebase
        };

        try {
            const patientQueueCollection = collection(db, 'patientQueue');
            await addDoc(patientQueueCollection, newPatient);
            console.log("Paciente adicionado ao Firestore!");
        } catch (e) {
            console.error("Erro ao adicionar paciente: ", e);
        }
        
        const recommendations = {
            'Alta': 'Seus sintomas indicam necessidade de atendimento prioritário. Por favor, dirija-se à recepção imediatamente.',
            'Média': 'Seu atendimento tem prioridade moderada. Aguarde o chamado no painel.',
            'Baixa': 'Seu caso é de baixa urgência. O atendimento será realizado em breve.'
        };
        const priorityClassMap = { 'Alta': 'high', 'Média': 'medium', 'Baixa': 'low' };
        const priorityClass = priorityClassMap[priority];

        return `${renderHeader('Resultado da Triagem')}<main class="page-content"><div class="content-card fade-in"><div class="result-icon bg-${priorityClass}"><i data-lucide="${icon}" class="priority-${priorityClass}"></i></div><h2>Olá, ${state.currentTriage.patientName}!</h2><p class="text-light" style="margin-top: -1.5rem; margin-bottom: 1rem;">Sua prioridade de atendimento é:</p><p class="result-priority priority-${priorityClass}">${priority}</p><div class="recommendation-box"><h3 style="font-weight: 700; margin-bottom: 0.5rem;">Recomendação:</h3><p class="text-light">${recommendations[priority]}</p></div><button data-action="go-home" class="btn btn-large" style="margin-top: 2rem;">Entendido</button></div></main>`;
    }

    function renderDashboardScreen() {
        return `${renderHeader('Painel de Atendimento')}<main id="dashboard-content" class="page-content"><div class="dashboard-grid"><div class="patient-card skeleton"></div><div class="patient-card skeleton"></div><div class="patient-card skeleton"></div></div></main>`;
    }

    function renderDashboardContent() {
        const sortedQueue = [...state.patientQueue].filter(p => p.arrivalTime)
            .sort((a, b) => b.priorityLevel - a.priorityLevel || a.arrivalTime.toMillis() - b.arrivalTime.toMillis());

        if (sortedQueue.length === 0) {
            return `<div class="content-card fade-in"><i data-lucide="check-square" class="result-icon bg-low priority-low"></i> <h2>Nenhum paciente na fila.</h2></div>`;
        }

        const patientCards = sortedQueue.map((p, i) => {
            const arrivalDateTime = p.arrivalTime.toDate();
            const timeWaiting = Math.round((new Date() - arrivalDateTime) / 60000);
            const priorityClass = p.priority === 'Média' ? 'medium' : p.priority.toLowerCase();
            
            return `<div class="patient-card priority-${priorityClass} fade-in" style="animation-delay: ${i * 50}ms"><div class="patient-info"><div class="name">${p.name}</div><div class="details"><i data-lucide="clock" style="width:16px;"></i> Aguardando há ${timeWaiting} min</div></div><div class="patient-actions"><span class="priority-tag tag-${priorityClass}">${p.priority}</span><button data-action="call-patient" data-id="${p.id}" class="btn"><i data-lucide="megaphone"></i> Chamar</button></div></div>`;
        }).join('');

        return `<div class="dashboard-grid">${patientCards}</div>`;
    }

    function renderCallPanelScreen() {
        const sortedQueue = [...state.patientQueue].filter(p => p.arrivalTime)
            .sort((a, b) => b.priorityLevel - a.priorityLevel || a.arrivalTime.toMillis() - b.arrivalTime.toMillis());
        const nextPatients = sortedQueue.filter(p => !state.currentlyCalling || p.id !== state.currentlyCalling.id).slice(0, 3);
        const callingPatient = state.currentlyCalling;
        const now = new Date();
        const weekday = now.toLocaleDateString('pt-BR', { weekday: 'long' });
        const dayAndMonth = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
        const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

        return `<div class="call-panel-page"><header class="panel-header"><div><h1>Painel de Atendimento</h1><p>UBS Atendimentos</p></div><div class="clock"><span id="clock-time">${now.toLocaleTimeString('pt-BR')}</span><span id="clock-date"><span class="clock-weekday">${capitalizedWeekday}</span><span class="clock-day-month">${dayAndMonth}</span></span></div></header><main class="panel-main"><div class="calling-now ${callingPatient ? 'active' : ''}"><p>Chamando Agora</p><span class="patient-name">${callingPatient ? callingPatient.name : 'Aguardando chamada...'}</span></div><div class="next-patients"><h2>Próximos Pacientes</h2><ul>${nextPatients.map(p => { const priorityClass = p.priority === 'Média' ? 'medium' : p.priority.toLowerCase(); return `<li><span>${p.name}</span><span class="priority-tag tag-${priorityClass}">${p.priority}</span></li>`; }).join('')}${nextPatients.length === 0 ? '<li class="empty">Nenhum paciente na fila</li>' : ''}</ul></div></main><button data-action="go-home" class="close-panel-btn"><i data-lucide="x"></i></button></div>`;
    }

    function updateClock() {
        const timeEl = document.getElementById('clock-time');
        const dateEl = document.getElementById('clock-date');
        const now = new Date();

        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString('pt-BR');
        }
        if (dateEl) {
            const weekdayEl = dateEl.querySelector('.clock-weekday');
            const dayMonthEl = dateEl.querySelector('.clock-day-month');
            const weekday = now.toLocaleDateString('pt-BR', { weekday: 'long' });
            const dayAndMonth = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
            const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
            if (weekdayEl && weekdayEl.textContent !== capitalizedWeekday) {
                weekdayEl.textContent = capitalizedWeekday;
            }
            if (dayMonthEl && dayMonthEl.textContent !== dayAndMonth) {
                dayMonthEl.textContent = dayAndMonth;
            }
        }
    }

    // --- MANIPULADOR DE EVENTOS ---
    document.body.addEventListener('click', async (event) => {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        event.preventDefault();

        if (action === 'start-triage') {
            state.currentPage = 'triage';
            state.currentTriage = { id: Date.now(), answers: {}, score: 0, patientName: '' };
            render();
        } else if (action === 'view-dashboard') {
            state.currentPage = 'dashboard';
            render();
        } else if (action === 'go-home') {
            state.currentPage = 'home';
            render();
        } else if (action === 'start-chat') {
            document.getElementById('chat-bubble')?.click();
        } else if (action === 'view-call-panel') {
            state.currentPage = 'callPanel';
            render();
        } else if (action === 'submit-name') {
            const input = document.getElementById('patient-name-input');
            const existingError = document.querySelector('.error-message');
            if (existingError) existingError.remove();
            
            if (input && input.value.trim()) {
                state.currentTriage.patientName = input.value.trim();
                render();
            } else {
                input.classList.add('input-error');
                const errorElement = document.createElement('p');
                errorElement.className = 'error-message';
                errorElement.textContent = 'Por favor, preencha seu nome para continuar.';
                input.insertAdjacentElement('afterend', errorElement);
            }
        } else if (action === 'answer-triage') {
            state.currentTriage.score += parseInt(target.dataset.value, 10);
            if (target.dataset.next === 'final') {
                state.currentPage = 'result';
                appContainer.innerHTML = await renderResultScreenAndSavePatient();
                if (typeof lucide !== 'undefined') lucide.createIcons();
            } else {
                appContainer.innerHTML = renderTriageScreen(target.dataset.next);
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        } else if (action === 'call-patient') {
            const patientId = target.dataset.id;
            state.currentlyCalling = state.patientQueue.find(p => p.id === patientId);
            
            render();

            try {
                await deleteDoc(doc(db, "patientQueue", patientId));
                console.log("Paciente removido do Firestore!");
            } catch (e) {
                console.error("Erro ao remover paciente: ", e);
            }

            setTimeout(() => {
                state.currentlyCalling = null;
                // O onSnapshot vai atualizar a tela quando o paciente for removido,
                // mas aqui garantimos que o nome some da seção "Chamando agora"
                if(state.currentPage === 'home' || state.currentPage === 'callPanel') {
                    render();
                }
            }, 15000);
        }
    });

    // --- FUNÇÃO PRINCIPAL: OUVINTE DO FIREBASE ---
    function setupFirebaseListeners() {
        if (!db) {
            console.error("Conexão com o Firestore não estabelecida!");
            // Você pode exibir uma mensagem de erro na tela aqui
            appContainer.innerHTML = "<h1>Erro de conexão com o banco de dados.</h1>";
            return;
        }

        const patientQueueCollection = collection(db, 'patientQueue');
        
        onSnapshot(patientQueueCollection, (snapshot) => {
            console.log("Recebida atualização da fila de pacientes!");
            const newPatientQueue = [];
            snapshot.forEach((doc) => {
                // Adiciona uma verificação para garantir que os dados existem
                if (doc.data() && doc.data().arrivalTime) {
                    newPatientQueue.push({
                        id: doc.id,
                        ...doc.data()
                    });
                }
            });
            
            state.patientQueue = newPatientQueue;

            if (state.currentPage === 'dashboard') {
                const dashboardContent = document.getElementById('dashboard-content');
                if (dashboardContent) {
                    dashboardContent.innerHTML = renderDashboardContent();
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            } 
            else if (state.currentPage === 'home' || state.currentPage === 'callPanel') {
                render();
            }
        });
    }

    // --- INICIALIZAÇÃO ---
    setupFirebaseListeners(); // Inicia o ouvinte do Firebase
    render(); // Renderiza a tela inicial
});
