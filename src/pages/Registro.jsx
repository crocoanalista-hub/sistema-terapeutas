import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registrarTerapeuta } from "../services/authService";
import { verificarSlugDisponivel, slugValido } from "../services/slugService";
import "../styles/auth.css";

const Registro = () => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [slug, setSlug] = useState("");
  const [slugErro, setSlugErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  const handleSlugChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(val);
    if (val && !slugValido(val)) {
      setSlugErro("Use apenas letras minúsculas, números e hífen (3–30 caracteres).");
    } else {
      setSlugErro("");
    }
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    setErro("");

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (slug && !slugValido(slug)) {
      setErro("URL inválida. Use apenas letras minúsculas, números e hífen.");
      return;
    }
    if (slug) {
      const disponivel = await verificarSlugDisponivel(slug);
      if (!disponivel) {
        setErro("Essa URL já está em uso. Escolha outra.");
        return;
      }
    }

    setCarregando(true);
    try {
      await registrarTerapeuta(email, senha, nome, slug);
      navigate("/dashboard");
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Criar Conta</h1>
        <p>Cadastro para Terapeutas</p>

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

          <div className="form-group">
            <label htmlFor="slug">URL do seu consultório: <span style={{fontWeight:400,color:"#9aa0a6"}}>(opcional)</span></label>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{color:"#9aa0a6",fontSize:13,whiteSpace:"nowrap"}}>seusite.com/</span>
              <input
                type="text"
                id="slug"
                placeholder="meu-consultorio"
                value={slug}
                onChange={handleSlugChange}
                style={{flex:1}}
              />
            </div>
            {slugErro && <span style={{fontSize:12,color:"#d93025"}}>{slugErro}</span>}
            {slug && !slugErro && (
              <span style={{fontSize:12,color:"#137333"}}>✓ Seu link: <strong>/{slug}</strong></span>
            )}
          </div>

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
            {carregando ? "Criando conta..." : "Criar Conta"}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Já tem conta? <Link to="/login">Entrar aqui</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Registro;
