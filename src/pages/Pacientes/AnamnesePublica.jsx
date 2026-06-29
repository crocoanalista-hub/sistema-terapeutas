import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  buscarLinkAnamnese, buscarTemplateAnamnese,
  salvarRespostasAnamnese, marcarLinkPreenchido,
} from "../../services/anamneseService";
import { buscarConfiguracoes } from "../../services/configuracoesService";
import "../../styles/anamnese-publica.css";

export default function AnamnesePublica() {
  const { token } = useParams();

  const [link, setLink] = useState(null);
  const [config, setConfig] = useState({});
  const [secoes, setSecoes] = useState([]);
  const [respostas, setRespostas] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [invalido, setInvalido] = useState(false);
  const [jaPreenchido, setJaPreenchido] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const linkData = await buscarLinkAnamnese(token);
        if (!linkData) { setInvalido(true); return; }
        if (linkData.status === "preenchido") { setJaPreenchido(true); return; }

        setLink(linkData);

        const [cfg, templateData] = await Promise.all([
          buscarConfiguracoes(linkData.workspaceId).catch(() => ({})),
          buscarTemplateAnamnese(linkData.workspaceId).catch(() => null),
        ]);
        setConfig(cfg);

        if (templateData?.secoes) setSecoes(templateData.secoes);
        else {
          // template padrão mínimo se não configurado
          setSecoes([{
            id: "s1", titulo: "Informações Gerais",
            perguntas: [
              { id: "p1", tipo: "paragrafo", texto: "Queixa principal / motivo da consulta", obrigatoria: true, opcoes: [] },
              { id: "p2", tipo: "paragrafo", texto: "Histórico de saúde relevante", obrigatoria: false, opcoes: [] },
              { id: "p3", tipo: "paragrafo", texto: "Medicamentos em uso", obrigatoria: false, opcoes: [] },
              { id: "p4", tipo: "paragrafo", texto: "O que espera alcançar com a terapia?", obrigatoria: false, opcoes: [] },
            ],
          }]);
        }

        const r = document.documentElement;
        r.style.setProperty("--cor-primaria", cfg.corPrimaria || "#1a73e8");
        r.style.setProperty("--cor-sidebar", cfg.corSidebar || "#1a2535");
      } catch {
        setInvalido(true);
      } finally {
        setCarregando(false);
      }
    };
    init();
  }, [token]);

  const setResposta = (perguntaId, valor) =>
    setRespostas(r => ({ ...r, [perguntaId]: valor }));

  const toggleCheckbox = (perguntaId, opcao) => {
    const atual = respostas[perguntaId] || [];
    const novo = atual.includes(opcao) ? atual.filter(o => o !== opcao) : [...atual, opcao];
    setResposta(perguntaId, novo);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    // Validar obrigatórias
    for (const sec of secoes) {
      for (const p of sec.perguntas) {
        if (p.obrigatoria) {
          const r = respostas[p.id];
          if (!r || (Array.isArray(r) && r.length === 0) || r === "") {
            setErro(`Campo obrigatório não preenchido: "${p.texto}"`);
            return;
          }
        }
      }
    }

    setSalvando(true);
    try {
      await salvarRespostasAnamnese(link.pacienteId, link.workspaceId, respostas);
      await marcarLinkPreenchido(token);
      setConcluido(true);
    } catch {
      setErro("Erro ao salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const corPrimaria = config.corPrimaria || "#1a73e8";
  const corSidebar  = config.corSidebar  || "#1a2535";
  const nomeClinica = config.nomeClinica  || "Consultório";

  const Header = () => (
    <div className="ap-header" style={{ background: corSidebar }}>
      {config.logoUrl
        ? <img src={config.logoUrl} alt="Logo" className="ap-logo-img" />
        : <div className="ap-logo-emoji">🧠</div>}
      <div className="ap-header-text">
        <h1 className="ap-clinica">{nomeClinica}</h1>
        <p className="ap-header-sub">Ficha de Anamnese</p>
      </div>
    </div>
  );

  if (carregando) return <div className="apub-loading">Carregando formulário...</div>;

  if (invalido) return (
    <div className="apub-page">
      <Header />
      <div className="apub-body"><div className="apub-card apub-estado">
        <div className="apub-estado-icon">❌</div>
        <h2>Link inválido</h2>
        <p>Este link não existe ou expirou. Solicite um novo link ao seu terapeuta.</p>
      </div></div>
    </div>
  );

  if (jaPreenchido) return (
    <div className="apub-page">
      <Header />
      <div className="apub-body"><div className="apub-card apub-estado">
        <div className="apub-estado-icon">✅</div>
        <h2>Anamnese já preenchida</h2>
        <p>Você já enviou suas respostas. Seu terapeuta as receberá antes da sessão.</p>
      </div></div>
    </div>
  );

  if (concluido) return (
    <div className="apub-page">
      <Header />
      <div className="apub-body"><div className="apub-card apub-estado">
        <div className="apub-estado-icon">✅</div>
        <h2>Enviado com sucesso!</h2>
        <p>Suas respostas foram salvas. Seu terapeuta as receberá antes da sessão.</p>
        <p className="apub-estado-sub">Você pode fechar esta página.</p>
      </div></div>
    </div>
  );

  return (
    <div className="apub-page">
      <Header />
      <div className="apub-body">
        <div className="apub-intro">
          <p>Olá, <strong>{link?.pacienteNome}</strong>! Por favor, preencha o formulário abaixo antes da sua sessão. Suas respostas são confidenciais.</p>
        </div>

        {erro && <div className="apub-erro">{erro}</div>}

        <form onSubmit={handleSubmit}>
          {secoes.map((sec) => (
            <div key={sec.id} className="apub-secao">
              <h2 className="apub-secao-titulo" style={{ borderLeftColor: corPrimaria }}>
                {sec.titulo}
              </h2>
              {sec.perguntas.map((p) => (
                <div key={p.id} className="apub-pergunta">
                  <label className="apub-pergunta-label">
                    {p.texto}
                    {p.obrigatoria && <span className="apub-obrig">*</span>}
                  </label>

                  {p.tipo === "paragrafo" && (
                    <textarea
                      className="apub-input"
                      rows={4}
                      placeholder="Sua resposta..."
                      value={respostas[p.id] || ""}
                      onChange={e => setResposta(p.id, e.target.value)}
                    />
                  )}
                  {p.tipo === "texto-curto" && (
                    <input
                      className="apub-input"
                      type="text"
                      placeholder="Sua resposta..."
                      value={respostas[p.id] || ""}
                      onChange={e => setResposta(p.id, e.target.value)}
                    />
                  )}
                  {p.tipo === "sim-nao" && (
                    <div className="apub-sim-nao">
                      {["Sim", "Não"].map(op => (
                        <button
                          key={op} type="button"
                          className={`apub-sim-nao-btn ${respostas[p.id] === op ? "ativo" : ""}`}
                          style={respostas[p.id] === op ? { background: corPrimaria, borderColor: corPrimaria } : {}}
                          onClick={() => setResposta(p.id, op)}
                        >
                          {op}
                        </button>
                      ))}
                    </div>
                  )}
                  {p.tipo === "multipla-escolha" && (
                    <div className="apub-opcoes">
                      {p.opcoes.map(op => (
                        <label key={op} className="apub-radio">
                          <input
                            type="radio"
                            name={p.id}
                            value={op}
                            checked={respostas[p.id] === op}
                            onChange={() => setResposta(p.id, op)}
                          />
                          <span>{op}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {p.tipo === "checkboxes" && (
                    <div className="apub-opcoes">
                      {p.opcoes.map(op => (
                        <label key={op} className="apub-checkbox">
                          <input
                            type="checkbox"
                            checked={(respostas[p.id] || []).includes(op)}
                            onChange={() => toggleCheckbox(p.id, op)}
                          />
                          <span>{op}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          <div className="apub-footer">
            <button
              type="submit"
              disabled={salvando}
              className="apub-submit"
              style={{ background: corPrimaria }}
            >
              {salvando ? "Enviando..." : "Enviar respostas"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
