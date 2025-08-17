document.addEventListener('DOMContentLoaded', () => {

    // --- INICIALIZAÇÃO DO FIREBASE ---
    const db = firebase.firestore();
    const patientQueueCollection = db.collection('patientQueue');
    const currentCallDoc = db.collection('appState').doc('currentCall');

    // --- ESTADO GLOBAL DA APLICAÇÃO ---
    const state = {
        currentPage: 'home',
        patientQueue: [],
        currentTriage: { answers: {}, score: 0, patientName: '' },
        currentlyCalling: null,
        activeInterval: null,
    };

    // --- ELEMENTOS DO DOM ---
    const appContainer = document.getElementById('app');

    // --- BANCO DE DADOS DAS PERGUNTAS DE TRIAGEM ---
    const triageQuestions = {
        'start': { text: 'Qual o motivo principal da sua consulta hoje?', icon: 'stethoscope', options: [ { text: 'Novo problema ou sintoma', value: 1, next: 'symptoms' }, { text: 'Consulta de retorno', value: 3, next: 'final' }, { text: 'Renovação de receita', value: 1, next: 'final' }, { text: 'Exames de rotina', value: 1, next: 'final' } ] },
        'symptoms': { text: 'Você apresenta algum destes sintomas graves?', icon: 'alert-triangle', options: [ { text: 'Dor no peito ou falta de ar', value: 10, next: 'fever' }, { text: 'Febre alta (acima de 38.5°C)', value: 5, next: 'pain' }, { text: 'Sangramento incomum', value: 8, next: 'pain' }, { text: 'Nenhum dos anteriores', value: 0, next: 'pain' } ] },
        'fever': { text: 'Você tem febre?', icon: 'thermometer', options: [ { text: 'Sim', value: 3, next: 'pain' }, { text: 'Não', value: 0, next: 'pain' } ] },
        'pain': { text: 'Em uma escala de 0 a 10, qual o seu nível de dor?', icon: 'frown', options: [ { text: 'Leve (1-3)', value: 1, next: 'chronic' }, { text: 'Moderada (4-6)', value: 3, next: 'chronic' }, { text: 'Intensa (7-10)', value: 6, next: 'chronic' } ] },
        'chronic': { text: 'Você possui alguma condição crônica?', icon: 'heart-pulse', options: [ { text: 'Sim', value: 2, next: 'final' }, { text: 'Não', value: 0, next: 'final' } ] }
    };

    // --- LÓGICA DE NAVEGAÇÃO E RENDERIZAÇÃO INICIAL ---
    function navigateTo(page) {
        state.currentPage = page;
        if (state.activeInterval) clearInterval(state.activeInterval);

        let content = '';
        switch (page) {
            case 'home': content = renderHomeScreen(); break;
            case 'triage': content = renderTriageScreen('start'); break;
            case 'result': content = renderResultScreen(); break;
            case 'dashboard': content = renderDashboardScreen(); break;
            case 'callPanel':
                content = renderCallPanelScreen();
                state.activeInterval = setInterval(updateClock, 1000);
                break;
            default: content = renderHomeScreen();
        }
        appContainer.innerHTML = content;
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Preenche a página com os dados atuais, se necessário
        if (page === 'dashboard') updateDashboardView();
        if (page === 'home') updateHomeScreenView();
        if (page === 'callPanel') updateCallPanelView();
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO DE "MOLDURAS" (PÁGINAS COMPLETAS) ---
    function renderHomeScreen() {
        return `
            <header class="main-header fade-in"><div class="logo"><i data-lucide="heart-pulse"></i> <span>UBS Atendimentos</span></div><nav><button data-action="view-dashboard" class="btn"><i data-lucide="shield"></i><span>Área da Equipe</span></button></nav></header>
            <main class="health-portal"><div class="portal-actions slide-up"><h2>Saiba tudo que a UBS oferece para cuidar da sua saúde</h2><div class="actions-grid"><div data-action="start-triage" class="action-card"><i data-lucide="clipboard-list"></i> <span>Pronto Atendimento<br></span></div><div data-action="start-chat" class="action-card"><i data-lucide="message-square"></i> <span>Falar com Assistente Virtual</span></div></div></div>
            <div class="feature-card panel-preview-card fade-in" style="animation-delay: 0.2s;"><div class="panel-preview"><div class="preview-header"><h4>Painel de Atendimento</h4><span class="live-dot"></span></div><div class="preview-calling"><p>Chamando Agora</p><span id="home-currently-calling">Aguardando...</span></div><div class="preview-next"><p>Próximos Pacientes</p><ul id="home-next-patients"><li>Nenhum paciente na fila</li></ul></div></div><div class="feature-card-content"><h3>Acompanhe a Fila em Tempo Real</h3><button data-action="view-call-panel" class="btn">Veja o Painel</button></div></div></main>`;
    }

    function renderDashboardScreen() {
        return `${renderHeader('Painel de Atendimento')}<main id="dashboard-content" class="page-content"><div id="patient-list-container" class="dashboard-grid"><!-- Pacientes serão inseridos aqui --></div></main>`;
    }

    function renderCallPanelScreen() {
        const now = new Date();
        const weekday = now.toLocaleDateString('pt-BR', { weekday: 'long' });
        const dayAndMonth = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
        const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
        return `
            <div class="call-panel-page"><header class="panel-header"><div><h1>Painel de Atendimento</h1><p>UBS Atendimentos</p></div><div class="clock"><span id="clock-time">${now.toLocaleTimeString('pt-BR')}</span><span id="clock-date"><span class="clock-weekday">${capitalizedWeekday}</span><span class="clock-day-month">${dayAndMonth}</span></span></div></header>
            <main class="panel-main"><div class="calling-now"><p>Chamando Agora</p><span id="panel-currently-calling" class="patient-name">Aguardando chamada...</span></div><div class="next-patients"><h2>Próximos Pacientes</h2><ul id="panel-next-patients"><li class="empty">Nenhum paciente na fila</li></ul></div></main>
            <button data-action="go-home" class="close-panel-btn"><i data-lucide="x"></i></button></div>`;
    }
    
    function renderHeader(title) { return `<header class="main-header fade-in"><div class="logo"><i data-lucide="heart-pulse"></i> <span>${title}</span></div><nav><button data-action="go-home" class="btn">Voltar ao Início</button></nav></header>`; }
    function renderTriageScreen(questionId) { const question = triageQuestions[questionId]; const optionsHtml = question.options.map(opt => `<button data-action="answer-triage" data-value="${opt.value}" data-next="${opt.next}" class="triage-option"><i data-lucide="${question.icon}"></i><span>${opt.text}</span></button>`).join(''); return `${renderHeader('Triagem Inteligente')}<main class="page-content"><div class="content-card fade-in">${!state.currentTriage.patientName ? `<h2>Antes de começar, qual o seu nome?</h2><input type="text" id="patient-name-input" placeholder="Digite seu nome completo" class="input-field" /><button data-action="submit-name" class="btn btn-large">Continuar</button>` : `<h2>${question.text}</h2><div class="triage-options">${optionsHtml}</div>`}</div></main>`; }
    function renderResultScreen() { const score = state.currentTriage.score; let priority, priorityLevel, icon; if (score >= 9) { priority = 'Alta'; priorityLevel = 3; icon = 'alert-triangle'; } else if (score >= 4) { priority = 'Média'; priorityLevel = 2; icon = 'clock'; } else { priority = 'Baixa'; priorityLevel = 1; icon = 'check-circle'; } const recommendations = { 'Alta': 'Seus sintomas indicam necessidade de atendimento prioritário. Por favor, dirija-se à recepção imediatamente.', 'Média': 'Seu atendimento tem prioridade moderada. Aguarde o chamado no painel.', 'Baixa': 'Seu caso é de baixa urgência. O atendimento será realizado em breve.' }; const priorityClassMap = { 'Alta': 'high', 'Média': 'medium', 'Baixa': 'low' }; const priorityClass = priorityClassMap[priority]; const newPatient = { name: state.currentTriage.patientName, priority: priority, priorityLevel: priorityLevel, arrivalTime: firebase.firestore.FieldValue.serverTimestamp() }; patientQueueCollection.add(newPatient).then(() => console.log("Paciente adicionado ao Firestore!")).catch(e => console.error("Erro ao adicionar paciente: ", e)); return `${renderHeader('Resultado da Triagem')}<main class="page-content"><div class="content-card fade-in"><div class="result-icon bg-${priorityClass}"><i data-lucide="${icon}" class="priority-${priorityClass}"></i></div><h2>Olá, ${state.currentTriage.patientName}!</h2><p class="text-light" style="margin-top: -1.5rem; margin-bottom: 1rem;">Sua prioridade de atendimento é:</p><p class="result-priority priority-${priorityClass}">${priority}</p><div class="recommendation-box"><h3 style="font-weight: 700; margin-bottom: 0.5rem;">Recomendação:</h3><p class="text-light">${recommendations[priority]}</p></div><button data-action="go-home" class="btn btn-large" style="margin-top: 2rem;">Entendido</button></div></main>`; }
    
    // --- FUNÇÕES DE ATUALIZAÇÃO "CIRÚRGICA" ---
    function updateHomeScreenView() { const callingEl = document.getElementById('home-currently-calling'); const nextPatientsEl = document.getElementById('home-next-patients'); if (!callingEl || !nextPatientsEl) return; callingEl.textContent = state.currentlyCalling ? state.currentlyCalling.name : 'Aguardando...'; const nextPatients = state.patientQueue.slice(0, 2); if (nextPatients.length > 0) { nextPatientsEl.innerHTML = nextPatients.map(p => `<li>${p.name}</li>`).join(''); } else { nextPatientsEl.innerHTML = '<li>Nenhum paciente na fila</li>'; } }
    function updateDashboardView() { const container = document.getElementById('patient-list-container'); if (!container) return; const patientCardsHTML = state.patientQueue.map((p, i) => { const arrivalDateTime = p.arrivalTime.toDate(); const timeWaiting = Math.round((new Date() - arrivalDateTime) / 60000); const priorityClass = { 'Alta': 'high', 'Média': 'medium', 'Baixa': 'low' }[p.priority] || 'low'; const [firstName, ...lastName] = p.name.split(' '); return `<div class="patient-card priority-${priorityClass} fade-in" style="animation-delay: ${i * 50}ms"><div class="patient-info"><div class="name priority-${priorityClass}"><span>${firstName}</span><span>${lastName.join(' ')}</span></div><div class="details"><i data-lucide="clock"></i> Aguardando há ${timeWaiting} min</div></div><div class="patient-actions"><span class="priority-tag tag-${priorityClass}">${p.priority}</span><button data-action="call-patient" data-id="${p.id}" class="btn btn-call"><i data-lucide="megaphone"></i> Chamar</button></div></div>`; }).join(''); container.innerHTML = state.patientQueue.length > 0 ? patientCardsHTML : `<div class="content-card fade-in"><i data-lucide="check-square" class="result-icon bg-low priority-low"></i> <h2>Nenhum paciente na fila.</h2></div>`; if (typeof lucide !== 'undefined') lucide.createIcons(); }
    function updateCallPanelView() { const callingEl = document.getElementById('panel-currently-calling'); const nextPatientsEl = document.getElementById('panel-next-patients'); if (!callingEl || !nextPatientsEl) return; callingEl.textContent = state.currentlyCalling ? (state.currentlyCalling.name || 'Aguardando...') : 'Aguardando chamada...'; const nextPatients = state.patientQueue.filter(p => !state.currentlyCalling || p.id !== state.currentlyCalling.id).slice(0, 3); if (nextPatients.length > 0) { nextPatientsEl.innerHTML = nextPatients.map(p => { const priorityClass = { 'Alta': 'high', 'Média': 'medium', 'Baixa': 'low' }[p.priority] || 'low'; const arrivalDateTime = p.arrivalTime.toDate(); const timeWaiting = Math.round((new Date() - arrivalDateTime) / 60000); const waitTimeText = `Aguardando há ${timeWaiting} min`; return `<li><div class="patient-name-wrapper"><span>${p.name}</span><small class="wait-time-display">${waitTimeText}</small></div><span class="priority-tag tag-${priorityClass}">${p.priority}</span></li>`; }).join(''); } else { nextPatientsEl.innerHTML = '<li class="empty">Nenhum paciente na fila</li>'; } }
    function updateClock() { const timeEl = document.getElementById('clock-time'); if (timeEl) timeEl.textContent = new Date().toLocaleTimeString('pt-BR'); }

    // --- MANIPULADOR DE EVENTOS GERAL ---
    document.body.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        event.preventDefault();

        if (['home', 'dashboard', 'callPanel', 'triage'].includes(action.replace(/view-|go-|start-/, ''))) {
            const page = action.replace(/view-|go-|start-/, '');
            if(action === 'start-triage') state.currentTriage = { id: Date.now(), answers: {}, score: 0, patientName: '' };
            navigateTo(page);
        } else if (action === 'start-chat') {
            window.openChat && window.openChat();
        } else if (action === 'submit-name') {
            const input = document.getElementById('patient-name-input');
            const errorEl = input.nextElementSibling;
            if(errorEl && errorEl.classList.contains('error-message')) errorEl.remove();
            
            if (input && input.value.trim()) {
                state.currentTriage.patientName = input.value.trim();
                navigateTo('triage');
            } else { 
                input.classList.add('input-error');
                const errorElement = document.createElement('p');
                errorElement.className = 'error-message';
                errorElement.textContent = 'Por favor, preencha seu nome para continuar.';
                input.insertAdjacentElement('afterend', errorElement);
            }
        } else if (action === 'answer-triage') {
            state.currentTriage.score += parseInt(target.dataset.value, 10);
            const next = target.dataset.next;
            if (next === 'final') {
                navigateTo('result');
            } else {
                appContainer.innerHTML = renderTriageScreen(next);
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        } else if (action === 'call-patient') {
            const patientId = target.dataset.id;
            const patientData = state.patientQueue.find(p => p.id === patientId);
            if (patientData) {
                currentCallDoc.set({ name: patientData.name, priority: patientData.priority })
                    .then(() => patientQueueCollection.doc(patientId).delete());
                setTimeout(() => currentCallDoc.set({ name: null }), 15000);
            }
        }
    });

    // --- OUVINTES DO FIREBASE ---
    function setupFirebaseListeners() {
        patientQueueCollection.orderBy("priorityLevel", "desc").orderBy("arrivalTime", "asc").onSnapshot(snapshot => {
            console.log("Fila de pacientes atualizada.");
            state.patientQueue = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (state.currentPage === 'dashboard') updateDashboardView();
            if (state.currentPage === 'home') updateHomeScreenView();
            if (state.currentPage === 'callPanel') updateCallPanelView();
        });
    }

    function setupCurrentCallListener() {
        currentCallDoc.onSnapshot(doc => {
            console.log("Chamada atualizada.");
            state.currentlyCalling = (doc.exists && doc.data().name) ? doc.data() : null;
            
            if (state.currentPage === 'home') updateHomeScreenView();
            if (state.currentPage === 'callPanel') updateCallPanelView();
        });
    }

    // --- INICIALIZAÇÃO ---
    setupFirebaseListeners();
    setupCurrentCallListener();
    navigateTo('home');
});
