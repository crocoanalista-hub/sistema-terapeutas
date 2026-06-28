import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { buscarWorkspacePorSlug } from "../services/slugService";
import { buscarConfiguracoes } from "../services/configuracoesService";
import { login } from "../services/authService";
import { useAuth } from "../hooks/useAuth";
import "../styles/auth.css";
import "../styles/workspace-entrada.css";

const WorkspaceEntrada = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [workspace, setWorkspace] = useState(null);
  const [config, setConfig] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [fazendoLogin, setFazendoLogin] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      navigate("/dashboard");
      return;
    }
    buscarWorkspacePorSlug(slug)
      .then(async (ws) => {
        if (!ws) { setNaoEncontrado(true); return; }
        setWorkspace(ws);
        const cfg = await buscarConfiguracoes(ws.id).catch(() => ({}));
        setConfig(cfg);
        // Aplicar tema
        const r = document.documentElement;
        r.style.setProperty("--cor-sidebar", cfg.corSidebar || "#1a2535");
        r.style.setProperty("--cor-primaria", cfg.corPrimaria || "#1a73e8");
      })
      .finally(() => setCarregando(false));
  }, [slug, user, authLoading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");
    setFazendoLogin(true);
    try {
      await login(email, senha);
      navigate("/dashboard");
    } catch {
      setErro("E-mail ou senha incorretos.");
    } finally {
      setFazendoLogin(false);
    }
  };

  if (carregando || authLoading) {
    return <div className="carregando">Carregando...</div>;
  }

  if (naoEncontrado) {
    return (
      <div className="we-not-found">
        <div className="we-not-found-box">
          <div className="we-not-found-icon">🔍</div>
          <h2>Workspace não encontrado</h2>
          <p>O endereço <strong>/{slug}</strong> não corresponde a nenhum consultório cadastrado.</p>
          <button onClick={() => navigate("/login")} className="we-btn-voltar">
            Ir para o login geral
          </button>
        </div>
      </div>
    );
  }

  const corPrimaria = config.corPrimaria || "#1a73e8";
  const corSidebar = config.corSidebar || "#1a2535";

  return (
    <div className="we-container">
      {/* Faixa lateral com a cor da clínica */}
      <div className="we-sidebar" style={{ background: corSidebar }}>
        <div className="we-sidebar-inner">
          {config.logoUrl ? (
            <img src={config.logoUrl} alt="Logo" className="we-logo-img" />
          ) : (
            <div className="we-logo-emoji">🧠</div>
          )}
          <h1 className="we-clinica-nome">{config.nomeClinica || workspace.nome || "Consultório"}</h1>
          <p className="we-clinica-sub">Área exclusiva</p>
        </div>
      </div>

      {/* Formulário de login */}
      <div className="we-form-area">
        <div className="we-form-box">
          <h2 className="we-form-titulo">Entrar</h2>
          <p className="we-form-sub">Acesse com sua conta cadastrada</p>

          {erro && <div className="erro-message">{erro}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Senha</label>
              <input
                type="password"
                placeholder="Sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={fazendoLogin}
              className="btn-login"
              style={{ background: corPrimaria }}
            >
              {fazendoLogin ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceEntrada;
