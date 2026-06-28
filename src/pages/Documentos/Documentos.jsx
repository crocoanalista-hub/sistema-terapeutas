import React, { useState, useEffect, useCallback } from "react";
import { listarPacientes } from "../../services/pacientesService";
import { buscarAnamnese } from "../../services/anamneseService";
import { salvarTemplatesDoc, buscarTemplatesDoc } from "../../services/documentosService";
import {
  criarDocumentoParaAssinar,
  listarDocumentosParaAssinar,
} from "../../services/assinaturaService";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/documentos.css";
import "../../styles/assinatura.css";

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
  { key: "assinaturas",    label: "✍️ Assinaturas" },
];

// ─── Interpolação de variáveis ────────────────────────────
const interp = (texto, vars) =>
  Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(k, v || k), texto || "");

// ═══════════════════════════════════════════════════════════
const Documentos = () => {
  const { workspaceId, terapeuta, slug } = useAuth();

  const [docAtivo, setDocAtivo] = useState("contrato");
  const [pacientes, setPacientes] = useState([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState("");
  const [anamnese, setAnamnese] = useState(null);
  const [templates, setTemplates] = useState({ ...TEMPLATES_PADRAO });
  const [editando, setEditando] = useState(false);
  const [blocos, setBlocos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  // ─── Estado: Assinaturas ─────────────────────────────────
  const [docsSolicitados, setDocsSolicitados] = useState([]);
  const [carregandoAssins, setCarregandoAssins] = useState(false);
  const [modalSolicitar, setModalSolicitar] = useState(false);
  const [criando, setCriando] = useState(false);
  const [formAssin, setFormAssin] = useState({
    nomePaciente: "",
    telefone: "",
    tipoDoc: "contrato",
    pacienteId: "",
  });
  const [modalVerAssin, setModalVerAssin] = useState(null); // { base64, nomePaciente }

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
    if (workspaceId) {
      listarPacientes(workspaceId).then(setPacientes).catch(() => {});
      buscarTemplatesDoc(workspaceId).then(tmpl => {
        if (tmpl) {
          const { atualizadoEm, ...docTemplates } = tmpl;
          setTemplates(t => ({ ...t, ...docTemplates }));
        }
      }).catch(() => {});
    }
  }, [workspaceId]);

  const carregarAssinaturas = useCallback(async () => {
    if (!workspaceId) return;
    setCarregandoAssins(true);
    try {
      const lista = await listarDocumentosParaAssinar(workspaceId);
      lista.sort((a, b) => {
        const ta = a.criadoEm?.toDate?.() || new Date(a.criadoEm || 0);
        const tb = b.criadoEm?.toDate?.() || new Date(b.criadoEm || 0);
        return tb - ta;
      });
      setDocsSolicitados(lista);
    } catch (_) {}
    finally { setCarregandoAssins(false); }
  }, [workspaceId]);

  useEffect(() => {
    if (docAtivo === "assinaturas") carregarAssinaturas();
  }, [docAtivo, carregarAssinaturas]);

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

  // ─── Gerar HTML do documento para assinatura ─────────────
  const gerarHTMLDocumento = (tipoDoc, nomePac, nomeTer) => {
    const varsDoc = {
      "{terapeuta}":           nomeTer || "[Terapeuta]",
      "{paciente}":            nomePac || "[Paciente]",
      "{valorSessao}":         dados.valorSessao || "___",
      "{frequencia}":          dados.frequencia,
      "{duracaoSessao}":       dados.duracaoSessao,
      "{modalidade}":          dados.localAtendimento,
      "{dataContrato}":        new Date().toLocaleDateString("pt-BR"),
      "{dataComparecimento}":  new Date().toLocaleDateString("pt-BR"),
      "{horaComparecimento}":  "___",
      "{motivoComparecimento}": dados.motivoComparecimento,
      "{data}":                new Date().toLocaleDateString("pt-BR"),
    };
    const bArr = templates[tipoDoc] || TEMPLATES_PADRAO[tipoDoc] || [];
    let html = '<div style="font-family:Georgia,serif;font-size:14px;line-height:1.7;color:#222;">';
    bArr.forEach(bloco => {
      const t = Object.entries(varsDoc).reduce((s, [k, v]) => s.replaceAll(k, v || k), bloco.texto || "");
      if (bloco.tipo === "h2")  html += `<h2 style="text-align:center;font-size:16px;">${t}</h2>`;
      else if (bloco.tipo === "h4") html += `<h4 style="margin-top:16px;font-size:14px;">${t}</h4>`;
      else if (bloco.tipo === "p")  html += `<p style="margin:8px 0;">${t}</p>`;
      else if (bloco.tipo === "lista") {
        const itens = bloco.texto.split("\n").filter(Boolean).map(i =>
          `<li>${Object.entries(varsDoc).reduce((s,[k,v]) => s.replaceAll(k, v||k), i)}</li>`
        ).join("");
        html += `<ul style="padding-left:20px;">${itens}</ul>`;
      } else if (bloco.tipo === "assinaturas") {
        html += `<div style="display:flex;gap:60px;margin-top:30px;">
          <div><div style="border-top:1px solid #333;width:200px;margin-bottom:4px;"></div>
          <p style="margin:0;font-size:12px;">${nomeTer}</p>
          <p style="margin:0;font-size:12px;">${bloco.parteA || ""}</p></div>
          ${bloco.parteB ? `<div><div style="border-top:1px solid #333;width:200px;margin-bottom:4px;"></div>
          <p style="margin:0;font-size:12px;">${nomePac}</p>
          <p style="margin:0;font-size:12px;">${bloco.parteB}</p></div>` : ""}
        </div>`;
      } else if (bloco.tipo === "data") {
        html += `<p style="margin-top:20px;font-size:13px;">${t}</p>`;
      }
    });
    html += "</div>";
    return html;
  };

  // ─── Handlers: Assinaturas ───────────────────────────────
  const handleCriarAssinatura = async () => {
    if (!formAssin.nomePaciente.trim()) { alert("Informe o nome do paciente."); return; }
    if (!slug) { alert("Slug do workspace não disponível."); return; }
    setCriando(true);
    try {
      const nomeTer = terapeuta?.nome || "[Terapeuta]";
      const labelDoc = DOCS.find(d => d.key === formAssin.tipoDoc)?.label || formAssin.tipoDoc;
      const conteudo = gerarHTMLDocumento(formAssin.tipoDoc, formAssin.nomePaciente.trim(), nomeTer);
      const docId = await criarDocumentoParaAssinar(workspaceId, {
        nomePaciente: formAssin.nomePaciente.trim(),
        telefone: formAssin.telefone.trim(),
        titulo: labelDoc,
        tipoDoc: formAssin.tipoDoc,
        conteudo,
      });
      const link = `${window.location.origin}/${slug}/assinar/${docId}`;
      setModalSolicitar(false);
      setFormAssin({ nomePaciente: "", telefone: "", tipoDoc: "contrato", pacienteId: "" });
      await carregarAssinaturas();
      // Oferecer envio via WhatsApp se tiver telefone
      if (formAssin.telefone.trim()) {
        const tel = formAssin.telefone.replace(/\D/g, "");
        const msg = encodeURIComponent(`Olá, ${formAssin.nomePaciente.trim()}! Segue o link para assinar o documento "${labelDoc}": ${link}`);
        window.open(`https://wa.me/55${tel}?text=${msg}`, "_blank");
      } else {
        navigator.clipboard.writeText(link).catch(() => {});
        alert(`Link gerado e copiado para a área de transferência:\n${link}`);
      }
    } catch (e) {
      alert("Erro ao criar o documento: " + e.message);
    } finally {
      setCriando(false);
    }
  };

  const copiarLink = (docId) => {
    const link = `${window.location.origin}/${slug}/assinar/${docId}`;
    navigator.clipboard.writeText(link).catch(() => {});
    alert("Link copiado!");
  };

  // ─── Render aba Assinaturas ──────────────────────────────
  const renderAssinaturas = () => (
    <div className="doc-main" style={{ width: "100%" }}>
      <div className="assin-header">
        <h3>Documentos enviados para assinatura</h3>
        <button className="assin-btn-solicitar" onClick={() => setModalSolicitar(true)}>
          + Solicitar assinatura
        </button>
      </div>

      {carregandoAssins ? (
        <p className="assin-vazio">Carregando...</p>
      ) : docsSolicitados.length === 0 ? (
        <p className="assin-vazio">Nenhum documento enviado para assinatura ainda.</p>
      ) : (
        <div className="assin-lista">
          {docsSolicitados.map(d => {
            const data = d.criadoEm?.toDate?.() || (d.criadoEm ? new Date(d.criadoEm) : null);
            const dataStr = data ? data.toLocaleDateString("pt-BR") : "—";
            return (
              <div key={d.id} className="assin-item">
                <div className="assin-item-info">
                  <strong>{d.nomePaciente}</strong>
                  <span>{d.titulo} · {dataStr}</span>
                </div>
                <div className="assin-item-btns">
                  <span className={`assin-badge ${d.status}`}>{d.status === "assinado" ? "Assinado" : "Pendente"}</span>
                  {d.status !== "assinado" && (
                    <button className="assin-btn-link" onClick={() => copiarLink(d.id)}>
                      🔗 Copiar link
                    </button>
                  )}
                  {d.status === "assinado" && d.assinaturaBase64 && (
                    <button className="assin-btn-ver" onClick={() => setModalVerAssin({ base64: d.assinaturaBase64, nomePaciente: d.nomePaciente })}>
                      Ver assinatura
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal solicitar */}
      {modalSolicitar && (
        <div className="modal-assin-overlay" onClick={() => setModalSolicitar(false)}>
          <div className="modal-assin" onClick={e => e.stopPropagation()}>
            <div className="modal-assin-header">
              <h3>Solicitar assinatura</h3>
              <button className="modal-assin-fechar" onClick={() => setModalSolicitar(false)}>✕</button>
            </div>
            <div className="modal-assin-body">
              <div className="modal-assin-grupo">
                <label>Paciente (da lista)</label>
                <select
                  value={formAssin.pacienteId}
                  onChange={e => {
                    const pac = pacientes.find(p => p.id === e.target.value);
                    setFormAssin(f => ({
                      ...f,
                      pacienteId: e.target.value,
                      nomePaciente: pac?.nome || f.nomePaciente,
                      telefone: pac?.telefone || f.telefone,
                    }));
                  }}
                >
                  <option value="">-- Selecionar --</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="modal-assin-grupo">
                <label>Nome do paciente *</label>
                <input
                  placeholder="Nome completo"
                  value={formAssin.nomePaciente}
                  onChange={e => setFormAssin(f => ({ ...f, nomePaciente: e.target.value }))}
                />
              </div>
              <div className="modal-assin-grupo">
                <label>Telefone (WhatsApp)</label>
                <input
                  placeholder="(11) 99999-9999"
                  value={formAssin.telefone}
                  onChange={e => setFormAssin(f => ({ ...f, telefone: e.target.value }))}
                />
              </div>
              <div className="modal-assin-grupo">
                <label>Documento</label>
                <select
                  value={formAssin.tipoDoc}
                  onChange={e => setFormAssin(f => ({ ...f, tipoDoc: e.target.value }))}
                >
                  {DOCS.filter(d => d.key !== "anamnese" && d.key !== "assinaturas").map(d => (
                    <option key={d.key} value={d.key}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-assin-footer">
              <button className="btn-cancelar" onClick={() => setModalSolicitar(false)}>Cancelar</button>
              <button className="btn-criar" onClick={handleCriarAssinatura} disabled={criando}>
                {criando ? "Gerando..." : "Gerar link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ver assinatura */}
      {modalVerAssin && (
        <div className="modal-assin-overlay" onClick={() => setModalVerAssin(null)}>
          <div className="modal-assin modal-ver-assin" onClick={e => e.stopPropagation()}>
            <div className="modal-assin-header">
              <h3>Assinatura de {modalVerAssin.nomePaciente}</h3>
              <button className="modal-assin-fechar" onClick={() => setModalVerAssin(null)}>✕</button>
            </div>
            <div className="modal-assin-body">
              <img src={modalVerAssin.base64} alt="Assinatura" />
            </div>
          </div>
        </div>
      )}
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
        {docAtivo === "assinaturas" ? renderAssinaturas() : (
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
        )}
      </div>
    </div>
  );
};

export default Documentos;
