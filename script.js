document.addEventListener('DOMContentLoaded', () => {

    // --- BANCO DE DADOS SIMULADO DE PACIENTES (PARA HISTÓRICO) ---
    const patientDatabase = {
        'Carlos Pereira': { hasChronicCondition: true, conditions: ['Hipertensão'] },
        'Ana Souza': { hasChronicCondition: false, conditions: [] },
        'Juliana Costa': { hasChronicCondition: true, conditions: ['Asma'] },
    };

    // --- BANCO DE DADOS DAS PERGUNTAS DE TRIAGEM (COM LOCALSTORAGE) ---
    const STORAGE_KEY = 'ubs-triage-questions';
    const defaultTriageQuestions = {
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
        'fever': {
            text: 'Você tem febre?',
            icon: 'Thermometer',
            options: [
                { text: 'Sim', value: 3, next: 'pain' },
                { text: 'Não', value: 0, next: 'pain' }
            ]
        },
        'pain': {
            text: 'Em uma escala de 0 a 10, qual o seu nível de dor?',
            icon: 'Frown',
            options: [
                { text: 'Leve (1-3)', value: 1, next: 'chronic' },
                { text: 'Moderada (4-6)', value: 3, next: 'chronic' },
                { text: 'Intensa (7-10)', value: 6, next: 'chronic' }
            ]
        },
        'chronic': {
            text: 'Você possui alguma condição crônica (diabetes, hipertensão, etc)?',
            icon: 'HeartPulse',
            options: [
                { text: 'Sim', value: 2, next: 'final' },
                { text: 'Não', value: 0, next: 'final' }
            ]
        }
    };
    
    // Carrega perguntas do localStorage ou usa o padrão. Base para o Módulo Admin.
    const triageQuestions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultTriageQuestions;
    
    // Salva o padrão se nada existir no localStorage
    if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultTriageQuestions));
    }

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
        currentUser: null, // 'patient' ou 'staff'
        currentlyCalling: null // Armazena o paciente sendo chamado para o painel de TV
    };

    const appContainer = document.getElementById('app');

    // --- LÓGICA DE RENDERIZAÇÃO ---
    function render() {
        appContainer.innerHTML = '';
        let content = '';
        let activeIntervals = []; // Para limpar intervalos antigos

        // Limpa intervalos para evitar múltiplas execuções
        activeIntervals.forEach(clearInterval);
        activeIntervals = [];

        switch (state.currentPage) {
            case 'login':
                content = renderLoginScreen();
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
                    if (dashboardContent) {
                        dashboardContent.innerHTML = renderDashboardContent();
                        attachDashboardListeners();
                    }
                }, 100); // Reduzido o tempo para carregar mais rápido
                break;
            case 'callPanel':
                content = renderCallPanelScreen();
                // Intervalo para atualizar o relógio
                const clockInterval = setInterval(() => {
                    const timeEl = document.getElementById('current-time');
                    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString('pt-BR');
                }, 1000);
                activeIntervals.push(clockInterval);

                // Intervalo para atualizar a lista de pacientes no painel
                 const panelRefreshInterval = setInterval(() => {
                    if (state.currentPage === 'callPanel') {
                         const mainContent = document.querySelector('main');
                         if(mainContent) mainContent.innerHTML = renderCallPanelScreen(true); // Re-renderiza só o conteúdo
                         lucide.createIcons();
                    }
                 }, 5000); // Atualiza a cada 5 segundos
                 activeIntervals.push(panelRefreshInterval);
                break;
        }

        appContainer.innerHTML = content;
        attachEventListeners();
        lucide.createIcons();
    }

    // --- GERADORES DE CONTEÚDO HTML (VIEWS) ---

    function renderLoginScreen() {
        return `
            <header class="bg-white shadow-sm">
                <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-center">
                    <div class="flex items-center gap-3">
                        <div class="bg-blue-600 p-3 rounded-xl shadow-md">
                            <i data-lucide="HeartPulse" class="text-white h-7 w-7"></i>
                        </div>
                        <div class="flex flex-col">
                            <h1 class="text-2xl font-bold text-blue-600 leading-tight">UBS</h1>
                            <p class="text-lg font-medium text-slate-600 leading-tight">Atendimentos</p>
                        </div>
                    </div>
                </div>
            </header>
            <main class="flex-grow flex items-center justify-center p-4">
                <div class="w-full max-w-md bg-white p-8 rounded-xl shadow-lg text-center fade-in">
                    <h2 class="text-2xl font-bold mb-2">Bem-vindo(a)!</h2>
                    <p class="text-slate-600 mb-8">Selecione seu perfil para continuar.</p>
                    <div class="space-y-4">
                        <button data-action="start-triage" class="w-full bg-blue-600 text-white font-bold py-4 px-4 rounded-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 text-lg">
                            <i data-lucide="User"></i>
                            Sou Paciente
                        </button>
                        <button data-action="view-dashboard" class="w-full bg-slate-200 text-slate-700 font-bold py-4 px-4 rounded-lg hover:bg-slate-300 transition-all duration-300 flex items-center justify-center gap-2 text-lg">
                            <i data-lucide="ClipboardList"></i>
                            Sou da Equipe
                        </button>
                         <button data-action="view-call-panel" class="w-full bg-gray-700 text-white font-bold py-4 px-4 rounded-lg hover:bg-gray-800 transition-all duration-300 flex items-center justify-center gap-2 text-lg">
                            <i data-lucide="MonitorPlay"></i>
                            Painel de Chamadas (TV)
                        </button>
                    </div>
                </div>
            </main>
        `;
    }

    function renderTriageScreen(questionId) {
        const question = triageQuestions[questionId];
        
        // Se a pergunta sobre condição crônica já foi respondida pelo histórico, pula para o final
        if(questionId === 'chronic' && state.currentTriage.answers['chronic']) {
             calculateAndShowResult();
             return;
        }

        const optionsHtml = question.options.map(opt => `
            <button data-action="answer-triage" data-value="${opt.value}" data-next="${opt.next}" class="w-full text-left bg-white p-4 rounded-lg border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 flex items-center gap-4">
                 <i data-lucide="${question.icon}" class="text-blue-600"></i>
                 <span class="font-semibold">${opt.text}</span>
            </button>
        `).join('');

        return `
            <header class="bg-white shadow-sm">
                <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                     <button data-action="go-home" class="text-slate-600 hover:text-blue-600"><i data-lucide="ArrowLeft"></i></button>
                     <h1 class="text-xl font-bold text-blue-600">Triagem Inteligente</h1>
                     <div class="w-8"></div>
                </div>
            </header>
            <main class="flex-grow flex items-center justify-center p-4">
                <div class="w-full max-w-2xl text-center fade-in">
                    ${state.currentUser === 'patient' && !state.currentTriage.patientName ? `
                        <div class="bg-white p-8 rounded-xl shadow-lg mb-6">
                            <h2 class="text-2xl font-bold mb-4">Antes de começar, qual o seu nome?</h2>
                            <input type="text" id="patient-name-input" placeholder="Digite seu nome completo" class="w-full border-2 border-slate-300 rounded-lg p-3 text-center focus:border-blue-500 focus:ring-blue-500">
                            <button data-action="submit-name" class="mt-4 w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-all">Continuar</button>
                        </div>
                    ` : `
                        <div class="bg-white p-8 rounded-xl shadow-lg">
                            <h2 class="text-2xl font-bold mb-6">${question.text}</h2>
                            <div class="space-y-3">
                                ${optionsHtml}
                            </div>
                        </div>
                    `}
                </div>
            </main>
        `;
    }

    function calculateAndShowResult() {
        state.currentPage = 'result';
        render();
    }

    function renderResultScreen() {
        const score = state.currentTriage.score;
        let priority, priorityLevel, priorityColor, recommendation, icon;

        if (score >= 9) {
            priority = 'Alta';
            priorityLevel = 3;
            priorityColor = 'red';
            icon = 'AlertTriangle';
            recommendation = 'Seus sintomas indicam necessidade de atendimento prioritário. Por favor, dirija-se à recepção imediatamente.';
        } else if (score >= 4) {
            priority = 'Média';
            priorityLevel = 2;
            priorityColor = 'yellow';
            icon = 'Clock';
            recommendation = 'Seu atendimento tem prioridade moderada. Aguarde o chamado no painel. O tempo de espera estimado é menor.';
        } else {
            priority = 'Baixa';
            priorityLevel = 1;
            priorityColor = 'green';
            icon = 'CheckCircle';
            recommendation = 'Seu caso é de baixa urgência. O atendimento será realizado em breve. O tempo de espera pode variar conforme a demanda de casos urgentes.';
        }
        
        const newPatient = {
            id: Date.now(),
            name: state.currentTriage.patientName,
            priority: priority,
            priorityLevel: priorityLevel,
            symptoms: Object.values(state.currentTriage.answers),
            arrivalTime: new Date()
        };
        // Adiciona o paciente apenas uma vez
        if (!state.patientQueue.some(p => p.id === newPatient.id)) {
            state.patientQueue.push(newPatient);
        }

        return `
            <header class="bg-white shadow-sm">
                <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-center">
                     <h1 class="text-xl font-bold text-blue-600">Resultado da Triagem</h1>
                </div>
            </header>
            <main class="flex-grow flex items-center justify-center p-4">
                <div class="w-full max-w-md bg-white p-8 rounded-xl shadow-lg text-center fade-in">
                    <div class="mb-4 inline-block p-4 bg-${priorityColor}-100 rounded-full">
                        <i data-lucide="${icon}" class="w-12 h-12 text-${priorityColor}-600"></i>
                    </div>
                    <h2 class="text-2xl font-bold mb-2">Olá, ${state.currentTriage.patientName}!</h2>
                    <p class="text-slate-600 mb-4">Sua prioridade de atendimento é:</p>
                    <p class="text-4xl font-bold text-${priorityColor}-600 mb-6">${priority}</p>
                    
                    <div class="bg-slate-100 p-4 rounded-lg text-left">
                        <h3 class="font-bold mb-2">Recomendação:</h3>
                        <p class="text-slate-700">${recommendation}</p>
                    </div>

                    <div class="mt-6 text-sm text-slate-500">
                        <p>Sua posição na fila e o tempo estimado serão atualizados em tempo real no painel de chamadas da UBS.</p>
                    </div>

                    <button data-action="go-home" class="mt-8 w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-all">Entendido</button>
                </div>
            </main>
        `;
    }

    function renderDashboardScreen() {
        return `
            <header class="bg-white shadow-sm sticky top-0 z-10">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="bg-blue-600 p-2 rounded-lg">
                            <i data-lucide="HeartPulse" class="text-white h-6 w-6"></i>
                        </div>
                        <div class="flex flex-col">
                            <h1 class="text-xl font-bold text-blue-600 leading-tight">UBS</h1>
                            <p class="text-md font-medium text-slate-600 leading-tight">Atendimentos</p>
                        </div>
                    </div>
                    <h2 class="hidden sm:block text-xl font-semibold text-slate-700">Painel de Atendimento</h2>
                    <button data-action="go-home" class="bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 transition-all flex items-center gap-2">
                        <i data-lucide="LogOut" class="w-4 h-4"></i>
                        Sair
                    </button>
                </div>
            </header>
            <main id="dashboard-content" class="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                <div class="space-y-4">
                    <div class="h-24 skeleton-card"></div>
                    <div class="h-24 skeleton-card"></div>
                    <div class="h-24 skeleton-card"></div>
                </div>
            </main>
        `;
    }

    function renderDashboardContent() {
        const sortedQueue = [...state.patientQueue].sort((a, b) => {
            if (b.priorityLevel !== a.priorityLevel) {
                return b.priorityLevel - a.priorityLevel;
            }
            return a.arrivalTime - b.arrivalTime;
        });

        if (sortedQueue.length === 0) {
            return `
                <div class="text-center py-20 fade-in">
                    <i data-lucide="CheckSquare" class="mx-auto w-16 h-16 text-green-500"></i>
                    <h2 class="mt-4 text-2xl font-bold">Nenhum paciente na fila.</h2>
                    <p class="mt-2 text-slate-600">Aguardando novas triagens.</p>
                </div>
            `;
        }

        const patientCards = sortedQueue.map((patient, index) => {
            const priorityClasses = {
                'Alta': 'border-red-500 bg-red-50',
                'Média': 'border-yellow-500 bg-yellow-50',
                'Baixa': 'border-green-500 bg-green-50'
            };
            const priorityTextClasses = {
                'Alta': 'text-red-600 bg-red-100',
                'Média': 'text-yellow-600 bg-yellow-100',
                'Baixa': 'text-green-600 bg-green-100'
            };
            const timeWaiting = Math.round((new Date() - new Date(patient.arrivalTime)) / 60000);

            return `
                <div class="bg-white rounded-lg shadow-md border-l-4 ${priorityClasses[patient.priority]} overflow-hidden fade-in" style="animation-delay: ${index * 50}ms">
                    <div class="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div class="flex-grow">
                            <div class="flex items-center gap-3 mb-2">
                                <span class="font-bold text-lg text-slate-800">${patient.name}</span>
                                <span class="text-xs font-bold px-2 py-1 rounded-full ${priorityTextClasses[patient.priority]}">${patient.priority}</span>
                            </div>
                            <div class="text-sm text-slate-600 flex items-center gap-2">
                                <i data-lucide="List" class="w-4 h-4"></i>
                                <span>Motivo: ${patient.symptoms.join(', ') || 'Não especificado'}</span>
                            </div>
                            <div class="text-sm text-slate-600 flex items-center gap-2 mt-1">
                                <i data-lucide="Clock" class="w-4 h-4"></i>
                                <span>Aguardando há ${timeWaiting} min</span>
                            </div>
                        </div>
                        <div class="flex-shrink-0 w-full sm:w-auto">
                            <button data-action="call-patient" data-id="${patient.id}" class="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                                <i data-lucide="Megaphone"></i>
                                Chamar Paciente
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="space-y-4">${patientCards}</div>`;
    }
    
    function renderCallPanelScreen(isUpdate = false) {
        const sortedQueue = [...state.patientQueue].sort((a, b) => {
            if (b.priorityLevel !== a.priorityLevel) return b.priorityLevel - a.priorityLevel;
            return new Date(a.arrivalTime) - new Date(b.arrivalTime);
        });

        const upcomingPatients = sortedQueue.filter(p => !state.currentlyCalling || p.id !== state.currentlyCalling.id);
        const callingPatient = state.currentlyCalling;
        
        const content = `
            <header class="flex justify-between items-center mb-8">
                <div class="flex items-center gap-4">
                    <i data-lucide="HeartPulse" class="h-12 w-12 text-blue-400"></i>
                    <div>
                        <h1 class="text-4xl font-bold">Painel de Atendimento</h1>
                        <p class="text-2xl text-slate-300">UBS Atendimentos</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-5xl font-bold" id="current-time">${new Date().toLocaleTimeString('pt-BR')}</p>
                    <p class="text-2xl text-slate-300">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
            </header>
            
            <div class="grid grid-cols-3 gap-8">
                <div class="col-span-3 lg:col-span-2 bg-blue-600 rounded-xl p-8 shadow-2xl">
                    <h2 class="text-3xl font-semibold text-blue-200 mb-4">Chamando Agora</h2>
                    ${callingPatient ? `
                        <div class="animate-pulse">
                            <p class="text-8xl font-bold">${callingPatient.name}</p>
                            <p class="text-5xl mt-2 text-yellow-300">Prioridade: ${callingPatient.priority}</p>
                        </div>
                    ` : `
                        <div class="text-6xl font-bold text-blue-300 flex items-center gap-4">
                            <i data-lucide="Coffee"></i>
                            <span>Aguardando chamada...</span>
                        </div>
                    `}
                </div>

                <div class="col-span-3 lg:col-span-1 bg-gray-700 rounded-xl p-8 shadow-lg">
                    <h2 class="text-3xl font-bold mb-6">Próximos Pacientes</h2>
                    <ul class="space-y-4">
                        ${upcomingPatients.slice(0, 5).map(p => `
                            <li class="text-2xl font-medium p-3 bg-gray-600 rounded-lg flex justify-between items-center">
                                <span>${p.name}</span>
                                <span class="text-sm font-bold px-2 py-1 rounded-full 
                                    ${p.priority === 'Alta' ? 'bg-red-500' : p.priority === 'Média' ? 'bg-yellow-500' : 'bg-green-500'}">
                                    ${p.priority}
                                </span>
                            </li>
                        `).join('')}
                         ${upcomingPatients.length === 0 && !callingPatient ? '<li class="text-xl text-slate-300">Nenhum paciente na fila.</li>' : ''}
                    </ul>
                </div>
            </div>
             <button data-action="go-home" class="absolute bottom-4 right-4 bg-slate-200 text-slate-700 p-2 rounded-full hover:bg-slate-300 transition-all">
                <i data-lucide="X"></i>
            </button>
        `;
        
        // Se for uma atualização, não renderiza todo o contêiner, só o conteúdo do main
        return isUpdate ? content : `<main class="bg-gray-800 text-white min-h-screen p-8">${content}</main>`;
    }


    // --- MANIPULADORES DE EVENTOS ---
    function attachEventListeners() {
        const triageButton = document.querySelector('[data-action="start-triage"]');
        if (triageButton) triageButton.addEventListener('click', startTriage);

        const dashboardButton = document.querySelector('[data-action="view-dashboard"]');
        if (dashboardButton) dashboardButton.addEventListener('click', viewDashboard);
        
        const callPanelButton = document.querySelector('[data-action="view-call-panel"]');
        if (callPanelButton) callPanelButton.addEventListener('click', viewCallPanel);

        // Ação de voltar para home/login pode estar em múltiplas telas
        document.querySelectorAll('[data-action="go-home"]').forEach(button => {
            button.addEventListener('click', goHome);
        });

        const nameSubmitButton = document.querySelector('[data-action="submit-name"]');
        if (nameSubmitButton) nameSubmitButton.addEventListener('click', submitNameAndStart);

        const triageOptions = document.querySelectorAll('[data-action="answer-triage"]');
        triageOptions.forEach(button => button.addEventListener('click', handleTriageAnswer));
    }

    function attachDashboardListeners() {
        const callButtons = document.querySelectorAll('[data-action="call-patient"]');
        callButtons.forEach(button => button.addEventListener('click', callPatient));
        lucide.createIcons();
    }

    function startTriage() {
        state.currentUser = 'patient';
        state.currentPage = 'triage';
        state.currentTriage = { answers: {}, score: 0, patientName: '' };
        render();
    }

    function viewDashboard() {
        state.currentUser = 'staff';
        state.currentPage = 'dashboard';
        render();
    }

    function viewCallPanel() {
        state.currentPage = 'callPanel';
        render();
    }

    function goHome() {
        state.currentPage = 'login';
        state.currentUser = null;
        state.currentlyCalling = null; // Limpa o paciente chamado ao sair
        render();
    }

    function submitNameAndStart() {
        const nameInput = document.getElementById('patient-name-input');
        const patientName = nameInput.value.trim();

        if (patientName !== '') {
            state.currentTriage.patientName = patientName;

            // --- LÓGICA DE HISTÓRICO DO PACIENTE (SIMULAÇÃO) ---
            const patientHistory = patientDatabase[patientName];
            if (patientHistory && patientHistory.hasChronicCondition) {
                state.currentTriage.score += 2; // Adiciona pontos pela condição crônica
                state.currentTriage.answers['chronic'] = `Condição crônica (${patientHistory.conditions.join(', ')})`;
                // Alerta para o usuário (opcional)
                // alert(`Olá, ${patientName}! Verificamos em seu histórico a condição de ${patientHistory.conditions.join(', ')}. Isso será considerado na sua triagem.`);
            }
            render();
        } else {
            alert('Por favor, digite seu nome para continuar.');
        }
    }

    function handleTriageAnswer(event) {
        const target = event.currentTarget;
        const value = parseInt(target.dataset.value, 10);
        const nextQuestionId = target.dataset.next;

        state.currentTriage.score += value;
        state.currentTriage.answers[nextQuestionId] = target.querySelector('span').textContent;

        if (nextQuestionId === 'final') {
            calculateAndShowResult();
        } else {
            // Re-renderiza a tela de triagem para a próxima pergunta
            const triageContent = renderTriageScreen(nextQuestionId);
            if(triageContent) { // Verifica se não pulou direto para o resultado
                appContainer.innerHTML = triageContent;
                attachEventListeners();
                lucide.createIcons();
            }
        }
    }

    function callPatient(event) {
        if(state.currentlyCalling) {
            alert("Aguarde o paciente anterior ser removido do painel antes de chamar o próximo.");
            return;
        }
        
        const button = event.currentTarget;
        const patientId = parseInt(button.dataset.id, 10);
        const patientToCall = state.patientQueue.find(p => p.id === patientId);

        if (!patientToCall) return;

        state.currentlyCalling = patientToCall;

        button.disabled = true;
        button.innerHTML = '<i data-lucide="Volume2"></i> Chamando...';
        lucide.createIcons();

        // No painel de TV, a atualização será pega pelo setInterval
        // No dashboard, removemos o paciente após 15s para simular o atendimento
        setTimeout(() => {
            state.patientQueue = state.patientQueue.filter(p => p.id !== patientId);
            state.currentlyCalling = null;

            if (state.currentPage === 'dashboard') {
                const dashboardContent = document.getElementById('dashboard-content');
                if (dashboardContent) {
                    dashboardContent.innerHTML = renderDashboardContent();
                    attachDashboardListeners();
                }
            }
        }, 15000); // Mantém o paciente no painel por 15 segundos
    }

    // --- INICIALIZAÇÃO ---
    render();
});