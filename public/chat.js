document.addEventListener('DOMContentLoaded', () => {
    // ... (todo o código de criação do widget) ...
    function initializeChatWidget() {
        if (document.getElementById('gemini-chat-container')) return;
        const chatContainer = document.createElement('div');
        chatContainer.id = 'gemini-chat-container';
        chatContainer.innerHTML = `
        <div class="chat-window">
            <div class="chat-header">
                <h3>Assistente Virtual</h3>
                <button id="close-chat-btn" title="Fechar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div class="chat-messages" id="chat-messages"></div>
            <div class="typing-indicator" id="typing-indicator" style="display: none;">
                <span></span><span></span><span></span>
            </div>
            <form class="chat-input-form" id="chat-form">
                <input type="text" id="chat-input" placeholder="Digite sua dúvida..." autocomplete="off">
                <button type="submit" title="Enviar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            </form>
        </div>
        `;
        document.body.appendChild(chatContainer);
    }
    initializeChatWidget();

    setTimeout(() => {
        const chatWindow = document.querySelector('.chat-window');
        const closeChatBtn = document.getElementById('close-chat-btn');
        const chatForm = document.getElementById('chat-form');
        const chatInput = document.getElementById('chat-input');
        const messagesContainer = document.getElementById('chat-messages');
        const typingIndicator = document.getElementById('typing-indicator');

        if (!chatWindow || !closeChatBtn || !chatForm) return;

        closeChatBtn.addEventListener('click', () => chatWindow.classList.remove('open'));
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

        function addMessage(text, sender) { /* ... */ }
        function showTypingIndicator() { /* ... */ }
        function hideTypingIndicator() { /* ... */ }
        
        async function getGeminiResponse(question) {
            // MUDANÇA PRINCIPAL AQUI:
            const apiUrl = 'URL_DA_SUA_CLOUD_FUNCTION_AQUI'; // <--- COLE SUA URL AQUI

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question }),
                });
                if (!response.ok) throw new Error(`Erro do servidor: ${response.status}`);
                const data = await response.json();
                hideTypingIndicator();
                addMessage(data.answer, 'ai');
            } catch (error) {
                console.error('Falha ao obter resposta da IA:', error);
                const errorMessage = "Desculpe, não consegui conectar ao assistente. Tente novamente mais tarde.";
                hideTypingIndicator();
                addMessage(errorMessage, 'ai');
            }
        }

        window.openChat = function() {
            chatWindow.classList.add('open');
            if (messagesContainer.children.length === 0) {
                addMessage("Olá! Sou o assistente virtual da UBS. Como posso ajudar?", 'ai');
            }
        };
    }, 100);
});
