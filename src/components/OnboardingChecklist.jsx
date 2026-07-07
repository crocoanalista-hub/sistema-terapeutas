import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../firebase";
import { buscarConfiguracoes } from "../services/configuracoesService";
import "../styles/onboarding.css";

const STORAGE_KEY = (id) => `onboarding_pulado_${id}`;

const passos = [
  {
    id: "cliente",
    icone: "👥",
    titulo: "Cadastre seu primeiro cliente",
    descricao: "Adicione os dados do cliente para começar a gerenciar seus atendimentos.",
    botao: "Cadastrar cliente",
    rota: "/pacientes/novo",
  },
  {
    id: "sessao",
    icone: "📅",
    titulo: "Agende uma sessão",
    descricao: "Marque uma consulta na agenda e mantenha sua rotina organizada.",
    botao: "Ir para agenda",
    rota: "/agenda/marcar",
  },
  {
    id: "estoque",
    icone: "📦",
    titulo: "Adicione um item ao estoque",
    descricao: "Controle seus materiais e produtos para nunca ficar sem o essencial.",
    botao: "Adicionar item",
    rota: "/estoque",
  },
  {
    id: "documento",
    icone: "📄",
    titulo: "Crie um documento",
    descricao: "Gere contratos, termos ou prontuários diretamente pelo sistema.",
    botao: "Criar documento",
    rota: "/documentos",
  },
  {
    id: "clinica",
    icone: "⚙️",
    titulo: "Personalize sua clínica",
    descricao: "Coloque o nome e a logo da sua clínica para deixar tudo com a sua cara.",
    botao: "Configurar",
    rota: "/configuracoes",
  },
];

export default function OnboardingChecklist({ workspaceId }) {
  const navigate = useNavigate();
  const [concluidos, setConcluidos] = useState({});
  const [visivel, setVisivel] = useState(false);
  const [minimizado, setMinimizado] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    if (localStorage.getItem(STORAGE_KEY(workspaceId))) return;
    verificarProgresso();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const verificarProgresso = async () => {
    setCarregando(true);
    try {
      const [clienteSnap, sessaoSnap, estoqueSnap, docSnap, config] = await Promise.all([
        getDocs(query(collection(db, "pacientes"), where("workspaceId", "==", workspaceId), limit(1))),
        getDocs(query(collection(db, "agendamentos"), where("workspaceId", "==", workspaceId), limit(1))),
        getDocs(query(collection(db, "estoque"), where("workspaceId", "==", workspaceId), limit(1))),
        getDocs(query(collection(db, "documentos"), where("workspaceId", "==", workspaceId), limit(1))),
        buscarConfiguracoes(workspaceId).catch(() => ({})),
      ]);

      const novo = {
        cliente: !clienteSnap.empty,
        sessao: !sessaoSnap.empty,
        estoque: !estoqueSnap.empty,
        documento: !docSnap.empty,
        clinica: !!(config?.nomeClinica && config.nomeClinica !== "Minha Clínica" && config.nomeClinica !== "Consultório"),
      };

      setConcluidos(novo);

      const total = Object.values(novo).filter(Boolean).length;
      if (total < passos.length) {
        setVisivel(true);
      }
    } catch {}
    setCarregando(false);
  };

  const pular = () => {
    localStorage.setItem(STORAGE_KEY(workspaceId), "1");
    setVisivel(false);
  };

  if (!visivel || carregando) return null;

  const totalConcluidos = Object.values(concluidos).filter(Boolean).length;
  const porcentagem = Math.round((totalConcluidos / passos.length) * 100);

  return (
    <div className={`onboarding-card${minimizado ? " minimizado" : ""}`}>
      <div className="onboarding-header" onClick={() => setMinimizado(v => !v)}>
        <div className="onboarding-header-left">
          <span className="onboarding-emoji">🚀</span>
          <div>
            <div className="onboarding-titulo">Primeiros passos</div>
            <div className="onboarding-subtitulo">{totalConcluidos} de {passos.length} concluídos</div>
          </div>
        </div>
        <div className="onboarding-header-right">
          <div className="onboarding-progresso-mini">
            <div className="onboarding-progresso-barra" style={{ width: `${porcentagem}%` }} />
          </div>
          <button className="onboarding-toggle">{minimizado ? "▲" : "▼"}</button>
        </div>
      </div>

      {!minimizado && (
        <>
          <div className="onboarding-passos">
            {passos.map((passo) => {
              const feito = !!concluidos[passo.id];
              return (
                <div key={passo.id} className={`onboarding-passo${feito ? " feito" : ""}`}>
                  <div className="onboarding-passo-icone">
                    {feito ? "✅" : passo.icone}
                  </div>
                  <div className="onboarding-passo-info">
                    <div className="onboarding-passo-titulo">{passo.titulo}</div>
                    {!feito && (
                      <div className="onboarding-passo-desc">{passo.descricao}</div>
                    )}
                  </div>
                  {!feito && (
                    <button
                      className="onboarding-passo-btn"
                      onClick={() => navigate(passo.rota)}
                    >
                      {passo.botao} →
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="onboarding-footer">
            <button className="onboarding-pular" onClick={pular}>
              Pular tutorial
            </button>
          </div>
        </>
      )}
    </div>
  );
}
