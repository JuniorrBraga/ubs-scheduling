// knowledge_base.js

const ubsInfo = `
Informações sobre a Unidade Básica de Saúde (UBS) Atendimentos:

- **Horário de Funcionamento**:
  - Segunda a Sexta: 7h00 às 19h00.
  - Sábados, Domingos e Feriados: Fechado.

- **Serviços Oferecidos**:
  - Triagem de pacientes com classificação de risco.
  - Consultas médicas (clínica geral).
  - Renovação de receitas para medicamentos de uso contínuo.
  - Aplicação de vacinas (conforme calendário nacional).
  - Curativos simples.
  - Coleta de exames laboratoriais (requer agendamento prévio).

- **Procedimentos Comuns**:
  - **Agendamento de Consultas**: O agendamento inicial é feito através da triagem na tela "Sou Paciente". Consultas de retorno são marcadas pela equipe ao final do atendimento.
  - **Renovação de Receitas**: O paciente deve usar a opção "Renovação de receita" na triagem. É necessário ter o nome do medicamento ou a receita antiga.
  - **Resultados de Exames**: Devem ser retirados na recepção, de segunda a sexta, das 10h às 16h, apresentando um documento de identificação.

- **Contato**:
  - Endereço: Rua da Saúde, 123 - Centro.
  - Telefone para dúvidas gerais: (11) 5555-1234 (Este telefone não realiza agendamentos).

- **Informações sobre Condições de Saúde (Lembretes para a IA)**:
  - **Febre**: Considerar febre acima de 37.8°C. Recomendar atendimento médico se for alta (>38.5°C), persistente por mais de 3 dias, ou acompanhada de sintomas graves como dificuldade para respirar ou dor no peito.
  - **Dor de Cabeça**: Se a dor for súbita e intensa, diferente do habitual, ou acompanhada de febre, rigidez no pescoço ou confusão mental, recomendar atendimento de emergência.
`;

module.exports = { ubsInfo };