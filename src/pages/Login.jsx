import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/authService";
import "../styles/auth.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro("");

    try {
      await login(email, senha);
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
        <h1>Sistema de Consultório</h1>
        <p>Acesso para Terapeutas</p>

        {erro && <div className="erro-message">{erro}</div>}

        <form onSubmit={handleLogin}>
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
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={carregando} className="btn-login">
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Não tem conta? <Link to="/registro">Registre-se aqui</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
