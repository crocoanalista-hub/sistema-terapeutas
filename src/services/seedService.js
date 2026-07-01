import { db } from "./firebaseConfig";
import { collection, addDoc, setDoc, doc, getDocs, query, where, deleteDoc } from "firebase/firestore";

// ─── Dados de exemplo ─────────────────────────────────────────────────────────

const PACIENTES = [
  {
    nome: "Ana Beatriz Santos",
    telefone: "(11) 98456-2310",
    email: "ana.beatriz@email.com",
    dataNascimento: "1995-04-12",
    cpf: "382.451.890-22",
    profissao: "Designer Gráfica",
    observacoes: "Encaminhada pelo Dr. Marcos. Queixa principal: ansiedade generalizada e insônia.",
  },
  {
    nome: "Carlos Eduardo Oliveira",
    telefone: "(11) 99234-5678",
    email: "carlosedu@gmail.com",
    dataNascimento: "1988-09-03",
    cpf: "541.230.110-77",
    profissao: "Engenheiro Civil",
    observacoes: "Transtorno depressivo moderado. Em acompanhamento psiquiátrico com uso de sertralina.",
  },
  {
    nome: "Marina Ferreira Lima",
    telefone: "(11) 97654-3210",
    email: "marina.ferreira@hotmail.com",
    dataNascimento: "1981-11-22",
    cpf: "218.904.560-11",
    profissao: "Professora",
    observacoes: "Crise de pânico recorrente. Dificuldade em ambientes fechados.",
  },
  {
    nome: "Pedro Henrique Costa",
    telefone: "(11) 98800-1122",
    email: "pedro.costa@email.com",
    dataNascimento: "2004-02-15",
    cpf: "789.012.340-55",
    profissao: "Estudante universitário",
    observacoes: "Fobia social. Primeiras sessões bem receptivo à TCC.",
  },
  {
    nome: "Juliana Alves Martins",
    telefone: "(11) 96543-9900",
    email: "ju.alves@empresa.com",
    dataNascimento: "1992-07-08",
    cpf: "654.321.780-33",
    profissao: "Gerente de Projetos",
    observacoes: "Burnout e síndrome do impostor. Busca equilíbrio entre vida profissional e pessoal.",
  },
  {
    nome: "Roberto Silva Neto",
    telefone: "(11) 99011-4455",
    email: "roberto.neto@email.com",
    dataNascimento: "1968-03-30",
    cpf: "123.456.780-99",
    profissao: "Aposentado",
    observacoes: "Processo de luto após perda da esposa. Relutante no início, mas muito engajado.",
  },
  {
    nome: "Camila Rocha Mendonça",
    telefone: "(11) 97788-6600",
    email: "camila.rocha@email.com",
    dataNascimento: "1998-12-05",
    cpf: "901.234.560-44",
    profissao: "Enfermeira",
    observacoes: "TEPT decorrente de trauma hospitalar. Sessões quinzenais no momento.",
  },
  {
    nome: "Thiago Mendes Carvalho",
    telefone: "(11) 98912-3344",
    email: "thiagomcarvalho@gmail.com",
    dataNascimento: "1985-06-17",
    cpf: "456.789.010-66",
    profissao: "Empreendedor",
    observacoes: "TDAH diagnosticado recentemente. Dificuldade de organização e procrastinação crônica.",
  },
  {
    nome: "Fernanda Gomes Pires",
    telefone: "(11) 96321-7788",
    email: "fegomes@email.com",
    dataNascimento: "1990-08-25",
    cpf: "234.567.890-00",
    profissao: "Advogada",
    observacoes: "Relacionamento abusivo no passado. Trabalhando autoestima e limites.",
  },
  {
    nome: "Lucas Teixeira Braga",
    telefone: "(11) 99456-0011",
    email: "lucas.braga@email.com",
    dataNascimento: "2001-01-19",
    cpf: "678.901.230-88",
    profissao: "Desenvolvedor de Software",
    observacoes: "Transtorno de ansiedade social. Muito motivado com os resultados das últimas sessões.",
  },
];

