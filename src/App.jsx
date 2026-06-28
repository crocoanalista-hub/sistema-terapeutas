import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

import Login from "./pages/Login";
import Registro from "./pages/Registro";
import WorkspaceEntrada from "./pages/WorkspaceEntrada";
import Admin from "./pages/Admin/Admin";
import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import ListaPacientes from "./pages/Pacientes/ListaPacientes";
import CadastrarPaciente from "./pages/Pacientes/CadastrarPaciente";
import EditarPaciente from "./pages/Pacientes/EditarPaciente";
import DetalhePaciente from "./pages/Pacientes/DetalhePaciente";
import EvolucaoPaciente from "./pages/Pacientes/EvolucaoPaciente";
import Anamnese from "./pages/Pacientes/Anamnese";

import MarcarSessao from "./pages/Agenda/MarcarSessao";
import CalendarioAgenda from "./pages/Agenda/CalendarioAgenda";
import ListaEspera from "./pages/Agenda/ListaEspera";
import HistoricoAtendimentos from "./pages/Agenda/HistoricoAtendimentos";
import AgendamentoPublico from "./pages/Agenda/AgendamentoPublico";
import AssinarDocumento from "./pages/Documentos/AssinarDocumento";

import Financeiro from "./pages/Financeiro/Financeiro";
import Documentos from "./pages/Documentos/Documentos";
import Configuracoes from "./pages/Configuracoes/Configuracoes";

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
        {/* Públicas */}
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/registro" element={user ? <Navigate to="/dashboard" /> : <Registro />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<RotaProtegida element={<Dashboard />} loading={loading} user={user} />} />

        {/* Pacientes */}
        <Route path="/pacientes" element={<RotaProtegida element={<ListaPacientes />} loading={loading} user={user} />} />
        <Route path="/pacientes/novo" element={<RotaProtegida element={<CadastrarPaciente />} loading={loading} user={user} />} />
        <Route path="/pacientes/:id" element={<RotaProtegida element={<DetalhePaciente />} loading={loading} user={user} />} />
        <Route path="/pacientes/:id/editar" element={<RotaProtegida element={<EditarPaciente />} loading={loading} user={user} />} />
        <Route path="/pacientes/:id/evolucao" element={<RotaProtegida element={<EvolucaoPaciente />} loading={loading} user={user} />} />
        <Route path="/pacientes/:id/anamnese" element={<RotaProtegida element={<Anamnese />} loading={loading} user={user} />} />

        {/* Agenda */}
        <Route path="/agenda" element={<RotaProtegida element={<CalendarioAgenda />} loading={loading} user={user} />} />
        <Route path="/agenda/marcar" element={<RotaProtegida element={<MarcarSessao />} loading={loading} user={user} />} />
        <Route path="/agenda/lista-espera" element={<RotaProtegida element={<ListaEspera />} loading={loading} user={user} />} />
        <Route path="/historico" element={<RotaProtegida element={<HistoricoAtendimentos />} loading={loading} user={user} />} />

        {/* Financeiro */}
        <Route path="/financeiro" element={<RotaProtegida element={<Financeiro />} loading={loading} user={user} />} />

        {/* Documentos */}
        <Route path="/documentos" element={<RotaProtegida element={<Documentos />} loading={loading} user={user} />} />

        {/* Configurações */}
        <Route path="/configuracoes" element={<RotaProtegida element={<Configuracoes />} loading={loading} user={user} />} />

        {/* Admin — sem Layout (página própria) */}
        <Route path="/admin" element={<Admin />} />

        {/* Agendamento público do paciente */}
        <Route path="/:slug/agendar" element={<AgendamentoPublico />} />

        {/* Assinatura digital pública */}
        <Route path="/:slug/assinar/:docId" element={<AssinarDocumento />} />

        {/* Entrada brandada por workspace */}
        <Route path="/:slug" element={<WorkspaceEntrada />} />

        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
