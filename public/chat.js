document.addEventListener('DOMContentLoaded', () => {
    // --- CRIAÇÃO E INJEÇÃO DO WIDGET DE CHAT ---
    function initializeChatWidget() {
        // Verifica se já foi inicializado
        if (document.getElementById('gemini-chat-container')) {
            return;
        }

        // Cria o container do HTML do chat
        const chatContainer = document.createElement('div');
        chatContainer.id = 'gemini-chat-container';
        chatContainer.innerHTML = `
        <div class="chat-window">
            <div class="chat-header">
                <h3>Assistente Virtual</h3>
                <button id="close-chat-btn" title="Fechar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="chat-messages" id="chat-messages"></div>
            <div class="typing-indicator" id="typing-indicator" style="display: none;">
                <span></span><span></span><span></span>
            </div>
            <form class="chat-input-form" id="chat-form">
                <input type="text" id="chat-input" placeholder="Digite sua dúvida..." autocomplete="off">
                <button type="submit" title="Enviar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </form>
        </div>
        `;

        document.body.appendChild(chatContainer);
    }

    // Inicializa o widget
    initializeChatWidget();

    // --- LÓGICA DO CHAT ---
    // Aguarda um pouco para garantir que os elementos foram criados
    setTimeout(() => {
        // Seletores dos elementos recém-criados
        const chatWindow = document.querySelector('.chat-window');
        const closeChatBtn = document.getElementById('close-chat-btn');
        const chatForm = document.getElementById('chat-form');
        const chatInput = document.getElementById('chat-input');
        const messagesContainer = document.getElementById('chat-messages');
        const typingIndicator = document.getElementById('typing-indicator');

        if (!chatWindow || !closeChatBtn || !chatForm || !chatInput || !messagesContainer || !typingIndicator) {
            console.error('Elementos do chat não encontrados');
            return;
        }

        // Evento para fechar a janela
        closeChatBtn.addEventListener('click', () => {
            chatWindow.classList.remove('open');
        });

        // Evento para enviar mensagem
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const userMessage = chatInput.value.trim();
            if (userMessage) {
                addMessage(userMessage, 'user');
                chatInput.value = '';
                showTypingIndicator();
                getGeminiResponse(userMessage);
            }
        });

        // Função para adicionar mensagem na tela
        function addMessage(text, sender) {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message', `${sender}-message`);
            messageElement.textContent = text;
            messagesContainer.appendChild(messageElement);
            // Rola para a mensagem mais recente
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function showTypingIndicator() {
            typingIndicator.style.display = 'flex';
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function hideTypingIndicator() {
            typingIndicator.style.display = 'none';
        }

        // --- COMUNICAÇÃO COM A IA (GEMINI) VIA BACKEND ---
        async function getGeminiResponse(question) {
            const apiUrl = 'http://localhost:3000/chat'; // URL do nosso backend

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ question: question }), // Envia a pergunta no corpo da requisição
                });

                if (!response.ok) {
                    // Se o servidor retornar um erro (ex: 500), lança uma exceção
                    throw new Error(`Erro do servidor: ${response.statusText}`);
                }

                const data = await response.json();
                
                // Adiciona a resposta da IA na tela
                hideTypingIndicator();
                addMessage(data.answer, 'ai');

            } catch (error) {
                console.error('Falha ao obter resposta da IA:', error);
                const errorMessage = "Desculpe, meu cérebro digital parece estar offline no momento. 🧠🔌 Por favor, tente novamente mais tarde.";
                hideTypingIndicator();
                addMessage(errorMessage, 'ai');
            }
        }

        // Expõe função globalmente para ser chamada pelo script principal
        window.openChat = function() {
            chatWindow.classList.add('open');
            // Adiciona uma mensagem de boas-vindas na primeira vez que abre
            if (messagesContainer.children.length === 0) {
                addMessage("Olá! Sou o assistente virtual da UBS. Como posso ajudar a tirar suas dúvidas sobre nossos serviços ou sobre saúde?", 'ai');
            }
        };

    }, 100); // Aguarda 100ms para garantir que os elementos foram criados
});