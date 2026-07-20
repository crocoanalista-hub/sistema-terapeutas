import React, { useState } from "react";
import { Link } from "react-router-dom";
import { redefinirSenha } from "../services/authService";
import "../styles/auth.css";

const EsqueciSenha = () => {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro("");
    try {
      await redefinirSenha(email);
      setEnviado(true);
    } catch (err) {
      const code = err.code || err.message || "";
      if (code.includes("user-not-found") || code.includes("invalid-email")) {
        setErro("E-mail não encontrado. Verifique o endereço digitado.");
      } else {
        setErro("Erro ao enviar e-mail. Tente novamente.");
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Redefinir Senha</h1>

        {enviado ? (
          <>
            <p style={{ color: "#34a853", fontWeight: 600, marginBottom: 8 }}>
              ✅ E-mail enviado!
            </p>
            <p style={{ color: "#5f6368", fontSize: 14 }}>
              Verifique sua caixa de entrada (e o spam) para o link de redefinição de senha.
            </p>
            <div className="login-footer" style={{ marginTop: 24 }}>
              <Link to="/login">← Voltar para o login</Link>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: "#5f6368", fontSize: 14, marginBottom: 20 }}>
              Digite seu e-mail e enviaremos um link para você criar uma nova senha.
            </p>

            {erro && <div className="erro-message">{erro}</div>}

            <form onSubmit={handleSubmit}>
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

              <button type="submit" disabled={carregando} className="btn-login">
                {carregando ? "Enviando..." : "Enviar link de redefinição"}
              </button>
            </form>

            <div className="login-footer">
              <Link to="/login">← Voltar para o login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EsqueciSenha;