// Gera datas relativas ao hoje
const diasAnteriores = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const diasFuturos = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const HORAS = ["08:00","09:00","10:00","11:00","14:00","15:00","16:00","17:00","18:00","19:00"];

function horaAleatoria() {
  return HORAS[Math.floor(Math.random() * HORAS.length)];
}

// ─── Limpar dados antigos ─────────────────────────────────────────────────────

const limparColecao = async (workspaceId, nomeColecao, campo = "terapeutaId") => {
  const q = query(collection(db, nomeColecao), where(campo, "==", workspaceId));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
};

// ─── Profissionais fictícios ──────────────────────────────────────────────────

const PROFISSIONAIS_DEMO = [
  {
    nome: "Dra. Camila Borges",
    especialidade: "Massoterapeuta",
    cor: "#e91e63",
    email: "camila.borges@demo.com",
    procedimentos: [
      { id: "proc_camila_1", nome: "Massoterapia Relaxante", duracao: 60, valor: 150 },
      { id: "proc_camila_2", nome: "Massoterapia Terapêutica", duracao: 90, valor: 200 },
      { id: "proc_camila_3", nome: "Reflexologia", duracao: 45, valor: 120 },
    ],
  },
  {
    nome: "Dr. Rafael Mendonça",
    especialidade: "Psicanalista",
    cor: "#2196f3",
    email: "rafael.mendonca@demo.com",
    procedimentos: [
      { id: "proc_rafael_1", nome: "Sessão de Psicanálise", duracao: 50, valor: 200 },
      { id: "proc_rafael_2", nome: "Avaliação Psicológica", duracao: 90, valor: 350 },
      { id: "proc_rafael_3", nome: "Psicoterapia de Apoio", duracao: 60, valor: 180 },
    ],
  },
  {
    nome: "Dra. Patrícia Leal",
    especialidade: "Terapeuta Familiar",
    cor: "#4caf50",
    email: "patricia.leal@demo.com",
    procedimentos: [
      { id: "proc_patricia_1", nome: "Terapia Familiar", duracao: 90, valor: 280 },
      { id: "proc_patricia_2", nome: "Mediação de Conflitos", duracao: 60, valor: 220 },
      { id: "proc_patricia_3", nome: "Orientação Parental", duracao: 60, valor: 200 },
    ],
  },
];

// ─── Seed principal ───────────────────────────────────────────────────────────

