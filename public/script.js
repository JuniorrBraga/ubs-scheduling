document.addEventListener('DOMContentLoaded', () => {

    const db = firebase.firestore();
    const patientQueueCollection = db.collection('patientQueue');
    const currentCallDoc = db.collection('appState').doc('currentCall');
    // --- ESTADO GLOBAL DA APLICAÇÃO ---
    const state = {
        currentPage: 'home', // 'home', 'triage', 'result', 'dashboard', 'callPanel'
        patientQueue: [],
        currentTriage: {
            answers: {},
            score: 0,
            patientName: ''
        },
        currentlyCalling: null, // Armazena o paciente sendo chamado
        activeInterval: null, // Para controlar o relógio do painel
        dashboardUpdateTimeout: null
    };

    const appContainer = document.getElementById('app');



    // --- BANCO DE DADOS DAS PERGUNTAS DE TRIAGEM ---
    const triageFlow = {
        'start': {
            text: 'Você apresenta algum destes sintomas de altíssimo risco?',
            icon: 'siren',
            options: [
                { text: 'Dor forte no peito ou falta de ar intensa', classification: 'RED' },
                { text: 'Convulsões ou perda de consciência', classification: 'RED' },
                { text: 'Sangramento grande e incontrolável', classification: 'RED' },
                { text: 'Nenhum destes', next: 'checkOrange' }
            ]
        },
        'checkOrange': {
            text: 'E quanto a estes sintomas muito urgentes?',
            icon: 'alert-triangle',
            options: [
                { text: 'Dor de cabeça súbita e muito forte', classification: 'ORANGE' },
                { text: 'Alteração súbita no estado mental (confusão)', classification: 'ORANGE' },
                { text: 'Febre alta com rigidez no pescoço', classification: 'ORANGE' },
                { text: 'Nenhum destes', next: 'checkYellow' }
            ]
        },
        'checkYellow': {
            text: 'Por favor, avalie seus sintomas atuais:',
            icon: 'thermometer',
            options: [
                { text: 'Vômito persistente ou dor abdominal moderada', classification: 'YELLOW' },
                { text: 'Febre há mais de 2 dias sem melhora', classification: 'YELLOW' },
                { text: 'Crise de asma que não melhora com a bombinha', classification: 'YELLOW' },
                { text: 'Nenhum destes', next: 'checkGreen' }
            ]
        },
        'checkGreen': {
            text: 'Seus sintomas se parecem com algum destes?',
            icon: 'clipboard-list',
            options: [
                { text: 'Tosse, dor de garganta ou sintomas de resfriado', classification: 'GREEN' },
                { text: 'Dor leve a moderada (ex: dor de dente, dor de ouvido)', classification: 'GREEN' },
                { text: 'Necessidade de curativo ou troca de sonda', classification: 'GREEN' },
                { text: 'Nenhum destes', next: 'checkBlue' }
            ]
        },
        'checkBlue': {
            text: 'Qual o motivo da sua visita?',
            icon: 'stethoscope',
            options: [
                { text: 'Renovação de receita', classification: 'BLUE' },
                { text: 'Consulta de retorno sem novas queixas', classification: 'BLUE' },
                { text: 'Mostrar resultado de exames', classification: 'BLUE' },
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
                content = renderDashboardScreen(); // 1. Renderiza a moldura

                // Limpa qualquer agendamento de atualização anterior para evitar bugs de navegação
                if (state.dashboardUpdateTimeout) {
                    clearTimeout(state.dashboardUpdateTimeout);
                }

                // Agenda a primeira atualização da tela
                state.dashboardUpdateTimeout = setTimeout(() => {
                    updateDashboardView();
                    state.dashboardUpdateTimeout = null; // Limpa o ID após a execução
                }, 0);

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
        // A lógica de ordenação continua a mesma
        const sortedQueue = [...state.patientQueue].filter(p => p.arrivalTime)
            .sort((a, b) => {
                const timeA = a.arrivalTime.toDate().getTime();
                const timeB = b.arrivalTime.toDate().getTime();
                return b.priorityLevel - a.priorityLevel || timeA - timeB;
            });
        const nextPatients = sortedQueue.slice(0, 2);

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
                    <span id="home-currently-calling">${state.currentlyCalling ? state.currentlyCalling.name : 'Aguardando...'}</span>
                </div>
                <div class="preview-next">
                    <p>Próximos Pacientes</p>
                    <ul id="home-next-patients">
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
        // CORREÇÃO: Agora usa a variável correta 'triageFlow'
        const question = triageFlow[questionId];
        // CORREÇÃO: Adiciona os atributos de dados corretos para a nova lógica
        const optionsHtml = question.options.map(opt => `
        <button 
            data-action="answer-triage" 
            data-next="${opt.next || ''}" 
            data-classification="${opt.classification || ''}" 
            class="triage-option">
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
        // Objeto de configuração baseado na imagem do Protocolo de Manchester
        const manchesterClassification = {
            'RED': {
                name: 'EMERGÊNCIA',
                level: 5,
                colorClass: 'red',
                icon: 'siren',
                waitTime: 'Atendimento imediato (0 min de espera)',
                recommendation: 'Risco altíssimo. Você será atendido imediatamente. Por favor, avise a recepção agora.'
            },
            'ORANGE': {
                name: 'MUITO URGENTE',
                level: 4,
                colorClass: 'orange',
                icon: 'alert-triangle',
                waitTime: 'Atendimento em até 10 minutos',
                recommendation: 'Risco significativo. Seu atendimento é de alta prioridade. Aguarde o chamado iminente.'
            },
            'YELLOW': {
                name: 'URGENTE',
                level: 3,
                colorClass: 'yellow',
                icon: 'clock',
                waitTime: 'Atendimento em até 50 minutos',
                recommendation: 'Seu caso necessita de atendimento rápido, mas pode aguardar. Fique atento ao painel.'
            },
            'GREEN': {
                name: 'POUCO URGENTE',
                level: 2,
                colorClass: 'green',
                icon: 'check-circle',
                waitTime: 'Atendimento em até 120 minutos',
                recommendation: 'Seu caso não é uma emergência. O atendimento será realizado por ordem de chegada dentro desta prioridade.'
            },
            'BLUE': {
                name: 'NÃO URGENTE',
                level: 1,
                colorClass: 'blue',
                icon: 'info',
                waitTime: 'Atendimento em até 240 minutos',
                recommendation: 'Seu caso pode ser atendido em um horário agendado ou quando houver disponibilidade. Dirija-se à recepção.'
            }
        };

        const result = manchesterClassification[state.currentTriage.classification];

        if (!result) {
            console.error("Classificação inválida:", state.currentTriage.classification);
            // Fallback para caso de erro
            return `<h2>Ocorreu um erro na triagem. Por favor, recomece.</h2>`;
        }

        // Adiciona o paciente à fila do Firebase com os novos dados
        const newPatient = {
            name: state.currentTriage.patientName,
            priority: result.name, // Ex: "URGENTE"
            priorityLevel: result.level, // Nível numérico para ordenação
            arrivalTime: firebase.firestore.FieldValue.serverTimestamp()
        };
        patientQueueCollection.add(newPatient)
            .then(() => console.log("Paciente adicionado ao Firestore com classificação Manchester!"))
            .catch(e => console.error("Erro ao adicionar paciente: ", e));

        // Renderiza a nova tela de resultado
        return `
        ${renderHeader('Resultado da Triagem')}
        <main class="page-content">
            <div class="content-card fade-in">
                <div class="result-icon bg-${result.colorClass}">
                    <i data-lucide="${result.icon}" class="priority-${result.colorClass}"></i>
                </div>
                <h2>Olá, ${state.currentTriage.patientName}!</h2>
                <p class="text-light" style="margin-top: -1.5rem; margin-bottom: 1rem;">Sua classificação de risco é:</p>
                <p class="result-priority priority-${result.colorClass}">${result.name}</p>
                
                <div class="recommendation-box" style="margin-top: 1.5rem;">
                    <h3 style="font-weight: 700; margin-bottom: 0.5rem;">Tempo Estimado de Espera:</h3>
                    <p class="text-light">${result.waitTime}</p>
                </div>

                <div class="recommendation-box">
                    <h3 style="font-weight: 700; margin-bottom: 0.5rem;">Recomendação:</h3>
                    <p class="text-light">${result.recommendation}</p>
                </div>
                
                <button data-action="go-home" class="btn btn-large" style="margin-top: 2rem;">Entendido</button>
            </div>
        </main>
    `;
    }
    function renderDashboardScreen() {
        // Esta função agora SÓ cria a estrutura base do dashboard.
        return `
    ${renderHeader('Painel de Atendimento')}
    <main id="dashboard-content" class="page-content">
        <div id="patient-list-container" class="dashboard-grid">
            </div>
    </main>
    `;
    }
    function renderDashboardContent() {
        const sortedQueue = [...state.patientQueue].filter(p => p.arrivalTime).sort((a, b) => {
            const timeA = a.arrivalTime.toDate().getTime();
            const timeB = b.arrivalTime.toDate().getTime();
            return b.priorityLevel - a.priorityLevel || timeA - timeB;
        });

        if (sortedQueue.length === 0) {
            return `
        <div class="content-card fade-in">
            <i data-lucide="check-square" class="result-icon bg-blue priority-blue"></i> <h2>Nenhum paciente na fila.</h2>
        </div>
        `;
        }

        // NOVO MAPA DE CORES PARA O PAINEL
        const priorityClassMap = {
            'EMERGÊNCIA': 'red',
            'MUITO URGENTE': 'orange',
            'URGENTE': 'yellow',
            'POUCO URGENTE': 'green',
            'NÃO URGENTE': 'blue'
        };

        const patientCards = sortedQueue.map((p, i) => {
            const arrivalDateTime = p.arrivalTime.toDate();
            const timeWaiting = Math.round((new Date() - arrivalDateTime) / 60000);

            // Usa o novo mapa para encontrar a classe de cor correta
            const priorityClass = priorityClassMap[p.priority] || 'blue';

            const nameParts = p.name.split(' ');
            const firstName = nameParts.shift();
            const lastName = nameParts.join(' ');

            return `
        <div class="patient-card priority-${priorityClass} fade-in" style="animation-delay: ${i * 50}ms">
            <div class="patient-info">
                <div class="name priority-${priorityClass}">
                    <span>${firstName}</span>
                    <span>${lastName}</span>
                </div>
                <div class="details">
                    <i data-lucide="clock"></i> Aguardando há ${timeWaiting} min
                </div>
            </div>
            <div class="patient-actions">
                <span class="priority-tag tag-${priorityClass}">${p.priority}</span>
                <button data-action="call-patient" data-id="${p.id}" class="btn btn-call">
                    <i data-lucide="megaphone"></i> Chamar
                </button>
            </div>
        </div>
        `;
        }).join('');

        return `<div class="dashboard-grid">${patientCards}</div>`;
    }

    function renderCallPanelScreen() {
        const sortedQueue = [...state.patientQueue].filter(p => p.arrivalTime).sort((a, b) => {
            const timeA = a.arrivalTime.toDate().getTime();
            const timeB = b.arrivalTime.toDate().getTime();
            return b.priorityLevel - a.priorityLevel || timeA - timeB;
        });

        const nextPatients = sortedQueue.filter(p =>
            !state.currentlyCalling || p.id !== state.currentlyCalling.id
        ).slice(0, 3);

        const callingPatient = state.currentlyCalling;
        const now = new Date();

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
                <span id="clock-date">
                    <span class="clock-weekday">${capitalizedWeekday}</span>
                    <span class="clock-day-month">${dayAndMonth}</span>
                </span>
            </div>
        </header>
        
        <main class="panel-main">
            <div class="calling-now ${callingPatient ? 'active' : ''}">
                <p>Chamando Agora</p>
                <span id="panel-currently-calling" class="patient-name">${callingPatient ? (callingPatient.name || 'Aguardando...') : 'Aguardando chamada...'}</span>
            </div>
            
            <div class="next-patients">
                <h2>Próximos Pacientes</h2>
                   <ul id="panel-next-patients">
                        ${nextPatients.map(p => {
            const priorityClassMap = {
                'EMERGÊNCIA': 'red',
                'MUITO URGENTE': 'orange',
                'URGENTE': 'yellow',
                'POUCO URGENTE': 'green',
                'NÃO URGENTE': 'blue'
            };
            const priorityClass = priorityClassMap[p.priority] || 'blue';
            const arrivalDateTime = p.arrivalTime.toDate();
            const timeWaiting = Math.round((new Date() - arrivalDateTime) / 60000);
            const waitTimeText = `Aguardando há ${timeWaiting} min`;
            return `
                                <li>
                                    <div class="patient-name-wrapper">
                                        <span>${p.name}</span>
                                        <small class="wait-time-display">${waitTimeText}</small>
                                    </div>
                                    <span class="priority-tag tag-${priorityClass}">${p.priority}</span>
                                </li>
                            `;
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

        // VERSÃO CORRIGIDA (mais limpa e eficiente)
        if (action === 'start-chat') {
            // Apenas chama a função global que o chat.js já criou
            if (window.openChat) {
                window.openChat();
            }
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

        // DENTRO DO document.body.addEventListener('click', (event) => { ... });

        if (action === 'answer-triage') {
            const nextQuestion = target.dataset.next;
            const classification = target.dataset.classification;

            if (classification) {
                // Se a opção já define uma classificação, a triagem acabou.
                state.currentTriage.classification = classification;
                state.currentPage = 'result';
                render();
            } else if (nextQuestion) {
                // Se a opção leva para a próxima pergunta, renderiza a nova tela.
                appContainer.innerHTML = renderTriageScreen(nextQuestion);
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        }

        if (action === 'call-patient') {
            const patientId = target.dataset.id;
            const patientData = state.patientQueue.find(p => p.id === patientId);

            if (patientData) {
                // 1. ATUALIZA O ESTADO NO FIREBASE
                currentCallDoc.set({
                    name: patientData.name,
                    priority: patientData.priority
                }).then(() => {
                    // 2. SÓ DEPOIS DE ATUALIZAR, REMOVE O PACIENTE DA FILA
                    patientQueueCollection.doc(patientId).delete();
                });

                // 3. AGENDA A LIMPEZA DO PAINEL PARA DAQUI A 15 SEGUNDOS
                setTimeout(() => {
                    currentCallDoc.set({ name: 'Aguardando chamada...' });
                }, 15000);
            }
        }
    });
    // --- FUNÇÃO PRINCIPAL: OUVINTE DO FIREBASE ---
    // --- OUVINTE PARA A CHAMADA ATUAL ---
    // --- FUNÇÃO PRINCIPAL: OUVINTE DA FILA DE PACIENTES ---
    // --- FUNÇÃO PRINCIPAL: OUVINTE DA FILA DE PACIENTES ---
    // --- FUNÇÃO PRINCIPAL: OUVINTE DA FILA DE PACIENTES ---
    function setupFirebaseListeners() {
        patientQueueCollection
            .orderBy("priorityLevel", "desc")
            .orderBy("arrivalTime", "asc")
            .onSnapshot(snapshot => {
                console.log("Recebida atualização da fila de pacientes!");

                state.patientQueue = [];
                snapshot.forEach(doc => {
                    if (doc.data() && doc.data().arrivalTime) {
                        state.patientQueue.push({ id: doc.id, ...doc.data() });
                    }
                });

                if (state.currentPage === 'dashboard') {
                    updateDashboardView();
                } else if (state.currentPage === 'home') {
                    updateHomeScreenView();
                } else if (state.currentPage === 'callPanel') {
                    // MUDANÇA AQUI
                    updateCallPanelView();
                }
            });
    }
    // --- OUVINTE PARA A CHAMADA ATUAL ---
    function setupCurrentCallListener() {
        currentCallDoc.onSnapshot(doc => {
            if (doc.exists && doc.data().name) {
                console.log("Recebida atualização da chamada:", doc.data().name);
                state.currentlyCalling = doc.data();
            } else {
                state.currentlyCalling = null;
            }

            // AGORA, TODAS AS TELAS USAM ATUALIZAÇÕES CIRÚRGICAS
            if (state.currentPage === 'home') {
                updateHomeScreenView();
            } else if (state.currentPage === 'callPanel') {
                updateCallPanelView(); // <-- MUDANÇA AQUI
            }
        });
    }

    function updateDashboardView() {
        const container = document.getElementById('patient-list-container');
        if (!container) return; // Se o container não existe na tela, não faz nada.

        // A função renderDashboardContent continua igual, mas agora seu resultado
        // é usado para preencher apenas o container da lista.
        const patientCardsHTML = renderDashboardContent();

        container.innerHTML = patientCardsHTML;

        // Reativa os ícones após a atualização
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    function updateHomeScreenView() {
        const callingEl = document.getElementById('home-currently-calling');
        const nextPatientsEl = document.getElementById('home-next-patients');

        // Se os elementos não estiverem na tela, não faz nada
        if (!callingEl || !nextPatientsEl) return;

        console.log("Atualizando a home de forma cirúrgica...");

        // Atualiza o nome do paciente sendo chamado
        callingEl.textContent = state.currentlyCalling ? state.currentlyCalling.name : 'Aguardando...';

        // Atualiza a lista de próximos pacientes
        const sortedQueue = [...state.patientQueue].filter(p => p.arrivalTime)
            .sort((a, b) => {
                const timeA = a.arrivalTime.toDate().getTime();
                const timeB = b.arrivalTime.toDate().getTime();
                return b.priorityLevel - a.priorityLevel || timeA - timeB;
            });
        const nextPatients = sortedQueue.slice(0, 2);

        if (nextPatients.length > 0) {
            nextPatientsEl.innerHTML = nextPatients.map(p => `<li>${p.name}</li>`).join('');
        } else {
            nextPatientsEl.innerHTML = '<li>Nenhum paciente na fila</li>';
        }
    }

    function updateCallPanelView() {
        const callingEl = document.getElementById('panel-currently-calling');
        const nextPatientsEl = document.getElementById('panel-next-patients');

        if (!callingEl || !nextPatientsEl) return;

        callingEl.textContent = state.currentlyCalling ? (state.currentlyCalling.name || 'Aguardando...') : 'Aguardando chamada...';

        const sortedQueue = [...state.patientQueue].filter(p => p.arrivalTime).sort((a, b) => {
            const timeA = a.arrivalTime.toDate().getTime();
            const timeB = b.arrivalTime.toDate().getTime();
            return b.priorityLevel - a.priorityLevel || timeA - timeB;
        });

        const nextPatients = sortedQueue.filter(p =>
            !state.currentlyCalling || p.id !== state.currentlyCalling.id
        ).slice(0, 3);

        // NOVO MAPA DE CORES AQUI TAMBÉM
        const priorityClassMap = {
            'EMERGÊNCIA': 'red',
            'MUITO URGENTE': 'orange',
            'URGENTE': 'yellow',
            'POUCO URGENTE': 'green',
            'NÃO URGENTE': 'blue'
        };

        if (nextPatients.length > 0) {
            nextPatientsEl.innerHTML = nextPatients.map(p => {
                const priorityClass = priorityClassMap[p.priority] || 'blue';
                const arrivalDateTime = p.arrivalTime.toDate();
                const timeWaiting = Math.round((new Date() - arrivalDateTime) / 60000);
                const waitTimeText = `Aguardando há ${timeWaiting} min`;
                return `
            <li>
                <div class="patient-name-wrapper">
                    <span>${p.name}</span>
                    <small class="wait-time-display">${waitTimeText}</small>
                </div>
                <span class="priority-tag tag-${priorityClass}">${p.priority}</span>
            </li>
            `;
            }).join('');
        } else {
            nextPatientsEl.innerHTML = '<li class="empty">Nenhum paciente na fila</li>';
        }
    }

    // --- INICIALIZAÇÃO ---
    setupFirebaseListeners(); // Inicia o ouvinte da fila
    setupCurrentCallListener(); // Inicia o ouvinte da chamada atual
    render(); // Renderiza a tela inicial

}); // <-- FIM DO 'DOMContentLoaded'