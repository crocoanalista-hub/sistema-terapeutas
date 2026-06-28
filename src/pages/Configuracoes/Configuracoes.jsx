import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  criarSala, listarSalas, atualizarSala, excluirSala,
} from "../../services/salasService";
import {
  convidarProfissional, listarProfissionais, listarConvitesPendentes,
  desativarProfissional, deletarConvite, atualizarProfissional,
} from "../../services/profissionaisService";
import {
  buscarConfiguracoes, salvarConfiguracoes, uploadLogo,
} from "../../services/configuracoesService";
import { useConfiguracoes } from "../../hooks/useConfiguracoes";
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
  const [novoProf, setNovoProf] = useState({ nome: "", email: "", especialidade: "", cor: "#9c27b0" });
  const [mostrarFormProf, setMostrarFormProf] = useState(false);
  const [editandoProf, setEditandoProf] = useState(null);
  const [salvandoProf, setSalvandoProf] = useState(false);
  const [linkRegistro] = useState(`${window.location.origin}/registro`);

  useEffect(() => {
    if (!workspaceId) return;
    carregarSalas();
    carregarProfissionais();
    buscarConfiguracoes(workspaceId).then(cfg => {
      setAparencia(a => ({ ...a, ...cfg }));
    }).catch(() => {});
  }, [workspaceId]);

  // Sincroniza estado local quando config global muda
  useEffect(() => {
    if (configAtual) setAparencia(a => ({ ...a, ...configAtual }));
  }, [configAtual]);

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
    if (!novoProf.nome.trim() || !novoProf.email.trim()) return;
    setSalvandoProf(true);
    try {
      await convidarProfissional(workspaceId, novoProf);
      setNovoProf({ nome: "", email: "", especialidade: "", cor: "#9c27b0" });
      setMostrarFormProf(false);
      await carregarProfissionais();
    } catch (e) { alert("Erro ao convidar: " + e.message); }
    setSalvandoProf(false);
  };

  const handleDesativar = async (id, nome) => {
    if (!window.confirm(`Desativar ${nome}? Ele não poderá mais acessar o sistema.`)) return;
    await desativarProfissional(id);
    await carregarProfissionais();
  };

  const handleCancelarConvite = async (email) => {
    if (!window.confirm("Cancelar convite para " + email + "?")) return;
    await deletarConvite(email);
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

  const copiarLink = () => {
    navigator.clipboard.writeText(linkRegistro);
    alert("Link copiado!");
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

          {/* Link de registro */}
          <div className="cfg-link-box">
            <span className="cfg-link-label">Link de cadastro:</span>
            <code className="cfg-link-url">{linkRegistro}</code>
            <button className="cfg-btn-sm" onClick={copiarLink}>Copiar</button>
          </div>

          {/* Form convidar */}
          {!mostrarFormProf ? (
            <button className="cfg-btn-primary" onClick={() => setMostrarFormProf(true)}>
              + Convidar Profissional
            </button>
          ) : (
            <div className="cfg-card">
              <h3 className="cfg-card-titulo">Novo profissional</h3>
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
                    <label className="cfg-label">E-mail *</label>
                    <input
                      className="cfg-input"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={novoProf.email}
                      onChange={(e) => setNovoProf({ ...novoProf, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="cfg-form-row">
                  <div className="cfg-form-group">
                    <label className="cfg-label">Especialidade</label>
                    <input
                      className="cfg-input"
                      placeholder="Ex: Psicólogo, Terapeuta…"
                      value={novoProf.especialidade}
                      onChange={(e) => setNovoProf({ ...novoProf, especialidade: e.target.value })}
                    />
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
                </div>
                <div className="cfg-form-acoes">
                  <button
                    className="cfg-btn-primary"
                    onClick={handleConvidar}
                    disabled={!novoProf.nome.trim() || !novoProf.email.trim() || salvandoProf}
                  >
                    {salvandoProf ? "Salvando…" : "Salvar convite"}
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

          {/* Convites pendentes */}
          {convitesPendentes.length > 0 && (
            <div className="cfg-lista">
              <h3 className="cfg-lista-titulo">Convites pendentes</h3>
              <p className="cfg-descricao cfg-descricao-sm">
                Aguardando que o profissional crie uma conta com o e-mail abaixo.
              </p>
              {convitesPendentes.map((c) => (
                <div key={c.id} className="cfg-item cfg-item-pendente">
                  <div className="cfg-item-cor" style={{ background: c.cor || "#9c27b0", opacity: 0.5 }} />
                  <div className="cfg-item-info">
                    <span className="cfg-item-nome">{c.nome}</span>
                    <span className="cfg-item-sub">{c.email}</span>
                    {c.especialidade && <span className="cfg-item-sub">{c.especialidade}</span>}
                  </div>
                  <span className="cfg-badge-pendente">Aguardando cadastro</span>
                  <div className="cfg-item-acoes">
                    <button className="cfg-btn-sm cfg-btn-danger" onClick={() => handleCancelarConvite(c.email)}>Cancelar</button>
                  </div>
                </div>
              ))}
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
    </div>
  );
}