export const seedDadosDemo = async (workspaceId, onProgresso) => {
  const prog = (msg) => onProgresso && onProgresso(msg);

  prog("Limpando dados anteriores…");
  await limparColecao(workspaceId, "pacientes");
  await limparColecao(workspaceId, "agendamentos");
  await limparColecao(workspaceId, "anamneses");
  await limparColecao(workspaceId, "evolucoes");
  await limparColecao(workspaceId, "solicitacoes", "workspaceId");
  await limparColecao(workspaceId, "profissionais", "workspaceId");

  prog("Criando profissionais…");
  const idsProfissionais = [];
  for (const p of PROFISSIONAIS_DEMO) {
    // Usa addDoc — cria doc com ID aleatório sem precisar de conta Auth
    const ref = await addDoc(collection(db, "profissionais"), {
      ...p,
      workspaceId,
      uid: null, // profissional demo: sem conta Auth
      ativo: true,
      demo: true,
      dataCriacao: new Date(),
      perfil: "profissional",
    });
    idsProfissionais.push({ id: ref.id, ...p });
  }

  prog("Criando pacientes…");
  const idsPacientes = [];
  for (const p of PACIENTES) {
    const ref = await addDoc(collection(db, "pacientes"), {
      ...p,
      terapeutaId: workspaceId,
      dataCriacao: new Date(),
      ativo: true,
    });
    idsPacientes.push({ id: ref.id, ...p });
  }

  prog("Criando sessões passadas…");
  const sessoesCriadas = [];

  // Para cada paciente, cria histórico de sessões
  const planos = [
    { sessoes: 12, valorSessao: 200 }, // Ana Beatriz
    { sessoes: 8,  valorSessao: 180 }, // Carlos
    { sessoes: 16, valorSessao: 220 }, // Marina
    { sessoes: 4,  valorSessao: 150 }, // Pedro
    { sessoes: 6,  valorSessao: 200 }, // Juliana
    { sessoes: 10, valorSessao: 160 }, // Roberto
    { sessoes: 5,  valorSessao: 190 }, // Camila
    { sessoes: 9,  valorSessao: 210 }, // Thiago
    { sessoes: 7,  valorSessao: 195 }, // Fernanda
    { sessoes: 3,  valorSessao: 170 }, // Lucas
  ];

  // Distribui pacientes entre o titular e os profissionais demo
  // titular: pacientes 0-4, profissional 0: pac 5-6, prof 1: pac 7-8, prof 2: pac 9
  const profPorPaciente = [
    workspaceId, workspaceId, workspaceId, workspaceId, workspaceId,
    idsProfissionais[0]?.id || workspaceId,
    idsProfissionais[0]?.id || workspaceId,
    idsProfissionais[1]?.id || workspaceId,
    idsProfissionais[1]?.id || workspaceId,
    idsProfissionais[2]?.id || workspaceId,
  ];
  const nomeProfPorPaciente = [
    null, null, null, null, null,
    idsProfissionais[0]?.nome || null,
    idsProfissionais[0]?.nome || null,
    idsProfissionais[1]?.nome || null,
    idsProfissionais[1]?.nome || null,
    idsProfissionais[2]?.nome || null,
  ];

  for (let pi = 0; pi < idsPacientes.length; pi++) {
    const pac = idsPacientes[pi];
    const { sessoes, valorSessao } = planos[pi];
    const hora = HORAS[pi % HORAS.length];
    const profId = profPorPaciente[pi];
    const profNome = nomeProfPorPaciente[pi];

    for (let s = 0; s < sessoes; s++) {
      const diasAtras = (sessoes - s) * 7 + Math.floor(Math.random() * 3);
      const data = diasAnteriores(diasAtras);
      const faltar = s === Math.floor(sessoes * 0.3);
      const status = faltar ? "falta" : "concluído";
      const pago = status === "concluído" ? (s < sessoes - 1) : false;
      const ref = await addDoc(collection(db, "agendamentos"), {
        terapeutaId: workspaceId,
        pacienteId: pac.id,
        data,
        hora,
        duracao: 60,
        valor: valorSessao,
        status,
        pago,
        observacoes: "",
        salaId: null,
        salaNome: null,
        profissionalId: profId,
        profissionalNome: profNome,
        dataCriacao: new Date(),
      });
      sessoesCriadas.push(ref.id);
    }
  }

  prog("Criando sessões futuras…");
  // Próximas sessões para todos os pacientes
  const horariosFuturos = ["08:00","09:00","10:00","11:00","14:00","15:00","16:00","17:00","18:00","19:00"];
  for (let pi = 0; pi < idsPacientes.length; pi++) {
    const pac = idsPacientes[pi];
    const hora = horariosFuturos[pi % horariosFuturos.length];
    const diasAFrente = (pi + 1) * 2 + Math.floor(Math.random() * 3);
    const profId   = profPorPaciente[pi];
    const profNome = nomeProfPorPaciente[pi];
    await addDoc(collection(db, "agendamentos"), {
      terapeutaId: workspaceId,
      pacienteId: pac.id,
      data: diasFuturos(diasAFrente),
      hora,
      duracao: 60,
      valor: planos[pi].valorSessao,
      status: "confirmado",
      pago: false,
      observacoes: "",
      salaId: null,
      salaNome: null,
      profissionalId: profId,
      profissionalNome: profNome,
      dataCriacao: new Date(),
    });
  }

  prog("Criando evoluções clínicas…");
  const evolucoesPorPac = [
    {
      pac: 0, // Ana
      notas: [
        { queixa: "Relata episódios de taquicardia antes de reuniões no trabalho.", conteudo: "Técnica de respiração diafragmática introduzida. Boa receptividade.", intervencao: "Respiração 4-7-8, reestruturação cognitiva sobre avaliação social.", plano: "Praticar respiração diariamente. Registro de pensamentos automáticos.", humor: 2 },
        { queixa: "Conseguiu apresentar projeto no trabalho sem crise.", conteudo: "Relatou uso da técnica de respiração com sucesso. Autoeficácia aumentando.", intervencao: "Reforço positivo. Introdução ao modelo ABC de Beck.", plano: "Manter registro. Identificar crenças disfuncionais sobre desempenho.", humor: 4 },
        { queixa: "Ainda acorda às 3h. Pensamentos acelerados.", conteudo: "Higiene do sono discutida. Ruminação noturna como foco principal.", intervencao: "Técnica de preocupação programada. Exposição imaginária.", plano: "Diário de preocupações às 18h. Sem telas após 21h.", humor: 3 },
      ],
    },
    {
      pac: 1, // Carlos
      notas: [
        { queixa: "Sem energia, dificuldade de sair da cama.", conteudo: "Humor deprimido, anedonia marcada. Faz uso correto da medicação.", intervencao: "Ativação comportamental. Lista de atividades prazerosas.", plano: "Caminhar 20min por dia. Uma atividade prazerosa por semana.", humor: 1 },
        { queixa: "Saiu de casa mais vezes. Ainda se sente 'no automático'.", conteudo: "Progresso discreto mas consistente. Insight sobre evitação.", intervencao: "Registro de atividades e humor. Questionamento socrático.", plano: "Continuar ativação. Identificar situações de evitação.", humor: 3 },
      ],
    },
    {
      pac: 2, // Marina
      notas: [
        { queixa: "Crise de pânico no shopping na semana passada.", conteudo: "Exploração da sequência da crise. Identificação de gatilhos.", intervencao: "Psicoeducação sobre pânico. Desmistificação dos sintomas físicos.", plano: "Exercício de exposição interoceptiva (hiperventilação controlada).", humor: 2 },
        { queixa: "Fez exposição ao shopping com marido. Ficou 15 minutos.", conteudo: "Grande avanço. Conseguiu tolerar ansiedade sem fugir.", intervencao: "Reforço e análise do sucesso. Mapa de hierarquia de exposição.", plano: "Repetir exposição sozinha. Subir um nível na hierarquia.", humor: 4 },
      ],
    },
  ];

  for (const { pac, notas } of evolucoesPorPac) {
    for (let n = 0; n < notas.length; n++) {
      const diasAtras = (notas.length - n) * 14;
      await addDoc(collection(db, "evolucoes"), {
        pacienteId: idsPacientes[pac].id,
        terapeutaId: workspaceId,
        tipo: "sessao",
        ...notas[n],
        data: diasAnteriores(diasAtras),
        criadoEm: new Date(),
      });
    }
  }

  prog("Criando solicitações de agendamento…");
  const solicitacoes = [
    { nome: "Beatriz Lopes Cunha", telefone: "(11) 98765-4321", email: "bia.lopes@email.com", dataPreferida: diasFuturos(3), horaPreferida: "10:00", mensagem: "Estou passando por um momento difícil no trabalho e gostaria de iniciar um acompanhamento." },
    { nome: "Rodrigo Nascimento", telefone: "(11) 97654-3210", email: "", dataPreferida: diasFuturos(5), horaPreferida: "14:00", mensagem: "Fui indicado pela minha médica. Tenho ansiedade e dificuldade para dormir." },
    { nome: "Isabela Freitas", telefone: "(11) 96543-2100", email: "isa.freitas@gmail.com", dataPreferida: diasFuturos(7), horaPreferida: "17:00", mensagem: "" },
  ];

  for (const s of solicitacoes) {
    await addDoc(collection(db, "solicitacoes"), {
      workspaceId,
      ...s,
      status: "pendente",
      criadoEm: new Date(),
    });
  }

  prog("Finalizando…");
  return {
    pacientes: idsPacientes.length,
    profissionais: idsProfissionais.length,
    sessoes: sessoesCriadas.length + idsPacientes.length,
    solicitacoes: solicitacoes.length,
  };
};
