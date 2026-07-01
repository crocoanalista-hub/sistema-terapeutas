import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  criarSala, listarSalas, atualizarSala, excluirSala,
} from "../../services/salasService";
import {
  criarLinkProfissional, listarProfissionais, listarConvitesPendentes,
  desativarProfissional, deletarConvite, atualizarProfissional,
} from "../../services/profissionaisService";
import {
  buscarConfiguracoes, salvarConfiguracoes, uploadLogo,
} from "../../services/configuracoesService";
import { verificarSlugDisponivel, slugValido } from "../../services/slugService";
import { useConfiguracoes } from "../../hooks/useConfiguracoes";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebaseConfig";
import "../../styles/configuracoes.css";

const CORES_PRESET = [
  "#4285f4","#34a853","#ea4335","#fbbc05","#9c27b0",
  "#00bcd4","#ff5722","#795548","#607d8b","#e91e63",
];

const CORES_SIDEBAR = [
  "#1a2535","#1e3a5f","#2d4a22","#4a1942","#1a3535",
  "#2c2c2c","#3d2b1f","#1f2d3d","#1a1a2e","#2d1a35",
];

export default function Configuracoes() {
  const { workspaceId, role } = useAuth();
  const { config: configAtual, atualizarConfig } = useConfiguracoes(workspaceId);
  const [aba, setAba] = useState("salas");

  // ── Aparência ──
  const [aparencia, setAparencia] = useState({ corSidebar: "#1a2535", corPrimaria: "#1a73e8", nomeClinica: "Consultório", logoUrl: null });
  const [uploadandoLogo, setUploadandoLogo] = useState(false);
  const [salvandoAparencia, setSalvandoAparencia] = useState(false);
  const [previewLogo, setPreviewLogo] = useState(null);
  const logoInputRef = useRef(null);
  const [slug, setSlug] = useState("");
  const [slugOriginal, setSlugOriginal] = useState("");
  const [slugErro, setSlugErro] = useState("");

  // ── Salas ──
  const [salas, setSalas] = useState([]);
  const [loadingSalas, setLoadingSalas] = useState(true);
  const [novaSala, setNovaSala] = useState({ nome: "", cor: "#4285f4" });
  const [editandoSala, setEditandoSala] = useState(null);
  const [salvandoSala, setSalvandoSala] = useState(false);

  // ── Profissionais ──
  const [profissionais, setProfissionais] = useState([]);
  const [convitesPendentes, setConvitesPendentes] = useState([]);
  const [loadingProf, setLoadingProf] = useState(true);
  const [novoProf, setNovoProf] = useState({ nome: "", especialidade: "", cor: "#9c27b0" });
  const [mostrarFormProf, setMostrarFormProf] = useState(false);
  const [editandoProf, setEditandoProf] = useState(null);
  const [salvandoProf, setSalvandoProf] = useState(false);
  const [linkGerado, setLinkGerado] = useState(null); // { token, url, nome }

  // ── Horários de funcionamento ──
  const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const HORAS_DISPONIVEIS = [
    "06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30",
    "10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30",
    "14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30",
    "18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00",
  ];
  const [horarios, setHorarios] = useState({
    0: { ativo: false, inicio: "08:00", fim: "18:00" },
    1: { ativo: true,  inicio: "08:00", fim: "18:00" },
    2: { ativo: true,  inicio: "08:00", fim: "18:00" },
    3: { ativo: true,  inicio: "08:00", fim: "18:00" },
    4: { ativo: true,  inicio: "08:00", fim: "18:00" },
    5: { ativo: true,  inicio: "08:00", fim: "18:00" },
    6: { ativo: false, inicio: "08:00", fim: "13:00" },
  });
  const [duracaoSessao, setDuracaoSessao] = useState(60);       // duração de cada sessão (slot)
  const [intervaloEntreSessoes, setIntervaloEntreSessoes] = useState(0); // buffer entre sessões
  const [salvandoHorarios, setSalvandoHorarios] = useState(false);
  const [horariosSalvos, setHorariosSalvos] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    carregarSalas();
    carregarProfissionais();
    buscarConfiguracoes(workspaceId).then(cfg => {
      setAparencia(a => ({ ...a, ...cfg }));
      if (cfg.horariosFuncionamento)    setHorarios(cfg.horariosFuncionamento);
      if (cfg.duracaoSessao)            setDuracaoSessao(cfg.duracaoSessao);
      if (cfg.intervaloEntreSessoes != null) setIntervaloEntreSessoes(cfg.intervaloEntreSessoes);
    }).catch(() => {});
    // Carrega slug atual do terapeuta
    carregarSlug();
  }, [workspaceId]);

  // Sincroniza estado local quando config global muda
  useEffect(() => {
    if (configAtual) setAparencia(a => ({ ...a, ...configAtual }));
  }, [configAtual]);

  const carregarSlug = async () => {
    if (!workspaceId) return;
    try {
      const { getDoc } = await import("firebase/firestore");
      const snap = await getDoc(doc(db, "terapeutas", workspaceId));
      if (snap.exists()) {
        const s = snap.data().slug || "";
        setSlug(s);
        setSlugOriginal(s);
      }
    } catch {}
  };

  const carregarSalas = async () => {
    setLoadingSalas(true);
    try { setSalas(await listarSalas(workspaceId)); } catch { }
    setLoadingSalas(false);
  };

  const carregarProfissionais = async () => {
    setLoadingProf(true);
    try {
      const [profs, convites] = await Promise.all([
        listarProfissionais(workspaceId),
        listarConvitesPendentes(workspaceId),
      ]);
      setProfissionais(profs);
      setConvitesPendentes(convites);
    } catch { }
    setLoadingProf(false);
  };

  // ── Sala handlers ──
  const handleCriarSala = async () => {
    if (!novaSala.nome.trim()) return;
    setSalvandoSala(true);
    try {
      await criarSala(workspaceId, novaSala);
      setNovaSala({ nome: "", cor: "#4285f4" });
      await carregarSalas();
    } catch (e) { alert("Erro ao criar sala: " + e.message); }
    setSalvandoSala(false);
  };

  const handleSalvarEditSala = async () => {
    if (!editandoSala.nome.trim()) return;
    setSalvandoSala(true);
    try {
      await atualizarSala(editandoSala.id, { nome: editandoSala.nome, cor: editandoSala.cor });
      setEditandoSala(null);
      await carregarSalas();
    } catch (e) { alert("Erro ao salvar: " + e.message); }
    setSalvandoSala(false);
  };

  const handleExcluirSala = async (id) => {
    if (!window.confirm("Excluir esta sala?")) return;
    await excluirSala(id);
    await carregarSalas();
  };

  // ── Profissional handlers ──
  const handleConvidar = async () => {
    if (!novoProf.nome.trim()) return;
    setSalvandoProf(true);
    try {
      const token = await criarLinkProfissional(workspaceId, novoProf);
      const url = `${window.location.origin}/registro?convite=${token}`;
      setLinkGerado({ token, url, nome: novoProf.nome.trim() });
      setNovoProf({ nome: "", especialidade: "", cor: "#9c27b0" });
      setMostrarFormProf(false);
      await carregarProfissionais();
    } catch (e) { alert("Erro ao gerar link: " + e.message); }
    setSalvandoProf(false);
  };

  const handleDesativar = async (id, nome) => {
    if (!window.confirm(`Desativar ${nome}? Ele não poderá mais acessar o sistema.`)) return;
    await desativarProfissional(id);
    await carregarProfissionais();
  };

  const handleCancelarConvite = async (token, nome) => {
    if (!window.confirm(`Cancelar link de ${nome}? O link deixará de funcionar.`)) return;
    await deletarConvite(token);
    await carregarProfissionais();
  };

  const handleSalvarEditProf = async () => {
    setSalvandoProf(true);
    try {
      await atualizarProfissional(editandoProf.id, {
        nome: editandoProf.nome,
        especialidade: editandoProf.especialidade,
        cor: editandoProf.cor,
      });
      setEditandoProf(null);
      await carregarProfissionais();
    } catch (e) { alert("Erro ao salvar: " + e.message); }
    setSalvandoProf(false);
  };

  // ── Aparência handlers ──
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewLogo(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSalvarAparencia = async () => {
    // Valida slug
    if (slug && !slugValido(slug)) {
      setSlugErro("Use apenas letras minúsculas, números e hífen (3–30 caracteres).");
      return;
    }
    if (slug && slug !== slugOriginal) {
      const disponivel = await verificarSlugDisponivel(slug, workspaceId);
      if (!disponivel) {
        setSlugErro("Essa URL já está em uso. Escolha outra.");
        return;
      }
    }

    setSalvandoAparencia(true);
    try {
      let logoUrl = aparencia.logoUrl;
      const file = logoInputRef.current?.files[0];
      if (file) {
        setUploadandoLogo(true);
        logoUrl = await uploadLogo(workspaceId, file);
        setUploadandoLogo(false);
      }
      const novosDados = { ...aparencia, logoUrl };
      await salvarConfiguracoes(workspaceId, novosDados);
      atualizarConfig(novosDados);
      setAparencia(novosDados);
      // Salva slug no documento do terapeuta
      await updateDoc(doc(db, "terapeutas", workspaceId), { slug: slug || null });
      setSlugOriginal(slug);
      setPreviewLogo(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
      alert("Aparência salva com sucesso!");
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSalvandoAparencia(false);
      setUploadandoLogo(false);
    }
  };

  const handleRemoverLogo = async () => {
    if (!window.confirm("Remover o logo?")) return;
    const novosDados = { ...aparencia, logoUrl: null };
    await salvarConfiguracoes(workspaceId, novosDados);
    atualizarConfig(novosDados);
    setAparencia(novosDados);
    setPreviewLogo(null);
  };


  const handleSalvarHorarios = async () => {
    setSalvandoHorarios(true);
    try {
      await salvarConfiguracoes(workspaceId, {
        horariosFuncionamento: horarios,
        duracaoSessao,
        intervaloEntreSessoes,
      });
      setHorariosSalvos(true);
      setTimeout(() => setHorariosSalvos(false), 3000);
    } catch (e) { alert("Erro ao salvar: " + e.message); }
    setSalvandoHorarios(false);
  };

  const gerarHorasIntervalo = (inicio, fim, slotMin) => {
    const horas = [];
    const [hI, mI] = inicio.split(":").map(Number);
    const [hF, mF] = fim.split(":").map(Number);
    let total = hI * 60 + mI;
    const totalFim = hF * 60 + mF;
    while (total < totalFim) {
      const h = String(Math.floor(total / 60)).padStart(2, "0");
      const m = String(total % 60).padStart(2, "0");
      horas.push(`${h}:${m}`);
      total += slotMin;
    }
    return horas;
  };

  if (role && role !== "owner") {
    return (
      <div className="cfg-page">
        <h2 className="cfg-titulo">Configurações</h2>
        <p className="cfg-sem-acesso">Apenas o titular da conta pode acessar as configurações do espaço.</p>
      </div>
    );
  }

  return (
    <div className="cfg-page">
      <h2 className="cfg-titulo">Configurações</h2>

      <div className="cfg-abas">
        <button
          className={`cfg-aba ${aba === "salas" ? "ativa" : ""}`}
          onClick={() => setAba("salas")}
        >
          🚪 Salas
        </button>
        <button
          className={`cfg-aba ${aba === "profissionais" ? "ativa" : ""}`}
          onClick={() => setAba("profissionais")}
        >
          👥 Profissionais
        </button>
        <button
          className={`cfg-aba ${aba === "aparencia" ? "ativa" : ""}`}
          onClick={() => setAba("aparencia")}
        >
          🎨 Aparência
        </button>
        <button
          className={`cfg-aba ${aba === "horarios" ? "ativa" : ""}`}
          onClick={() => setAba("horarios")}
        >
          🕐 Horários
        </button>
      </div>

      {/* ═══ ABA SALAS ═══ */}
      {aba === "salas" && (
        <div className="cfg-conteudo">
          <p className="cfg-descricao">
            Crie salas para organizar sessões por espaço físico. Você pode atribuir uma sala ao
            agendar e filtrar a agenda por sala.
          </p>

          {/* Form nova sala */}
          <div className="cfg-card">
            <h3 className="cfg-card-titulo">Nova sala</h3>
            <div className="cfg-sala-form">
              <input
                className="cfg-input"
                placeholder="Nome da sala (ex: Sala 1, Sala Azul…)"
                value={novaSala.nome}
                onChange={(e) => setNovaSala({ ...novaSala, nome: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleCriarSala()}
              />
              <div className="cfg-cor-selector">
                <span className="cfg-cor-label">Cor:</span>
                <div className="cfg-cores-grid">
                  {CORES_PRESET.map((c) => (
                    <button
                      key={c}
                      className={`cfg-cor-btn ${novaSala.cor === c ? "ativa" : ""}`}
                      style={{ background: c }}
                      onClick={() => setNovaSala({ ...novaSala, cor: c })}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  className="cfg-cor-custom"
                  value={novaSala.cor}
                  onChange={(e) => setNovaSala({ ...novaSala, cor: e.target.value })}
                  title="Cor personalizada"
                />
              </div>
              <button
                className="cfg-btn-primary"
                onClick={handleCriarSala}
                disabled={!novaSala.nome.trim() || salvandoSala}
              >
                {salvandoSala ? "Criando…" : "+ Criar sala"}
              </button>
            </div>
          </div>

          {/* Lista de salas */}
          <div className="cfg-lista">
            {loadingSalas ? (
              <p className="cfg-carregando">Carregando salas…</p>
            ) : salas.length === 0 ? (
              <p className="cfg-vazio">Nenhuma sala cadastrada ainda.</p>
            ) : salas.map((sala) => (
              editandoSala?.id === sala.id ? (
                <div key={sala.id} className="cfg-item cfg-item-editando">
                  <div
                    className="cfg-item-cor"
                    style={{ background: editandoSala.cor }}
                  />
                  <input
                    className="cfg-input cfg-input-inline"
                    value={editandoSala.nome}
                    onChange={(e) => setEditandoSala({ ...editandoSala, nome: e.target.value })}
                    autoFocus
                  />
                  <div className="cfg-cores-grid cfg-cores-inline">
                    {CORES_PRESET.map((c) => (
                      <button
                        key={c}
                        className={`cfg-cor-btn ${editandoSala.cor === c ? "ativa" : ""}`}
                        style={{ background: c }}
                        onClick={() => setEditandoSala({ ...editandoSala, cor: c })}
                      />
                    ))}
                  </div>
                  <div className="cfg-item-acoes">
                    <button className="cfg-btn-sm cfg-btn-save" onClick={handleSalvarEditSala} disabled={salvandoSala}>
                      Salvar
                    </button>
                    <button className="cfg-btn-sm" onClick={() => setEditandoSala(null)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div key={sala.id} className="cfg-item">
                  <div className="cfg-item-cor" style={{ background: sala.cor }} />
                  <span className="cfg-item-nome">{sala.nome}</span>
                  <div className="cfg-item-acoes">
                    <button className="cfg-btn-sm" onClick={() => setEditandoSala({ ...sala })}>Editar</button>
                    <button className="cfg-btn-sm cfg-btn-danger" onClick={() => handleExcluirSala(sala.id)}>Excluir</button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* ═══ ABA PROFISSIONAIS ═══ */}
      {aba === "profissionais" && (
        <div className="cfg-conteudo">
          <p className="cfg-descricao">
            Adicione profissionais à sua clínica. Eles criam uma conta própria e podem agendar
            sessões que aparecem para todos os usuários do espaço.
          </p>

          {/* Link gerado — exibido após criar */}
          {linkGerado && (
            <div className="cfg-link-gerado">
              <div className="cfg-link-gerado-header">
                <span>🔗 Link de cadastro gerado para <strong>{linkGerado.nome}</strong></span>
                <button onClick={() => setLinkGerado(null)}>✕</button>
              </div>
              <p className="cfg-link-gerado-desc">Envie este link para o profissional. Ao acessar, ele cria a própria senha e entra automaticamente no seu espaço.</p>
              <div className="cfg-link-gerado-url">
                <code>{linkGerado.url}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(linkGerado.url);
                    alert("Link copiado!");
                  }}
                >
                  📋 Copiar
                </button>
              </div>
            </div>
          )}

          {/* Form novo profissional */}
          {!mostrarFormProf ? (
            <button className="cfg-btn-primary" onClick={() => setMostrarFormProf(true)}>
              + Gerar link de acesso
            </button>
          ) : (
            <div className="cfg-card">
              <h3 className="cfg-card-titulo">Novo profissional</h3>
              <p className="cfg-descricao-sm">Preencha o nome e gere um link. O profissional acessa o link e cria sua própria senha — sem precisar de e-mail pré-cadastrado.</p>
              <div className="cfg-prof-form">
                <div className="cfg-form-row">
                  <div className="cfg-form-group">
                    <label className="cfg-label">Nome *</label>
                    <input
                      className="cfg-input"
                      placeholder="Nome do profissional"
                      value={novoProf.nome}
                      onChange={(e) => setNovoProf({ ...novoProf, nome: e.target.value })}
                    />
                  </div>
                  <div className="cfg-form-group">
                    <label className="cfg-label">Especialidade</label>
                    <input
                      className="cfg-input"
                      placeholder="Ex: Psicólogo, Terapeuta…"
                      value={novoProf.especialidade}
                      onChange={(e) => setNovoProf({ ...novoProf, especialidade: e.target.value })}
                    />
                  </div>
                </div>
                <div className="cfg-form-group">
                  <label className="cfg-label">Cor na agenda</label>
                  <div className="cfg-cores-grid">
                    {CORES_PRESET.map((c) => (
                      <button
                        key={c}
                        className={`cfg-cor-btn ${novoProf.cor === c ? "ativa" : ""}`}
                        style={{ background: c }}
                        onClick={() => setNovoProf({ ...novoProf, cor: c })}
                      />
                    ))}
                  </div>
                </div>
                <div className="cfg-form-acoes">
                  <button
                    className="cfg-btn-primary"
                    onClick={handleConvidar}
                    disabled={!novoProf.nome.trim() || salvandoProf}
                  >
                    {salvandoProf ? "Gerando…" : "🔗 Gerar link"}
                  </button>
                  <button className="cfg-btn-sm" onClick={() => setMostrarFormProf(false)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {/* Profissionais ativos */}
          <div className="cfg-lista">
            <h3 className="cfg-lista-titulo">Profissionais cadastrados</h3>
            {loadingProf ? (
              <p className="cfg-carregando">Carregando…</p>
            ) : profissionais.length === 0 ? (
              <p className="cfg-vazio">Nenhum profissional cadastrado ainda.</p>
            ) : profissionais.map((p) => (
              editandoProf?.id === p.id ? (
                <div key={p.id} className="cfg-item cfg-item-editando">
                  <div className="cfg-item-cor" style={{ background: editandoProf.cor }} />
                  <div className="cfg-item-info cfg-item-info-edit">
                    <input
                      className="cfg-input cfg-input-inline"
                      value={editandoProf.nome}
                      onChange={(e) => setEditandoProf({ ...editandoProf, nome: e.target.value })}
                    />
                    <input
                      className="cfg-input cfg-input-inline"
                      placeholder="Especialidade"
                      value={editandoProf.especialidade}
                      onChange={(e) => setEditandoProf({ ...editandoProf, especialidade: e.target.value })}
                    />
                    <div className="cfg-cores-grid cfg-cores-inline">
                      {CORES_PRESET.map((c) => (
                        <button
                          key={c}
                          className={`cfg-cor-btn ${editandoProf.cor === c ? "ativa" : ""}`}
                          style={{ background: c }}
                          onClick={() => setEditandoProf({ ...editandoProf, cor: c })}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="cfg-item-acoes">
                    <button className="cfg-btn-sm cfg-btn-save" onClick={handleSalvarEditProf} disabled={salvandoProf}>Salvar</button>
                    <button className="cfg-btn-sm" onClick={() => setEditandoProf(null)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div key={p.id} className="cfg-item">
                  <div className="cfg-item-cor" style={{ background: p.cor || "#9c27b0" }} />
                  <div className="cfg-item-info">
                    <span className="cfg-item-nome">{p.nome}</span>
                    {p.especialidade && <span className="cfg-item-sub">{p.especialidade}</span>}
                    <span className="cfg-item-sub">{p.email}</span>
                  </div>
                  <div className="cfg-item-acoes">
                    <button className="cfg-btn-sm" onClick={() => setEditandoProf({ ...p })}>Editar</button>
                    <button className="cfg-btn-sm cfg-btn-danger" onClick={() => handleDesativar(p.id, p.nome)}>Desativar</button>
                  </div>
                </div>
              )
            ))}
          </div>

          {/* Links pendentes */}
          {convitesPendentes.length > 0 && (
            <div className="cfg-lista">
              <h3 className="cfg-lista-titulo">Links de acesso pendentes</h3>
              <p className="cfg-descricao cfg-descricao-sm">
                Aguardando o profissional usar o link para criar a conta.
              </p>
              {convitesPendentes.map((c) => {
                const linkUrl = `${window.location.origin}/registro?convite=${c.token || c.id}`;
                return (
                  <div key={c.id} className="cfg-item cfg-item-pendente">
                    <div className="cfg-item-cor" style={{ background: c.cor || "#9c27b0", opacity: 0.5 }} />
                    <div className="cfg-item-info" style={{ flex: 1, minWidth: 0 }}>
                      <span className="cfg-item-nome">{c.nome}</span>
                      {c.especialidade && <span className="cfg-item-sub">{c.especialidade}</span>}
                      <span className="cfg-item-sub cfg-link-pendente-url">{linkUrl}</span>
                    </div>
                    <span className="cfg-badge-pendente">Aguardando cadastro</span>
                    <div className="cfg-item-acoes">
                      <button
                        className="cfg-btn-sm"
                        onClick={() => { navigator.clipboard.writeText(linkUrl); alert("Link copiado!"); }}
                      >
                        📋 Copiar
                      </button>
                      <button className="cfg-btn-sm cfg-btn-danger" onClick={() => handleCancelarConvite(c.token || c.id, c.nome)}>Remover</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ ABA APARÊNCIA ═══ */}
      {aba === "aparencia" && (
        <div className="cfg-conteudo">
          <p className="cfg-descricao">
            Personalize a identidade visual do sistema — cor da barra lateral, cor de destaque e logo da clínica.
          </p>

          {/* Preview ao vivo */}
          <div className="cfg-preview-sidebar" style={{ background: aparencia.corSidebar }}>
            <div className="cfg-preview-logo">
              {(previewLogo || aparencia.logoUrl) ? (
                <img src={previewLogo || aparencia.logoUrl} alt="Logo" className="cfg-preview-logo-img" />
              ) : <span style={{ fontSize: 28 }}>🧠</span>}
            </div>
            <span className="cfg-preview-nome">{aparencia.nomeClinica || "Consultório"}</span>
            <div className="cfg-preview-nav">
              {["Dashboard","Pacientes","Agenda"].map(l => (
                <div key={l} className="cfg-preview-nav-item" style={{ borderLeftColor: aparencia.corPrimaria }}>
                  {l}
                </div>
              ))}
            </div>
          </div>

          {/* Nome da clínica */}
          <div className="cfg-card">
            <h3 className="cfg-card-titulo">Nome do sistema / clínica</h3>
            <input
              className="cfg-input"
              placeholder="Ex: Clínica Vida, Consultório Dr. João…"
              value={aparencia.nomeClinica}
              onChange={(e) => setAparencia(a => ({ ...a, nomeClinica: e.target.value }))}
            />
          </div>

          {/* URL do consultório */}
          <div className="cfg-card">
            <h3 className="cfg-card-titulo">URL de acesso</h3>
            <p className="cfg-descricao cfg-descricao-sm">
              Seu link personalizado de acesso ao sistema. Compartilhe com sua equipe.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <span style={{ color: "#9aa0a6", fontSize: 13, whiteSpace: "nowrap" }}>
                {window.location.origin}/
              </span>
              <input
                className="cfg-input cfg-input-inline"
                placeholder="meu-consultorio"
                value={slug}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                  setSlug(val);
                  setSlugErro(val && !slugValido(val) ? "Use apenas letras minúsculas, números e hífen (3–30 caracteres)." : "");
                }}
              />
            </div>
            {slugErro && <p style={{ fontSize: 12, color: "#d93025", margin: "6px 0 0" }}>{slugErro}</p>}
            {slug && !slugErro && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#137333" }}>
                  🔐 Login:
                  <strong>{window.location.origin}/{slug}</strong>
                  <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${slug}`)}
                    style={{ fontSize: 11, padding: "2px 8px", cursor: "pointer", border: "1px solid #dadce0", borderRadius: 4, background: "white", color: "#333" }}>
                    Copiar
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#1a73e8" }}>
                  📅 Agendamento online:
                  <strong>{window.location.origin}/{slug}/agendar</strong>
                  <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${slug}/agendar`)}
                    style={{ fontSize: 11, padding: "2px 8px", cursor: "pointer", border: "1px solid #dadce0", borderRadius: 4, background: "white", color: "#333" }}>
                    Copiar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Logo */}
          <div className="cfg-card">
            <h3 className="cfg-card-titulo">Logo</h3>
            <div className="cfg-logo-area">
              <div className="cfg-logo-atual">
                {(previewLogo || aparencia.logoUrl) ? (
                  <img src={previewLogo || aparencia.logoUrl} alt="Logo atual" className="cfg-logo-preview" />
                ) : (
                  <div className="cfg-logo-placeholder">🧠<span>Sem logo</span></div>
                )}
              </div>
              <div className="cfg-logo-acoes">
                <button className="cfg-btn-primary" onClick={() => logoInputRef.current?.click()}>
                  📁 Escolher imagem
                </button>
                {(previewLogo || aparencia.logoUrl) && (
                  <button className="cfg-btn-sm cfg-btn-danger" onClick={handleRemoverLogo}>
                    Remover logo
                  </button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleLogoChange}
                />
                <p className="cfg-descricao cfg-descricao-sm">PNG, JPG ou SVG. Recomendado: 200×200px.</p>
              </div>
            </div>
          </div>

          {/* Cor da sidebar */}
          <div className="cfg-card">
            <h3 className="cfg-card-titulo">Cor da barra lateral</h3>
            <div className="cfg-cor-selector">
              <div className="cfg-cores-grid">
                {CORES_SIDEBAR.map((c) => (
                  <button
                    key={c}
                    className={`cfg-cor-btn ${aparencia.corSidebar === c ? "ativa" : ""}`}
                    style={{ background: c }}
                    onClick={() => setAparencia(a => ({ ...a, corSidebar: c }))}
                  />
                ))}
              </div>
              <input
                type="color"
                className="cfg-cor-custom"
                value={aparencia.corSidebar}
                onChange={(e) => setAparencia(a => ({ ...a, corSidebar: e.target.value }))}
                title="Cor personalizada"
              />
            </div>
          </div>

          {/* Cor primária */}
          <div className="cfg-card">
            <h3 className="cfg-card-titulo">Cor de destaque (botões e menus ativos)</h3>
            <div className="cfg-cor-selector">
              <div className="cfg-cores-grid">
                {CORES_PRESET.map((c) => (
                  <button
                    key={c}
                    className={`cfg-cor-btn ${aparencia.corPrimaria === c ? "ativa" : ""}`}
                    style={{ background: c }}
                    onClick={() => setAparencia(a => ({ ...a, corPrimaria: c }))}
                  />
                ))}
              </div>
              <input
                type="color"
                className="cfg-cor-custom"
                value={aparencia.corPrimaria}
                onChange={(e) => setAparencia(a => ({ ...a, corPrimaria: e.target.value }))}
                title="Cor personalizada"
              />
            </div>
          </div>

          <button
            className="cfg-btn-primary"
            onClick={handleSalvarAparencia}
            disabled={salvandoAparencia}
            style={{ alignSelf: "flex-start" }}
          >
            {uploadandoLogo ? "Enviando logo…" : salvandoAparencia ? "Salvando…" : "💾 Salvar aparência"}
          </button>
        </div>
      )}

      {/* ═══ ABA HORÁRIOS ═══ */}
      {aba === "horarios" && (
        <div className="cfg-conteudo">
          <p className="cfg-descricao">
            Defina os dias e horários em que seu consultório aceita agendamentos. Apenas esses horários aparecerão na página pública de agendamento.
          </p>

          <div className="cfg-card">
            <h3 className="cfg-card-titulo">Duração padrão da sessão</h3>
            <p className="cfg-descricao-sm">Define o intervalo entre os horários disponíveis para agendamento (cada slot ocupa esse tempo).</p>
            <div className="cfg-intervalo-row">
              {[30, 45, 60, 90, 120].map(min => (
                <button
                  key={min}
                  className={`cfg-intervalo-btn${duracaoSessao === min ? " ativo" : ""}`}
                  onClick={() => setDuracaoSessao(min)}
                >
                  {min >= 60 ? `${min / 60}h` : `${min}min`}
                </button>
              ))}
            </div>
          </div>

          <div className="cfg-card">
            <h3 className="cfg-card-titulo">Intervalo entre sessões</h3>
            <p className="cfg-descricao-sm">Tempo de descanso / preparação reservado automaticamente após cada sessão.</p>
            <div className="cfg-intervalo-row">
              {[0, 10, 15, 20, 30].map(min => (
                <button
                  key={min}
                  className={`cfg-intervalo-btn${intervaloEntreSessoes === min ? " ativo" : ""}`}
                  onClick={() => setIntervaloEntreSessoes(min)}
                >
                  {min === 0 ? "Sem intervalo" : `${min}min`}
                </button>
              ))}
            </div>
          </div>

          <div className="cfg-card">
            <h3 className="cfg-card-titulo">Dias e horários de atendimento</h3>
            <div className="cfg-horarios-lista">
              {DIAS_SEMANA.map((dia, idx) => {
                const h = horarios[idx] || { ativo: false, inicio: "08:00", fim: "18:00" };
                const preview = h.ativo ? gerarHorasIntervalo(h.inicio, h.fim, duracaoSessao) : [];
                return (
                  <div key={idx} className={`cfg-dia-row${h.ativo ? " ativo" : ""}`}>
                    <label className="cfg-dia-toggle">
                      <input
                        type="checkbox"
                        checked={h.ativo}
                        onChange={e => setHorarios(prev => ({ ...prev, [idx]: { ...h, ativo: e.target.checked } }))}
                      />
                      <span className="cfg-dia-nome">{dia}</span>
                    </label>
                    {h.ativo ? (
                      <div className="cfg-dia-horarios">
                        <div className="cfg-dia-range">
                          <label>Das</label>
                          <select
                            value={h.inicio}
                            onChange={e => setHorarios(prev => ({ ...prev, [idx]: { ...h, inicio: e.target.value } }))}
                          >
                            {HORAS_DISPONIVEIS.map(hr => <option key={hr} value={hr}>{hr}</option>)}
                          </select>
                          <label>às</label>
                          <select
                            value={h.fim}
                            onChange={e => setHorarios(prev => ({ ...prev, [idx]: { ...h, fim: e.target.value } }))}
                          >
                            {HORAS_DISPONIVEIS.filter(hr => hr > h.inicio).map(hr => <option key={hr} value={hr}>{hr}</option>)}
                          </select>
                        </div>
                        {preview.length > 0 && (
                          <div className="cfg-dia-slots">
                            {preview.map(sl => <span key={sl} className="cfg-slot">{sl}</span>)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="cfg-dia-fechado">Fechado</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {horariosSalvos && <div className="cfg-success">✅ Horários salvos!</div>}
          <button
            className="cfg-btn-primary"
            onClick={handleSalvarHorarios}
            disabled={salvandoHorarios}
            style={{ alignSelf: "flex-start" }}
          >
            {salvandoHorarios ? "Salvando…" : "💾 Salvar horários"}
          </button>
        </div>
      )}
    </div>
  );
}
