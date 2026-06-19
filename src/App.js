import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

// Páginas
import Login from "./pages/Login";
import ListaPacientes from "./pages/Pacientes/ListaPacientes";
import CadastrarPaciente from "./pages/Pacientes/CadastrarPaciente";
import EditarPaciente from "./pages/Pacientes/EditarPaciente";
import DetalhePaciente from "./pages/Pacientes/DetalhePaciente";
import MarcarSessao from "./pages/Agenda/MarcarSessao";
import CalendarioAgenda from "./pages/Agenda/CalendarioAgenda";
import HistoricoAtendimentos from "./pages/Agenda/HistoricoAtendimentos";
import Dashboard from "./pages/Dashboard";

import "./App.css";

// Componente para proteger rotas (apenas usuários autenticados)
const RotaProtegida = ({ element, loading, user }) => {
  if (loading) {
    return <div className="carregando">Carregando...</div>;
  }
  return user ? element : <Navigate to="/login" />;
};

function App() {
  const { user, loading } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Rotas públicas */}
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" /> : <Login />}
        />

        {/* Rotas protegidas */}
        <Route
          path="/dashboard"
          element={
            <RotaProtegida element={<Dashboard />} loading={loading} user={user} />
          }
        />

        {/* Rotas de Pacientes */}
        <Route
          path="/pacientes"
          element={
            <RotaProtegida element={<ListaPacientes />} loading={loading} user={user} />
          }
        />
        <Route
          path="/pacientes/novo"
          element={
            <RotaProtegida element={<CadastrarPaciente />} loading={loading} user={user} />
          }
        />
        <Route
          path="/pacientes/:id"
          element={
            <RotaProtegida element={<DetalhePaciente />} loading={loading} user={user} />
          }
        />
        <Route
          path="/pacientes/:id/editar"
          element={
            <RotaProtegida element={<EditarPaciente />} loading={loading} user={user} />
          }
        />

        {/* Rotas de Agenda */}
        <Route
          path="/agenda"
          element={
            <RotaProtegida element={<CalendarioAgenda />} loading={loading} user={user} />
          }
        />
        <Route
          path="/agenda/marcar"
          element={
            <RotaProtegida element={<MarcarSessao />} loading={loading} user={user} />
          }
        />
        <Route
          path="/historico"
          element={
            <RotaProtegida element={<HistoricoAtendimentos />} loading={loading} user={user} />
          }
        />

        {/* Rota padrão */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;