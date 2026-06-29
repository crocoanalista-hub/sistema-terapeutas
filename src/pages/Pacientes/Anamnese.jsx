import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  salvarTemplateAnamnese,
  buscarTemplateAnamnese,
  salvarRespostasAnamnese,
  buscarRespostasAnamnese,
  criarLinkAnamnese,
  buscarLinkPorPaciente,
} from "../../services/anamneseService";
import { buscarPaciente } from "../../services/pacientesService";
import "../../styles/anamnese.css";

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 9999)}`;

const TIPOS = [
  { valor: "paragrafo",       label: "Parágrafo",         icone: "≡" },
  { valor: "texto-curto",     label: "Resposta curta",    icone: "—" },
  { valor: "multipla-escolha",label: "Múltipla escolha",  icone: "◉" },
  { valor: "checkboxes",      label: "Caixas de seleção", icone: "☑" },
  { valor: "sim-nao",         label: "Sim / Não",         icone: "⇄" },
];

const TEMPLATE_PADRAO = [
  {
    id: "s1", titulo: "Queixa e Histórico",
    perguntas: [
      { id: "p1", tipo: "paragrafo", texto: "Queixa principal", obrigatoria: false, opcoes: [] },
      { id: "p2", tipo: "paragrafo", texto: "História da doença atual (como e quando os sintomas começaram)", obrigatoria: false, opcoes: [] },
      { id: "p3", tipo: "paragrafo", texto: "Motivo da busca por terapia neste momento", obrigatoria: false, opcoes: [] },
    ],
  },
  {
    id: "s2", titulo: "Histórico de Saúde",
    perguntas: [
      { id: "p4", tipo: "texto-curto", texto: "Diagnósticos anteriores (CIDs ou condições conhecidas)", obrigatoria: false, opcoes: [] },
      { id: "p5", tipo: "paragrafo", texto: "Medicamentos em uso (nome, dosagem, frequência)", obrigatoria: false, opcoes: [] },
      { id: "p6", tipo: "texto-curto", texto: "Cirurgias ou internações anteriores", obrigatoria: false, opcoes: [] },
      { id: "p7", tipo: "texto-curto", texto: "Alergias", obrigatoria: false, opcoes: [] },
      { id: "p8", tipo: "sim-nao", texto: "Já fez terapia anteriormente?", obrigatoria: false, opcoes: [] },
      { id: "p9", tipo: "paragrafo", texto: "Se sim, descreva a terapia anterior (abordagem, duração, motivo da interrupção)", obrigatoria: false, opcoes: [] },
    ],
  },
  {
    id: "s3", titulo: "Histórico Familiar",
    perguntas: [
      { id: "p10", tipo: "paragrafo", texto: "Histórico familiar relevante (doenças físicas ou mentais na família)", obrigatoria: false, opcoes: [] },
      { id: "p11", tipo: "multipla-escolha", texto: "Estado civil", obrigatoria: false, opcoes: ["Solteiro(a)", "Casado(a) / União estável", "Divorciado(a) / Separado(a)", "Viúvo(a)"] },
      { id: "p12", tipo: "paragrafo", texto: "Filhos e dinâmica familiar", obrigatoria: false, opcoes: [] },
    ],
  },
  {
    id: "s4", titulo: "Hábitos e Estilo de Vida",
    perguntas: [
      { id: "p13", tipo: "paragrafo", texto: "Qualidade do sono (horas, insônia, pesadelos)", obrigatoria: false, opcoes: [] },
      { id: "p14", tipo: "paragrafo", texto: "Hábitos alimentares", obrigatoria: false, opcoes: [] },
      { id: "p15", tipo: "sim-nao", texto: "Pratica atividade física regularmente?", obrigatoria: false, opcoes: [] },
      { id: "p16", tipo: "paragrafo", texto: "Vida social, profissional e lazer", obrigatoria: false, opcoes: [] },
    ],
  },
  {
    id: "s5", titulo: "Objetivos e Observações",
    perguntas: [
      { id: "p17", tipo: "paragrafo", texto: "O que espera alcançar com a terapia?", obrigatoria: false, opcoes: [] },
      { id: "p18", tipo: "paragrafo", texto: "Outras informações relevantes", obrigatoria: false, opcoes: [] },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
const Anamnese = () => {
  const { id: pacienteId } = useParams();
  const { user, workspaceId, slug: slugAtual } = useAuth();
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState(null);
  const [modo, setModo] = useState("preencher"); // "preencher" | "configurar"
  const [template, setTemplate] = useState(TEMPLATE_PADRAO);
  const [respostas, setRespostas] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [linkStatus, setLinkStatus] = useState(null); // null | "pendente" | "preenchido"
  const [linkToken, setLinkToken] = useState(null);
  const [criandoLink, setCriandoLink] = useState(false);

  useEffect(() => {
    if (user && pacienteId) carregar();
  }, [user, pacienteId]);

  const carregar = async () => {
    try {
      setCarregando(true);
      const [pac, tmpl, resps, linkDoc] = await Promise.all([
        buscarPaciente(pacienteId),
        buscarTemplateAnamnese(workspaceId),
        buscarRespostasAnamnese(pacienteId),
        buscarLinkPorPaciente(pacienteId).catch(() => null),
      ]);
      setPaciente(pac);
      if (tmpl?.secoes?.length) setTemplate(tmpl.secoes);
      setRespostas(resps || {});
      if (linkDoc) { setLinkStatus(linkDoc.status); setLinkToken(linkDoc.id); }
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const feedback = (ok = true) => { setSalvo(ok); setTimeout(() => setSalvo(false), 3000); };

  // ─── BUILDER — seções ─────────────────────────────────────
  const addSecao = () =>
    setTemplate(t => [...t, { id: uid(), titulo: "Nova Seção", perguntas: [] }]);

  const updateSecao = (sId, field, val) =>
    setTemplate(t => t.map(s => s.id === sId ? { ...s, [field]: val } : s));

  const removeSecao = (sId) => {
    if (!window.confirm("Remover esta seção e todas as perguntas?")) return;
    setTemplate(t => t.filter(s => s.id !== sId));
  };

  const moveSecao = (idx, dir) =>
    setTemplate(t => { const a = [...t]; const [x] = a.splice(idx, 1); a.splice(idx + dir, 0, x); return a; });

  // ─── BUILDER — perguntas ──────────────────────────────────
  const addPergunta = (sId) =>
    setTemplate(t => t.map(s =>
      s.id === sId
        ? { ...s, perguntas: [...s.perguntas, { id: uid(), tipo: "paragrafo", texto: "Nova pergunta", obrigatoria: false, opcoes: [] }] }
        : s
    ));

  const updatePerg = (sId, pId, field, val) =>
    setTemplate(t => t.map(s =>
      s.id === sId
        ? { ...s, perguntas: s.perguntas.map(p => p.id === pId ? { ...p, [field]: val } : p) }
        : s
    ));

  const removePerg = (sId, pId) =>
    setTemplate(t => t.map(s =>
      s.id === sId ? { ...s, perguntas: s.perguntas.filter(p => p.id !== pId) } : s
    ));

  const movePerg = (sId, idx, dir) =>
    setTemplate(t => t.map(s => {
      if (s.id !== sId) return s;
      const a = [...s.perguntas]; const [x] = a.splice(idx, 1); a.splice(idx + dir, 0, x);
      return { ...s, perguntas: a };
    }));

  // ─── BUILDER — opções ─────────────────────────────────────
  const addOpcao = (sId, pId) =>
    setTemplate(t => t.map(s =>
      s.id === sId
        ? { ...s, perguntas: s.perguntas.map(p => p.id === pId ? { ...p, opcoes: [...p.opcoes, "Nova opção"] } : p) }
        : s
    ));

  const updateOpcao = (sId, pId, idx, val) =>
    setTemplate(t => t.map(s =>
      s.id === sId
        ? { ...s, perguntas: s.perguntas.map(p => {
            if (p.id !== pId) return p;
            const o = [...p.opcoes]; o[idx] = val; return { ...p, opcoes: o };
          })}
        : s
    ));

  const removeOpcao = (sId, pId, idx) =>
    setTemplate(t => t.map(s =>
      s.id === sId
        ? { ...s, perguntas: s.perguntas.map(p =>
            p.id === pId ? { ...p, opcoes: p.opcoes.filter((_, i) => i !== idx) } : p
          )}
        : s
    ));

  // ─── SALVAR TEMPLATE ──────────────────────────────────────
  const salvarTemplate = async () => {
    setSalvando(true);
    try {
      await salvarTemplateAnamnese(workspaceId, template);
      feedback();
      setModo("preencher");
    } catch (err) { alert(err.message); }
    finally { setSalvando(false); }
  };

  // ─── RESPOSTAS ────────────────────────────────────────────
  const setResp = (pId, val) => setRespostas(r => ({ ...r, [pId]: val }));

  const toggleCheck = (pId, opc, checked) =>
    setRespostas(r => {
      const cur = Array.isArray(r[pId]) ? r[pId] : [];
      return { ...r, [pId]: checked ? [...cur, opc] : cur.filter(o => o !== opc) };
    });

  const salvarRespostas = async () => {
    setSalvando(true);
    try {
      await salvarRespostasAnamnese(pacienteId, workspaceId, respostas);
      feedback();
    } catch (err) { alert(err.message); }
    finally { setSalvando(false); }
  };

  // ─── ENVIAR LINK ANAMNESE ────────────────────────────────
  const enviarAnamnese = async () => {
    if (!paciente?.telefone) {
      alert("Paciente sem número de WhatsApp cadastrado.");
      return;
    }
    setCriandoLink(true);
    try {
      const token = await criarLinkAnamnese(workspaceId, pacienteId, paciente.nome);
      setLinkToken(token);
      setLinkStatus("pendente");
      const link = `${window.location.origin}/${slugAtual}/anamnese/${token}`;
      const msg = encodeURIComponent(`Olá, ${paciente.nome}! Segue o link para preencher a ficha de anamnese antes da nossa sessão:\n\n${link}`);
      const tel = paciente.telefone.replace(/\D/g, "");
      window.open(`https://wa.me/55${tel}?text=${msg}`, "_blank");
    } catch (err) {
      alert("Erro ao gerar link: " + err.message);
    } finally {
      setCriandoLink(false);
    }
  };

  // ─── RENDER CAMPO (modo preencher) ───────────────────────
  const renderCampo = (perg) => {
    const { id: pId, tipo, opcoes } = perg;
    const val = respostas[pId];

    if (tipo === "texto-curto")
      return <input className="af-input" value={val || ""} onChange={e => setResp(pId, e.target.value)} placeholder="Resposta..." />;

    if (tipo === "paragrafo")
      return <textarea className="af-textarea" rows={4} value={val || ""} onChange={e => setResp(pId, e.target.value)} placeholder="Resposta..." />;

    if (tipo === "sim-nao")
      return (
        <div className="af-toggle-group">
          {["Sim", "Não"].map(o => (
            <button key={o} className={`af-toggle-btn${val === o ? " ativo" : ""}`} onClick={() => setResp(pId, o)}>{o}</button>
          ))}
        </div>
      );

    if (tipo === "multipla-escolha")
      return (
        <div className="af-opcoes-fill">
          {(opcoes || []).map(o => (
            <label key={o} className={`af-radio-label${val === o ? " ativo" : ""}`}>
              <input type="radio" name={pId} checked={val === o} onChange={() => setResp(pId, o)} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      );

    if (tipo === "checkboxes") {
      const checked = Array.isArray(val) ? val : [];
      return (
        <div className="af-opcoes-fill">
          {(opcoes || []).map(o => (
            <label key={o} className={`af-check-label${checked.includes(o) ? " ativo" : ""}`}>
              <input type="checkbox" checked={checked.includes(o)} onChange={e => toggleCheck(pId, o, e.target.checked)} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      );
    }
    return null;
  };

  // ─── MODO PREENCHER ───────────────────────────────────────
  const renderFill = () => (
    <div className="af-fill">
      {template.map(sec => (
        <div key={sec.id} className="af-card">
          <h3 className="af-sec-titulo">{sec.titulo}</h3>
          {sec.perguntas.map(p => (
            <div key={p.id} className="af-pergunta">
              <p className="af-perg-label">{p.texto}{p.obrigatoria && <span className="af-req">*</span>}</p>
              {renderCampo(p)}
            </div>
          ))}
        </div>
      ))}
      <div className="af-fill-acoes">
        <button className="af-btn-outline" onClick={() => window.print()}>🖨️ Imprimir</button>
        <button className="af-btn-primary" onClick={salvarRespostas} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar Respostas"}
        </button>
      </div>
    </div>
  );

  // ─── MODO CONFIGURAR (Form Builder) ───────────────────────
  const renderBuilder = () => (
    <div className="af-builder">
      <div className="af-builder-aviso">
        ⚙️ <strong>Modo de configuração</strong> — edite a estrutura do formulário. As respostas já salvas pelos pacientes são preservadas.
      </div>

      {template.map((sec, sIdx) => (
        <div key={sec.id} className="af-builder-sec">
          {/* Header da seção */}
          <div className="af-builder-sec-header">
            <div className="af-sec-pill">Seção {sIdx + 1}</div>
            <input
              className="af-builder-sec-input"
              value={sec.titulo}
              onChange={e => updateSecao(sec.id, "titulo", e.target.value)}
              placeholder="Título da seção"
            />
            <div className="af-ctrl-btns">
              <button className="af-ctrl" disabled={sIdx === 0} onClick={() => moveSecao(sIdx, -1)} title="Subir seção">↑</button>
              <button className="af-ctrl" disabled={sIdx === template.length - 1} onClick={() => moveSecao(sIdx, 1)} title="Descer seção">↓</button>
              <button className="af-ctrl danger" onClick={() => removeSecao(sec.id)} title="Remover seção">🗑</button>
            </div>
          </div>

          {/* Perguntas */}
          <div className="af-builder-pergs">
            {sec.perguntas.map((p, pIdx) => (
              <div key={p.id} className="af-builder-perg">
                {/* Linha de controle */}
                <div className="af-perg-top">
                  <span className="af-perg-num">{pIdx + 1}</span>
                  <input
                    className="af-perg-input"
                    value={p.texto}
                    onChange={e => updatePerg(sec.id, p.id, "texto", e.target.value)}
                    placeholder="Texto da pergunta"
                  />
                  <select
                    className="af-tipo-sel"
                    value={p.tipo}
                    onChange={e => updatePerg(sec.id, p.id, "tipo", e.target.value)}
                  >
                    {TIPOS.map(t => <option key={t.valor} value={t.valor}>{t.icone} {t.label}</option>)}
                  </select>
                  <div className="af-ctrl-btns">
                    <button className="af-ctrl" disabled={pIdx === 0} onClick={() => movePerg(sec.id, pIdx, -1)}>↑</button>
                    <button className="af-ctrl" disabled={pIdx === sec.perguntas.length - 1} onClick={() => movePerg(sec.id, pIdx, 1)}>↓</button>
                    <button className="af-ctrl danger" onClick={() => removePerg(sec.id, p.id)}>🗑</button>
                  </div>
                </div>

                {/* Preview + opções editáveis */}
                <div className="af-perg-body">
                  {p.tipo === "texto-curto" && <input disabled className="af-input" placeholder="Resposta curta..." />}
                  {p.tipo === "paragrafo"   && <textarea disabled className="af-textarea" rows={2} placeholder="Parágrafo..." />}
                  {p.tipo === "sim-nao"     && (
                    <div className="af-toggle-group preview">
                      <span className="af-toggle-btn">Sim</span>
                      <span className="af-toggle-btn">Não</span>
                    </div>
                  )}
                  {(p.tipo === "multipla-escolha" || p.tipo === "checkboxes") && (
                    <div className="af-opcoes-editor">
                      {p.opcoes.map((opc, oIdx) => (
                        <div key={oIdx} className="af-opcao-row">
                          <span className="af-opc-icone">{p.tipo === "checkboxes" ? "☐" : "○"}</span>
                          <input
                            className="af-opc-input"
                            value={opc}
                            onChange={e => updateOpcao(sec.id, p.id, oIdx, e.target.value)}
                          />
                          <button className="af-ctrl danger sm" onClick={() => removeOpcao(sec.id, p.id, oIdx)}>✕</button>
                        </div>
                      ))}
                      <button className="af-add-opc" onClick={() => addOpcao(sec.id, p.id)}>+ Adicionar opção</button>
                    </div>
                  )}
                </div>

                {/* Footer da pergunta */}
                <div className="af-perg-footer">
                  <label className="af-obrig-label">
                    <input type="checkbox" checked={p.obrigatoria} onChange={e => updatePerg(sec.id, p.id, "obrigatoria", e.target.checked)} />
                    Obrigatória
                  </label>
                </div>
              </div>
            ))}

            <button className="af-add-perg" onClick={() => addPergunta(sec.id)}>
              + Adicionar pergunta
            </button>
          </div>
        </div>
      ))}

      <button className="af-add-sec" onClick={addSecao}>+ Adicionar seção</button>

      <div className="af-builder-acoes">
        <button className="af-btn-outline" onClick={() => setModo("preencher")}>Cancelar</button>
        <button className="af-btn-primary" onClick={salvarTemplate} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar Formulário"}
        </button>
      </div>
    </div>
  );

  // ──────────────────────────────────────────────────────────
  if (carregando) return <p style={{ color: "#999", padding: "32px" }}>Carregando...</p>;

  return (
    <div className="af-page">
      <div className="af-page-header">
        <button className="af-back" onClick={() => navigate(`/pacientes/${pacienteId}`)}>←</button>
        <div>
          <h2 className="af-page-titulo">Anamnese Digital</h2>
          {paciente && <p className="af-page-sub">{paciente.nome}</p>}
        </div>
        <div className="af-page-acoes">
          {modo === "preencher" && (
            <>
              {linkStatus === "preenchido" ? (
                <span className="af-link-badge preenchido">✅ Anamnese recebida</span>
              ) : linkStatus === "pendente" ? (
                <span className="af-link-badge pendente">⏳ Aguardando paciente</span>
              ) : null}
              <button
                className="af-btn-whatsapp"
                onClick={enviarAnamnese}
                disabled={criandoLink}
                title="Enviar link de anamnese via WhatsApp"
              >
                {criandoLink ? "Gerando..." : "📤 Enviar para paciente"}
              </button>
              <button className="af-btn-config" onClick={() => setModo("configurar")}>
                ⚙️ Configurar
              </button>
            </>
          )}
          {modo === "configurar" && (
            <span className="af-badge-config">Modo de configuração</span>
          )}
        </div>
      </div>

      {salvo && <div className="af-success">✅ Salvo com sucesso!</div>}

      {modo === "preencher" ? renderFill() : renderBuilder()}
    </div>
  );
};

export default Anamnese;
