import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ListaPacientes from "./pages/Pacientes/ListaPacientes";
import CadastrarPaciente from "./pages/Pacientes/CadastrarPaciente";
import EditarPaciente from "./pages/Pacientes/EditarPaciente";
import DetalhePaciente from "./pages/Pacientes/DetalhePaciente";
import MarcarSessao from "./pages/Agenda/MarcarSessao";
import CalendarioAgenda from "./pages/Agenda/CalendarioAgenda";
import HistoricoAtendimentos from "./pages/Agenda/HistoricoAtendimentos";

import "./App.css";

const RotaProtegida = ({ element, loading, user }) => {
  if (loading) return <div className="carregando">Carregando...</div>;
  return user ? <Layout>{element}</Layout> : <Navigate to="/login" />;
};

function App() {
  const { user, loading } = useAuth();

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" /> : <Login />}
        />

        <Route
          path="/dashboard"
          element={<RotaProtegida element={<Dashboard />} loading={loading} user={user} />}
        />

        <Route
          path="/pacientes"
          element={<RotaProtegida element={<ListaPacientes />} loading={loading} user={user} />}
        />
        <Route
          path="/pacientes/novo"
          element={<RotaProtegida element={<CadastrarPaciente />} loading={loading} user={user} />}
        />
        <Route
          path="/pacientes/:id"
          element={<RotaProtegida element={<DetalhePaciente />} loading={loading} user={user} />}
        />
        <Route
          path="/pacientes/:id/editar"
          element={<RotaProtegida element={<EditarPaciente />} loading={loading} user={user} />}
        />

        <Route
          path="/agenda"
          element={<RotaProtegida element={<CalendarioAgenda />} loading={loading} user={user} />}
        />
        <Route
          path="/agenda/marcar"
          element={<RotaProtegida element={<MarcarSessao />} loading={loading} user={user} />}
        />
        <Route
          path="/historico"
          element={<RotaProtegida element={<HistoricoAtendimentos />} loading={loading} user={user} />}
        />

        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
