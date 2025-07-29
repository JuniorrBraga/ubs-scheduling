# 🏥 UBS Atendimentos - Sistema de Agendamento Inteligente

Um protótipo funcional de um sistema de agendamento inteligente para *Unidades Básicas de Saúde (UBS). Nosso objetivo principal é otimizar o fluxo de atendimento, **reduzindo o tempo de espera* e *priorizando pacientes com base na urgência clínica*, em vez da simples ordem de chegada.

Este projeto foi desenvolvido como uma *Single Page Application (SPA)* utilizando *HTML, CSS e JavaScript puros*, focando em uma experiência de usuário limpa, moderna e responsiva.

---

## ✨ Funcionalidades Principais

O sistema possui duas interfaces principais: uma para o paciente e outra para a equipe da UBS.

### Para Pacientes:

* *Triagem Inteligente*: Um questionário dinâmico e visual guia o paciente através de perguntas simples para avaliar seus sintomas.
* *Cálculo de Prioridade: Com base nas respostas, um algoritmo de pontuação classifica o atendimento em **Baixa, **Média* ou *Alta prioridade*.
* *Resultado Imediato*: O paciente recebe uma recomendação clara e entende seu nível de urgência antes mesmo de falar com um atendente.

### Para a Equipe da UBS:

* *Painel de Atendimento (Dashboard)*: Uma visão em tempo real da fila de espera.
* *Fila Priorizada*: Os pacientes são automaticamente organizados por nível de prioridade (vermelho > amarelo > verde) e, em seguida, por ordem de chegada.
* *Informações Relevantes*: A equipe pode visualizar o nome do paciente, o tempo de espera, o nível de prioridade e os principais sintomas relatados.
* *Gerenciamento da Fila*: A equipe pode "chamar" um paciente, removendo-o da fila e atualizando o painel para todos.

---

## 🚀 Tecnologias Utilizadas

Este projeto foi construído com foco na simplicidade e agilidade, utilizando tecnologias web fundamentais:

* *HTML5*: Para a estrutura semântica do conteúdo.
* *Tailwind CSS*: Um framework CSS "utility-first" para criar um design moderno e totalmente responsivo de forma rápida.
* *JavaScript (ES6+)*: Para toda a lógica da aplicação, manipulação do DOM e gerenciamento de estado (sem a necessidade de frameworks como React ou Vue.js).
* *Lucide Icons*: Uma biblioteca de ícones SVG leve e clara.
* *Google Fonts*: Para a tipografia (fonte "Inter").

---

## ⚙️ Como Executar

Como este é um protótipo contido em um único arquivo, não há necessidade de instalação de dependências ou de um servidor web.

1.  Faça o download do arquivo ubs_atendimentos.html.
2.  Abra o arquivo em qualquer navegador de internet moderno (como Google Chrome, Firefox, Microsoft Edge).
3.  A aplicação funcionará inteiramente no seu navegador!

---

## 🔮 Próximos Passos (Melhorias Futuras)

Este protótipo é a base para um sistema completo. Os próximos passos planejados incluem:

* *Integração com Banco de Dados*: Substituir o estado local em JavaScript por um banco de dados em tempo real (como Firebase/Firestore) para persistir os dados e sincronizar a fila entre múltiplos dispositivos.
* *Autenticação de Usuários*: Implementar um sistema de login seguro para a equipe da UBS.
* *Painel de Chamadas (TV)*: Criar uma visualização pública para ser exibida em telas na sala de espera.
* *Módulo Administrativo*: Permitir que administradores da UBS customizem as perguntas e a pontuação da triagem.
* *Histórico do Paciente*: Integrar de forma segura com sistemas de prontuário eletrônico para uma triagem ainda mais precisa.

---