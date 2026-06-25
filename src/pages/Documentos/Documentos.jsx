import React, { useState, useEffect } from "react";
import { listarPacientes } from "../../services/pacientesService";
import { buscarAnamnese } from "../../services/anamneseService";
import { salvarTemplatesDoc, buscarTemplatesDoc } from "../../services/documentosService";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/documentos.css";

// ─── Tipos de bloco ───────────────────────────────────────
const TIPOS_BLOCO = [
  { valor: "h2",   label: "Título principal" },
  { valor: "h4",   label: "Cláusula / subtítulo" },
  { valor: "p",    label: "Parágrafo" },
  { valor: "lista",label: "Lista (um item por linha)" },
];

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 9999)}`;

// ─── Variáveis disponíveis ────────────────────────────────
const VARS = [
  { chave: "{terapeuta}",           desc: "Nome do terapeuta" },
  { chave: "{paciente}",            desc: "Nome do paciente" },
  { chave: "{valorSessao}",         desc: "Valor da sessão (R$)" },
  { chave: "{frequencia}",          desc: "Frequência das sessões" },
  { chave: "{duracaoSessao}",       desc: "Duração da sessão (min)" },
  { chave: "{modalidade}",          desc: "Modalidade (presencial/online)" },
  { chave: "{dataContrato}",        desc: "Data do contrato" },
  { chave: "{dataComparecimento}",  desc: "Data de comparecimento" },
  { chave: "{horaComparecimento}",  desc: "Hora de comparecimento" },
  { chave: "{motivoComparecimento}",desc: "Motivo do comparecimento" },
  { chave: "{data}",                desc: "Data de hoje" },
];

// ─── Templates padrão (blocos) ────────────────────────────
const TEMPLATES_PADRAO = {
  contrato: [
    { id: "b1", tipo: "h2",   texto: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS PSICOTERAPÊUTICOS" },
    { id: "b2", tipo: "p",    texto: "As partes abaixo qualificadas celebram o presente contrato de prestação de serviços psicoterapêuticos, que se regerá pelas seguintes cláusulas:" },
    { id: "b3", tipo: "p",    texto: "TERAPEUTA: {terapeuta}" },
    { id: "b4", tipo: "p",    texto: "PACIENTE/CLIENTE: {paciente}" },
    { id: "b5", tipo: "h4",   texto: "1. DO SERVIÇO" },
    { id: "b6", tipo: "p",    texto: "O(A) Terapeuta prestará serviços de psicoterapia ao(à) Paciente, com sessões de {duracaoSessao} minutos, realizadas {frequencia}, na modalidade {modalidade}." },
    { id: "b7", tipo: "h4",   texto: "2. DOS HONORÁRIOS" },
    { id: "b8", tipo: "p",    texto: "O valor de cada sessão é de R$ {valorSessao}/sessão, a ser pago no dia do atendimento ou conforme acordado entre as partes." },
    { id: "b9", tipo: "h4",   texto: "3. DO CANCELAMENTO" },
    { id: "b10", tipo: "p",   texto: "O cancelamento de sessão deverá ser comunicado com antecedência mínima de 24 horas. Sessões canceladas sem aviso prévio poderão ser cobradas integralmente." },
    { id: "b11", tipo: "h4",  texto: "4. DA CONFIDENCIALIDADE" },
    { id: "b12", tipo: "p",   texto: "O(A) Terapeuta se compromete a manter sigilo sobre todas as informações compartilhadas durante as sessões, em conformidade com o Código de Ética profissional e a Lei Geral de Proteção de Dados (LGPD – Lei 13.709/2018), exceto nos casos previstos em lei." },
    { id: "b13", tipo: "h4",  texto: "5. DAS DISPOSIÇÕES GERAIS" },
    { id: "b14", tipo: "p",   texto: "O presente contrato tem validade por tempo indeterminado, podendo ser rescindido por qualquer das partes mediante comunicação prévia." },
    { id: "b15", tipo: "assinaturas", parteA: "Terapeuta", parteB: "Paciente/Cliente" },
    { id: "b16", tipo: "data", texto: "{dataContrato}" },
  ],

  lgpd: [
    { id: "b1", tipo: "h2",  texto: "TERMO DE CONSENTIMENTO PARA TRATAMENTO DE DADOS PESSOAIS (LGPD)" },
    { id: "b2", tipo: "p",   texto: "Responsável pelo tratamento: {terapeuta}" },
    { id: "b3", tipo: "p",   texto: "Titular dos dados: {paciente}" },
    { id: "b4", tipo: "h4",  texto: "1. Finalidade do Tratamento" },
    { id: "b5", tipo: "p",   texto: "Os dados pessoais e de saúde coletados têm como finalidade exclusiva a prestação de serviços psicoterapêuticos, incluindo anamnese, registro de evolução clínica, agendamento de sessões e comunicação com o(a) paciente." },
    { id: "b6", tipo: "h4",  texto: "2. Dados Coletados" },
    { id: "b7", tipo: "p",   texto: "Nome completo, data de nascimento, telefone, e-mail, informações de saúde física e mental, histórico familiar e demais dados necessários ao atendimento clínico." },
    { id: "b8", tipo: "h4",  texto: "3. Armazenamento e Segurança" },
    { id: "b9", tipo: "p",   texto: "Os dados são armazenados em sistema seguro, com acesso restrito ao(à) terapeuta responsável. Não são compartilhados com terceiros, exceto por obrigação legal." },
    { id: "b10", tipo: "h4", texto: "4. Direitos do Titular" },
    { id: "b11", tipo: "lista", texto: "Solicitar acesso aos seus dados\nSolicitar correção de dados incorretos\nSolicitar a exclusão dos dados, ressalvado o prazo legal de guarda do prontuário" },
    { id: "b12", tipo: "h4", texto: "5. Consentimento" },
    { id: "b13", tipo: "p",  texto: "Ao assinar este termo, o(a) titular consente expressamente com o tratamento de seus dados pessoais e de saúde para as finalidades descritas acima, nos termos da Lei 13.709/2018." },
    { id: "b14", tipo: "assinaturas", parteA: "Responsável pelo Tratamento", parteB: "Titular dos Dados" },
    { id: "b15", tipo: "data", texto: "{data}" },
  ],

  consentimento: [
    { id: "b1", tipo: "h2", texto: "TERMO DE CONSENTIMENTO INFORMADO" },
    { id: "b2", tipo: "p",  texto: "Terapeuta: {terapeuta}" },
    { id: "b3", tipo: "p",  texto: "Paciente: {paciente}" },
    { id: "b4", tipo: "p",  texto: "Declaro que fui devidamente informado(a) sobre o processo psicoterápico, incluindo:" },
    { id: "b5", tipo: "lista", texto: "A natureza e os objetivos do tratamento psicoterápico\nOs possíveis benefícios e limitações da psicoterapia\nA duração estimada do tratamento e a frequência das sessões\nOs honorários e as condições de cancelamento\nO dever de sigilo do(a) terapeuta e suas exceções legais\nMeu direito de interromper o tratamento a qualquer momento" },
    { id: "b6", tipo: "p",  texto: "Tendo compreendido as informações acima, consinto livremente em iniciar o processo psicoterápico com o(a) terapeuta {terapeuta}." },
    { id: "b7", tipo: "assinaturas", parteA: "Terapeuta", parteB: "Paciente" },
    { id: "b8", tipo: "data", texto: "{data}" },
  ],

  comparecimento: [
    { id: "b1", tipo: "h2", texto: "DECLARAÇÃO DE COMPARECIMENTO" },
    { id: "b2", tipo: "p",  texto: "Declaro para os devidos fins que o(a) Sr.(a) {paciente} compareceu a atendimento de {motivoComparecimento} no dia {dataComparecimento}, às {horaComparecimento}, sob responsabilidade do(a) profissional {terapeuta}." },
    { id: "b3", tipo: "p",  texto: "Por ser verdade, firmo a presente declaração." },
    { id: "b4", tipo: "assinaturas", parteA: "Terapeuta Responsável", parteB: "" },
    { id: "b5", tipo: "data", texto: "Emitida em {data}" },
  ],
};

const DOCS = [
  { key: "contrato",       label: "Contrato Terapêutico" },
  { key: "lgpd",           label: "Termo LGPD" },
  { key: "consentimento",  label: "Termo de Consentimento" },
  { key: "comparecimento", label: "Declaração de Comparecimento" },
  { key: "anamnese",       label: "Anamnese (Impressão)" },
];

// ─── Interpolação de variáveis ────────────────────────────
const interp = (texto, vars) =>
  Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(k, v || k), texto || "");

// ═══════════════════════════════════════════════════════════
const Documentos = () => {
  const { user, terapeuta } = useAuth();

  const [docAtivo, setDocAtivo] = useState("contrato");
  const [pacientes, setPacientes] = useState([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState("");
  const [anamnese, setAnamnese] = useState(null);
  const [templates, setTemplates] = useState({ ...TEMPLATES_PADRAO });
  const [editando, setEditando] = useState(false);
  const [blocos, setBlocos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const [dados, setDados] = useState({
    valorSessao: "",
    frequencia: "semanalmente",
    duracaoSessao: "50",
    localAtendimento: "presencial",
    dataContrato: new Date().toISOString().slice(0, 10),
    dataComparecimento: new Date().toISOString().slice(0, 10),
    horaComparecimento: "",
    motivoComparecimento: "consulta de psicoterapia",
  });

  useEffect(() => {
    if (user) {
      listarPacientes(workspaceId).then(setPacientes).catch(() => {});
      buscarTemplatesDoc(workspaceId).then(tmpl => {
        if (tmpl) {
          const { atualizadoEm, ...docTemplates } = tmpl;
          setTemplates(t => ({ ...t, ...docTemplates }));
        }
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (pacienteSelecionado && docAtivo === "anamnese") {
      buscarAnamnese(pacienteSelecionado).then(setAnamnese).catch(() => setAnamnese(null));
    }
  }, [pacienteSelecionado, docAtivo]);

  // Quando muda doc ativo, sai do modo edição
  useEffect(() => { setEditando(false); }, [docAtivo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDados(p => ({ ...p, [name]: value }));
  };

  const pac = pacientes.find(p => p.id === pacienteSelecionado);
  const nomeTerapeuta = terapeuta?.nome || "[Nome do Terapeuta]";
  const nomePaciente  = pac?.nome || "[Nome do Paciente]";
  const hoje = new Date().toLocaleDateString("pt-BR");

  const vars = {
    "{terapeuta}":           nomeTerapeuta,
    "{paciente}":            nomePaciente,
    "{valorSessao}":         dados.valorSessao || "___",
    "{frequencia}":          dados.frequencia,
    "{duracaoSessao}":       dados.duracaoSessao,
    "{modalidade}":          dados.localAtendimento,
    "{dataContrato}":        dados.dataContrato ? new Date(dados.dataContrato + "T00:00").toLocaleDateString("pt-BR") : hoje,
    "{dataComparecimento}":  dados.dataComparecimento ? new Date(dados.dataComparecimento + "T00:00").toLocaleDateString("pt-BR") : "___",
    "{horaComparecimento}":  dados.horaComparecimento || "___",
    "{motivoComparecimento}":dados.motivoComparecimento,
    "{data}":                hoje,
  };

  // ─── Abrir editor ────────────────────────────────────────
  const abrirEditor = () => {
    setBlocos((templates[docAtivo] || []).map(b => ({ ...b })));
    setEditando(true);
  };

  // ─── CRUD de blocos ──────────────────────────────────────
  const addBloco = () =>
    setBlocos(b => [...b, { id: uid(), tipo: "p", texto: "Novo parágrafo..." }]);

  const updateBloco = (id, field, val) =>
    setBlocos(b => b.map(x => x.id === id ? { ...x, [field]: val } : x));

  const removeBloco = (id) =>
    setBlocos(b => b.filter(x => x.id !== id));

  const moveBloco = (idx, dir) =>
    setBlocos(b => { const a = [...b]; const [x] = a.splice(idx, 1); a.splice(idx + dir, 0, x); return a; });

  // ─── Salvar template ─────────────────────────────────────
  const salvarTemplate = async () => {
    setSalvando(true);
    try {
      const novos = { ...templates, [docAtivo]: blocos };
      await salvarTemplatesDoc(workspaceId, novos);
      setTemplates(novos);
      setEditando(false);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);
    } catch (err) { alert(err.message); }
    finally { setSalvando(false); }
  };

  const restaurarPadrao = () => {
    if (!window.confirm("Restaurar o template padrão? Suas edições serão perdidas.")) return;
    setBlocos((TEMPLATES_PADRAO[docAtivo] || []).map(b => ({ ...b })));
  };

  // ─── Renderizar preview de um doc ────────────────────────
  const renderPreview = (bArr) => (
    <div className="doc-conteudo">
      {bArr.map(bloco => {
        if (bloco.tipo === "h2")  return <h2 key={bloco.id} className="doc-titulo-print">{interp(bloco.texto, vars)}</h2>;
        if (bloco.tipo === "h4")  return <h4 key={bloco.id} className="doc-clausula">{interp(bloco.texto, vars)}</h4>;
        if (bloco.tipo === "p")   return <p  key={bloco.id} className="doc-paragrafo">{interp(bloco.texto, vars)}</p>;
        if (bloco.tipo === "lista") return (
          <ul key={bloco.id} className="doc-lista">
            {bloco.texto.split("\n").filter(Boolean).map((item, i) => (
              <li key={i}>{interp(item, vars)}</li>
            ))}
          </ul>
        );
        if (bloco.tipo === "assinaturas") return (
          <div key={bloco.id} className="doc-assinaturas">
            <div className="doc-assinatura-bloco">
              <div className="doc-linha-assinatura" />
              <p>{nomeTerapeuta}</p>
              <p>{interp(bloco.parteA, vars)}</p>
            </div>
            {bloco.parteB && (
              <div className="doc-assinatura-bloco">
                <div className="doc-linha-assinatura" />
                <p>{nomePaciente}</p>
                <p>{interp(bloco.parteB, vars)}</p>
              </div>
            )}
          </div>
        );
        if (bloco.tipo === "data") return (
          <p key={bloco.id} className="doc-data-local">{interp(bloco.texto, vars)}</p>
        );
        return null;
      })}
    </div>
  );

  // ─── Renderizar anamnese impressão ───────────────────────
  const renderAnamneseImpressao = () => {
    if (!pacienteSelecionado) return <p className="fin-vazio">Selecione um paciente para imprimir a anamnese.</p>;
    if (!anamnese) return <p className="fin-vazio">Anamnese não preenchida para este paciente.</p>;
    const respostas = anamnese.respostas || {};
    const campos = Object.entries(respostas).filter(([, v]) => v && (typeof v === "string" ? v.trim() : v.length));
    return (
      <div className="doc-conteudo">
        <h2 className="doc-titulo-print">ANAMNESE</h2>
        <p className="doc-paragrafo"><strong>Paciente:</strong> {nomePaciente}</p>
        <p className="doc-paragrafo"><strong>Terapeuta:</strong> {nomeTerapeuta}</p>
        <hr style={{ margin: "16px 0" }} />
        {campos.map(([key, val]) => (
          <div key={key} style={{ marginBottom: "14px" }}>
            <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: "12px", color: "#555" }}>{key}</p>
            <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
              {Array.isArray(val) ? val.join(", ") : val}
            </p>
          </div>
        ))}
      </div>
    );
  };

  // ─── Formulário lateral ──────────────────────────────────
  const renderFormulario = () => {
    const selectPac = (
      <div className="doc-form-grupo">
        <label>Paciente</label>
        <select value={pacienteSelecionado} onChange={e => setPacienteSelecionado(e.target.value)}>
          <option value="">-- Selecione --</option>
          {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>
    );

    if (docAtivo === "contrato") return (
      <div className="doc-form">
        {selectPac}
        <div className="doc-form-grupo"><label>Valor da sessão (R$)</label>
          <input type="number" name="valorSessao" value={dados.valorSessao} onChange={handleChange} placeholder="Ex: 150" /></div>
        <div className="doc-form-grupo"><label>Frequência</label>
          <select name="frequencia" value={dados.frequencia} onChange={handleChange}>
            <option value="semanalmente">Semanalmente</option>
            <option value="quinzenalmente">Quinzenalmente</option>
            <option value="mensalmente">Mensalmente</option>
          </select></div>
        <div className="doc-form-grupo"><label>Duração</label>
          <select name="duracaoSessao" value={dados.duracaoSessao} onChange={handleChange}>
            <option value="50">50 minutos</option>
            <option value="60">60 minutos</option>
            <option value="90">90 minutos</option>
          </select></div>
        <div className="doc-form-grupo"><label>Modalidade</label>
          <select name="localAtendimento" value={dados.localAtendimento} onChange={handleChange}>
            <option value="presencial">Presencial</option>
            <option value="online">Online</option>
            <option value="presencial e online">Presencial e Online</option>
          </select></div>
        <div className="doc-form-grupo"><label>Data</label>
          <input type="date" name="dataContrato" value={dados.dataContrato} onChange={handleChange} /></div>
      </div>
    );

    if (docAtivo === "comparecimento") return (
      <div className="doc-form">
        {selectPac}
        <div className="doc-form-grupo"><label>Data</label>
          <input type="date" name="dataComparecimento" value={dados.dataComparecimento} onChange={handleChange} /></div>
        <div className="doc-form-grupo"><label>Horário (opcional)</label>
          <input type="time" name="horaComparecimento" value={dados.horaComparecimento} onChange={handleChange} /></div>
        <div className="doc-form-grupo"><label>Motivo</label>
          <input type="text" name="motivoComparecimento" value={dados.motivoComparecimento} onChange={handleChange} /></div>
      </div>
    );

    return <div className="doc-form">{selectPac}</div>;
  };

  // ─── Editor de blocos ─────────────────────────────────────
  const renderEditor = () => (
    <div className="doc-editor">
      <div className="doc-editor-topo">
        <h3 className="doc-editor-titulo">✏️ Editando template</h3>
        <div className="doc-editor-vars">
          <strong>Variáveis disponíveis:</strong>
          <div className="doc-vars-lista">
            {VARS.map(v => (
              <span key={v.chave} className="doc-var-chip" title={v.desc}>{v.chave}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="doc-blocos">
        {blocos.map((bloco, idx) => (
          <div key={bloco.id} className="doc-bloco-edit">
            <div className="doc-bloco-header">
              <select
                className="doc-bloco-tipo"
                value={bloco.tipo}
                onChange={e => updateBloco(bloco.id, "tipo", e.target.value)}
              >
                {TIPOS_BLOCO.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
                {bloco.tipo === "assinaturas" && <option value="assinaturas">Assinaturas</option>}
                {bloco.tipo === "data" && <option value="data">Data</option>}
              </select>
              <div className="doc-bloco-ctrl">
                <button disabled={idx === 0} onClick={() => moveBloco(idx, -1)}>↑</button>
                <button disabled={idx === blocos.length - 1} onClick={() => moveBloco(idx, 1)}>↓</button>
                <button className="danger" onClick={() => removeBloco(bloco.id)}>✕</button>
              </div>
            </div>

            {bloco.tipo === "assinaturas" ? (
              <div className="doc-bloco-assin">
                <input placeholder="Rótulo parte A (ex: Terapeuta)" value={bloco.parteA || ""} onChange={e => updateBloco(bloco.id, "parteA", e.target.value)} />
                <input placeholder="Rótulo parte B (em branco = só uma assinatura)" value={bloco.parteB || ""} onChange={e => updateBloco(bloco.id, "parteB", e.target.value)} />
              </div>
            ) : (bloco.tipo === "p" || bloco.tipo === "lista") ? (
              <textarea
                className="doc-bloco-textarea"
                rows={bloco.tipo === "lista" ? 4 : 3}
                value={bloco.texto || ""}
                onChange={e => updateBloco(bloco.id, "texto", e.target.value)}
                placeholder={bloco.tipo === "lista" ? "Um item por linha..." : "Texto do parágrafo..."}
              />
            ) : (
              <input
                className="doc-bloco-input"
                value={bloco.texto || ""}
                onChange={e => updateBloco(bloco.id, "texto", e.target.value)}
                placeholder="Texto..."
              />
            )}
          </div>
        ))}
      </div>

      <div className="doc-editor-footer">
        <button className="doc-add-bloco" onClick={addBloco}>+ Adicionar bloco</button>
        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <button className="doc-btn-restaurar" onClick={restaurarPadrao}>↩ Restaurar padrão</button>
          <button className="doc-btn-cancelar-edit" onClick={() => setEditando(false)}>Cancelar</button>
          <button className="doc-btn-salvar-tmpl" onClick={salvarTemplate} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar Template"}
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Render principal ─────────────────────────────────────
  const bArr = templates[docAtivo] || [];

  return (
    <div className="doc-container">
      <h2 className="fin-titulo">Documentos</h2>
      {salvo && <div className="doc-success">✅ Template salvo com sucesso!</div>}

      <div className="doc-layout">
        {/* Sidebar */}
        <div className="doc-sidebar">
          {DOCS.map(d => (
            <button key={d.key} className={`doc-btn${docAtivo === d.key ? " ativo" : ""}`} onClick={() => setDocAtivo(d.key)}>
              {d.label}
            </button>
          ))}
        </div>

        {/* Área principal */}
        <div className="doc-main">
          {/* Formulário */}
          <div className="doc-form-area">
            <h3 className="doc-form-titulo">Dados do documento</h3>
            {renderFormulario()}
            <div className="doc-form-btns">
              {docAtivo !== "anamnese" && !editando && (
                <button className="doc-btn-editar" onClick={abrirEditor}>✏️ Editar Template</button>
              )}
              <button className="doc-btn-imprimir" onClick={() => window.print()}>🖨️ Imprimir / PDF</button>
            </div>
          </div>

          {/* Editor ou Preview */}
          {editando && docAtivo !== "anamnese" ? (
            renderEditor()
          ) : (
            <div className="doc-preview-area">
              <div className="doc-preview-header"><span>Pré-visualização</span></div>
              <div className="doc-preview" id="doc-para-imprimir">
                {docAtivo === "anamnese"
                  ? renderAnamneseImpressao()
                  : renderPreview(bArr)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Documentos;
