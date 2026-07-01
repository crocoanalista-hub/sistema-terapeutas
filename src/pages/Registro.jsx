import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "../services/firebaseConfig";
import { registrarTerapeuta } from "../services/authService";
import { buscarConvitePorToken } from "../services/profissionaisService";
import { verificarSlugDisponivel, slugValido } from "../services/slugService";
import "../styles/auth.css";

const Registro = () => {
  const [searchParams] = useSearchParams();
  const conviteToken = searchParams.get("convite");

  const [convite, setConvite] = useState(null);
  const [conviteCarregando, setConviteCarregando] = useState(!!conviteToken);
  const [conviteInvalido, setConviteInvalido] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [slug, setSlug] = useState("");
  const [slugErro, setSlugErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  // Carrega convite se vier token na URL
  useEffect(() => {
    if (!conviteToken) return;
    buscarConvitePorToken(conviteToken)
      .then(c => {
        if (!c) { setConviteInvalido(true); return; }
        setConvite(c);
        setNome(c.nome);
      })
      .catch(() => setConviteInvalido(true))
      .finally(() => setConviteCarregando(false));
  }, [conviteToken]);

  const handleSlugChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(val);
    setSlugErro(val && !slugValido(val)
      ? "Use apenas letras minúsculas, números e hífen (3–30 caracteres)."
      : "");
  };

  // Registro como PROFISSIONAL (vindo de convite)
  const registrarProfissional = async () => {
    const user = await createUserWithEmailAndPassword(auth, email, senha);
    await setDoc(doc(db, "profissionais", user.user.uid), {
      uid: user.user.uid,
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      especialidade: convite.especialidade || "",
      cor: convite.cor || "#9c27b0",
      workspaceId: convite.workspaceId,
      ativo: true,
      dataCriacao: new Date(),
      perfil: "profissional",
    });
    // Remove o convite após uso
    await deleteDoc(doc(db, "convites", conviteToken));
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    setErro("");

    if (senha !== confirmarSenha) { setErro("As senhas não coincidem."); return; }
    if (senha.length < 6) { setErro("A senha deve ter pelo menos 6 caracteres."); return; }

    if (!convite) {
      // Fluxo normal — novo terapeuta/titular
      if (slug && !slugValido(slug)) { setErro("URL inválida."); return; }
      if (slug) {
        const disponivel = await verificarSlugDisponivel(slug);
        if (!disponivel) { setErro("Essa URL já está em uso. Escolha outra."); return; }
      }
    }

    setCarregando(true);
    try {
      if (convite) {
        await registrarProfissional();
      } else {
        await registrarTerapeuta(email, senha, nome, slug);
      }
      navigate("/dashboard");
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  // Estado de carregando convite
  if (conviteCarregando) {
    return (
      <div className="login-container">
        <div className="login-box">
          <p style={{ textAlign: "center", color: "#666" }}>Verificando link de acesso…</p>
        </div>
      </div>
    );
  }

  // Link inválido ou expirado
  if (conviteInvalido) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2 style={{ color: "#d93025" }}>Link inválido</h2>
          <p>Este link de acesso não existe ou já foi utilizado. Solicite um novo link ao responsável pelo espaço.</p>
          <Link to="/login">← Voltar ao login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        {convite ? (
          <>
            <h1>Criar sua conta</h1>
            <div className="registro-convite-badge">
              🔗 Você foi adicionado como <strong>{convite.especialidade || "profissional"}</strong>
              {convite.especialidade ? "" : ""} neste espaço. Crie sua senha para entrar.
            </div>
          </>
        ) : (
          <>
            <h1>Criar Conta</h1>
            <p>Cadastro para Terapeutas</p>
          </>
        )}

        {erro && <div className="erro-message">{erro}</div>}

        <form onSubmit={handleRegistro}>
          <div className="form-group">
            <label htmlFor="nome">Nome completo:</label>
            <input
              type="text"
              id="nome"
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>

          {/* URL do consultório — só para titulares */}
          {!convite && (
            <div className="form-group">
              <label htmlFor="slug">URL do seu consultório: <span style={{ fontWeight: 400, color: "#9aa0a6" }}>(opcional)</span></label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#9aa0a6", fontSize: 13, whiteSpace: "nowrap" }}>seusite.com/</span>
                <input
                  type="text"
                  id="slug"
                  placeholder="meu-consultorio"
                  value={slug}
                  onChange={handleSlugChange}
                  style={{ flex: 1 }}
                />
              </div>
              {slugErro && <span style={{ fontSize: 12, color: "#d93025" }}>{slugErro}</span>}
              {slug && !slugErro && (
                <span style={{ fontSize: 12, color: "#137333" }}>✓ Seu link: <strong>/{slug}</strong></span>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">E-mail:</label>
            <input
              type="email"
              id="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="senha">Senha:</label>
            <input
              type="password"
              id="senha"
              placeholder="Mínimo 6 caracteres"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmarSenha">Confirmar senha:</label>
            <input
              type="password"
              id="confirmarSenha"
              placeholder="Repita a senha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={carregando} className="btn-login">
            {carregando ? "Criando conta..." : convite ? "Entrar no espaço" : "Criar Conta"}
          </button>
        </form>

        {!convite && (
          <div className="login-footer">
            <p>Já tem conta? <Link to="/login">Entrar aqui</Link></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Registro;
