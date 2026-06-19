import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { logout } from "../services/authService";

const Dashboard = () => {
  const { terapeuta } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div style={{ padding: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <h1>Bem-vindo, {terapeuta?.nome || "Terapeuta"}! 👋</h1>
        <button onClick={handleLogout} style={{
          padding: "10px 20px",
          backgroundColor: "#e74c3c",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}>
          Sair
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
        
        {/* Card Pacientes */}
        <div style={{
          backgroundColor: "#3498db",
          padding: "30px",
          borderRadius: "8px",
          color: "white",
          cursor: "pointer",
          textAlign: "center"
        }} onClick={() => navigate("/pacientes")}>
          <h3>📋 Pacientes</h3>
          <p style={{ fontSize: "14px", margin: "10px 0 0 0" }}>Gerenciar pacientes</p>
        </div>

        {/* Card Nova Sessão */}
        <div style={{
          backgroundColor: "#27ae60",
          padding: "30px",
          borderRadius: "8px",
          color: "white",
          cursor: "pointer",
          textAlign: "center"
        }} onClick={() => navigate("/agenda/marcar")}>
          <h3>📅 Nova Sessão</h3>
          <p style={{ fontSize: "14px", margin: "10px 0 0 0" }}>Agendar atendimento</p>
        </div>

        {/* Card Agenda */}
        <div style={{
          backgroundColor: "#f39c12",
          padding: "30px",
          borderRadius: "8px",
          color: "white",
          cursor: "pointer",
          textAlign: "center"
        }} onClick={() => navigate("/agenda")}>
          <h3>🗓️ Minha Agenda</h3>
          <p style={{ fontSize: "14px", margin: "10px 0 0 0" }}>Ver agendamentos</p>
        </div>

        {/* Card Histórico */}
        <div style={{
          backgroundColor: "#9b59b6",
          padding: "30px",
          borderRadius: "8px",
          color: "white",
          cursor: "pointer",
          textAlign: "center"
        }} onClick={() => navigate("/historico")}>
          <h3>📊 Histórico</h3>
          <p style={{ fontSize: "14px", margin: "10px 0 0 0" }}>Sessões concluídas</p>
        </div>

      </div>

      <div style={{ marginTop: "40px", padding: "20px", backgroundColor: "#ecf0f1", borderRadius: "8px" }}>
        <h3>📌 Próximas Funcionalidades</h3>
        <ul>
          <li>Cadastro de pacientes ✅</li>
          <li>Agendamento de sessões ✅</li>
          <li>Calendário de agenda (em desenvolvimento)</li>
          <li>Histórico de atendimentos (em desenvolvimento)</li>
          <li>Relatórios e estatísticas</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
