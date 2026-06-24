import React, { useState, useEffect } from "react";
import { listarPacientes } from "../../services/pacientesService";
import { buscarAnamnese } from "../../services/anamneseService";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/documentos.css";

const DOCS = [
  { key: "contrato", label: "Contrato Terapêutico" },
  { key: "lgpd", label: "Termo LGPD" },
  { key: "consentimento", label: "Termo de Consentimento" },
  { key: "comparecimento", label: "Declaração de Comparecimento" },
  { key: "anamnese", label: "Anamnese (Impressão)" },
];

const Documentos = () => {
  const { user, terapeuta } = useAuth();
  const [docAtivo, setDocAtivo] = useState("contrato");
  const [pacientes, setPacientes] = useState([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState("");
  const [anamnese, setAnamnese] = useState(null);
  const [dados, setDados] = useState({
    valorSessao: "",
    frequencia: "semanalmente",
    duracaoSessao: "50",
    localAtendimento: "presencial",
    dataContrato: new Date().toISOString().slice(0, 10),
    dataComparecimento: new Date().toISOString().slice(0, 10),
    horaComparecimento: "",
    motivoComparecimento: "consulta de psicoterapia",
  });

  useEffect(() => {
    if (user) listarPacientes(user.uid).then(setPacientes).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (pacienteSelecionado && docAtivo === "anamnese") {
      buscarAnamnese(pacienteSelecionado).then(setAnamnese).catch(() => setAnamnese(null));
    }
  }, [pacienteSelecionado, docAtivo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDados((p) => ({ ...p, [name]: value }));
  };

  const pac = pacientes.find((p) => p.id === pacienteSelecionado);
  const nomeTerapeuta = terapeuta?.nome || "[Nome do Terapeuta]";
  const nomePaciente = pac?.nome || "[Nome do Paciente]";
  const hoje = new Date().toLocaleDateString("pt-BR");

  const imprimir = () => window.print();

  // ===== DOCUMENTOS =====

  const renderContrato = () => (
    <div className="doc-conteudo">
      <h2 className="doc-titulo-print">CONTRATO DE PRESTAÇÃO DE SERVIÇOS PSICOTERAPÊUTICOS</h2>
      <p className="doc-paragrafo">
        As partes abaixo qualificadas celebram o presente contrato de prestação de serviços
        psicoterapêuticos, que se regerá pelas seguintes cláusulas:
      </p>
      <p className="doc-paragrafo">
        <strong>TERAPEUTA:</strong> {nomeTerapeuta}
      </p>
      <p className="doc-paragrafo">
        <strong>PACIENTE/CLIENTE:</strong> {nomePaciente}
      </p>

      <h4 className="doc-clausula">1. DO SERVIÇO</h4>
      <p className="doc-paragrafo">
        O(A) Terapeuta prestará serviços de psicoterapia ao(à) Paciente, com sessões de{" "}
        <strong>{dados.duracaoSessao} minutos</strong>, realizadas{" "}
        <strong>{dados.frequencia}</strong>, na modalidade{" "}
        <strong>{dados.localAtendimento}</strong>.
      </p>

      <h4 className="doc-clausula">2. DOS HONORÁRIOS</h4>
      <p className="doc-paragrafo">
        O valor de cada sessão é de{" "}
        <strong>
          R$ {dados.valorSessao || "___________"}/sessão
        </strong>
        , a ser pago no dia do atendimento ou conforme acordado entre as partes.
      </p>

      <h4 className="doc-clausula">3. DO CANCELAMENTO</h4>
      <p className="doc-paragrafo">
        O cancelamento de sessão deverá ser comunicado com antecedência mínima de 24 horas.
        Sessões canceladas sem aviso prévio poderão ser cobradas integralmente.
      </p>

      <h4 className="doc-clausula">4. DA CONFIDENCIALIDADE</h4>
      <p className="doc-paragrafo">
        O(A) Terapeuta se compromete a manter sigilo sobre todas as informações compartilhadas
        durante as sessões, em conformidade com o Código de Ética profissional e a Lei
        Geral de Proteção de Dados (LGPD – Lei 13.709/2018), exceto nos casos previstos em lei.
      </p>

      <h4 className="doc-clausula">5. DAS DISPOSIÇÕES GERAIS</h4>
      <p className="doc-paragrafo">
        O presente contrato tem validade por tempo indeterminado, podendo ser rescindido por
        qualquer das partes mediante comunicação prévia.
      </p>

      <div className="doc-assinaturas">
        <div className="doc-assinatura-bloco">
          <div className="doc-linha-assinatura" />
          <p>{nomeTerapeuta}</p>
          <p>Terapeuta</p>
        </div>
        <div className="doc-assinatura-bloco">
          <div className="doc-linha-assinatura" />
          <p>{nomePaciente}</p>
          <p>Paciente/Cliente</p>
        </div>
      </div>
      <p className="doc-data-local">{dados.dataContrato ? new Date(dados.dataContrato + "T00:00").toLocaleDateString("pt-BR") : hoje}</p>
    </div>
  );

  const renderLGPD = () => (
    <div className="doc-conteudo">
      <h2 className="doc-titulo-print">TERMO DE CONSENTIMENTO PARA TRATAMENTO DE DADOS PESSOAIS (LGPD)</h2>
      <p className="doc-paragrafo"><strong>Responsável pelo tratamento:</strong> {nomeTerapeuta}</p>
      <p className="doc-paragrafo"><strong>Titular dos dados:</strong> {nomePaciente}</p>

      <h4 className="doc-clausula">1. Finalidade do Tratamento</h4>
      <p className="doc-paragrafo">
        Os dados pessoais e de saúde coletados têm como finalidade exclusiva a prestação de
        serviços psicoterapêuticos, incluindo anamnese, registro de evolução clínica, agendamento
        de sessões e comunicação com o(a) paciente.
      </p>

      <h4 className="doc-clausula">2. Dados Coletados</h4>
      <p className="doc-paragrafo">
        Nome completo, data de nascimento, telefone, e-mail, informações de saúde física e
        mental, histórico familiar e demais dados necessários ao atendimento clínico.
      </p>

      <h4 className="doc-clausula">3. Armazenamento e Segurança</h4>
      <p className="doc-paragrafo">
        Os dados são armazenados em sistema seguro, com acesso restrito ao(à) terapeuta
        responsável. Não são compartilhados com terceiros, exceto por obrigação legal.
      </p>

      <h4 className="doc-clausula">4. Direitos do Titular</h4>
      <p className="doc-paragrafo">
        O(A) paciente pode, a qualquer momento: (a) solicitar acesso aos seus dados; (b)
        solicitar correção de dados incorretos; (c) solicitar a exclusão dos dados, ressalvado
        o prazo legal de guarda do prontuário.
      </p>

      <h4 className="doc-clausula">5. Consentimento</h4>
      <p className="doc-paragrafo">
        Ao assinar este termo, o(a) titular consente expressamente com o tratamento de seus dados
        pessoais e de saúde para as finalidades descritas acima, nos termos da Lei 13.709/2018.
      </p>

      <div className="doc-assinaturas">
        <div className="doc-assinatura-bloco">
          <div className="doc-linha-assinatura" />
          <p>{nomeTerapeuta}</p>
          <p>Responsável pelo Tratamento</p>
        </div>
        <div className="doc-assinatura-bloco">
          <div className="doc-linha-assinatura" />
          <p>{nomePaciente}</p>
          <p>Titular dos Dados</p>
        </div>
      </div>
      <p className="doc-data-local">{hoje}</p>
    </div>
  );

  const renderConsentimento = () => (
    <div className="doc-conteudo">
      <h2 className="doc-titulo-print">TERMO DE CONSENTIMENTO INFORMADO</h2>
      <p className="doc-paragrafo"><strong>Terapeuta:</strong> {nomeTerapeuta}</p>
      <p className="doc-paragrafo"><strong>Paciente:</strong> {nomePaciente}</p>

      <p className="doc-paragrafo">
        Declaro que fui devidamente informado(a) sobre o processo psicoterápico, incluindo:
      </p>
      <ul className="doc-lista">
        <li>A natureza e os objetivos do tratamento psicoterápico;</li>
        <li>Os possíveis benefícios e limitações da psicoterapia;</li>
        <li>A duração estimada do tratamento e a frequência das sessões;</li>
        <li>Os honorários e as condições de cancelamento;</li>
        <li>O dever de sigilo do(a) terapeuta e suas exceções legais;</li>
        <li>Meu direito de interromper o tratamento a qualquer momento.</li>
      </ul>

      <p className="doc-paragrafo">
        Tendo compreendido as informações acima, consinto livremente em iniciar o processo
        psicoterápico com o(a) terapeuta {nomeTerapeuta}.
      </p>

      <div className="doc-assinaturas">
        <div className="doc-assinatura-bloco">
          <div className="doc-linha-assinatura" />
          <p>{nomeTerapeuta}</p>
          <p>Terapeuta</p>
        </div>
        <div className="doc-assinatura-bloco">
          <div className="doc-linha-assinatura" />
          <p>{nomePaciente}</p>
          <p>Paciente</p>
        </div>
      </div>
      <p className="doc-data-local">{hoje}</p>
    </div>
  );

  const renderComparecimento = () => (
    <div className="doc-conteudo">
      <h2 className="doc-titulo-print">DECLARAÇÃO DE COMPARECIMENTO</h2>
      <p className="doc-paragrafo">
        Declaro para os devidos fins que o(a) Sr.(a) <strong>{nomePaciente}</strong> compareceu
        a atendimento de {dados.motivoComparecimento} no dia{" "}
        <strong>
          {dados.dataComparecimento
            ? new Date(dados.dataComparecimento + "T00:00").toLocaleDateString("pt-BR")
            : "___/___/______"}
        </strong>
        {dados.horaComparecimento && (
          <>, às <strong>{dados.horaComparecimento}</strong></>
        )}
        , sob responsabilidade do(a) profissional {nomeTerapeuta}.
      </p>
      <p className="doc-paragrafo">
        Por ser verdade, firmo a presente declaração.
      </p>

      <div className="doc-assinaturas" style={{ marginTop: "60px" }}>
        <div className="doc-assinatura-bloco">
          <div className="doc-linha-assinatura" />
          <p>{nomeTerapeuta}</p>
          <p>Terapeuta Responsável</p>
        </div>
      </div>
      <p className="doc-data-local">
        Emitida em {new Date().toLocaleDateString("pt-BR")}
      </p>
    </div>
  );

  const renderAnamneseImpressao = () => {
    if (!pacienteSelecionado) return <p className="fin-vazio">Selecione um paciente para imprimir a anamnese.</p>;
    if (!anamnese) return <p className="fin-vazio">Anamnese não preenchida para este paciente.</p>;

    const campos = [
      ["Queixa Principal", anamnese.queixaPrincipal],
      ["História da Doença", anamnese.historiaDoenca],
      ["Motivo da Busca", anamnese.motivoBusca],
      ["Diagnósticos Anteriores", anamnese.diagnosticosAnteriores],
      ["Medicamentos", anamnese.medicamentos],
      ["Cirurgias / Internações", anamnese.cirurgias],
      ["Alergias", anamnese.alergias],
      ["Terapias Anteriores", anamnese.terapiasAnteriores],
      ["Histórico Familiar", anamnese.historicoFamiliar],
      ["Relacionamentos", anamnese.relacionamentos],
      ["Qualidade do Sono", anamnese.qualidadeSono],
      ["Hábitos Alimentares", anamnese.habitosAlimentares],
      ["Atividade Física", anamnese.atividadeFisica],
      ["Vida Social e Trabalho", anamnese.vidaSocial],
      ["Objetivos Terapêuticos", anamnese.objetivosTerapia],
      ["Outras Observações", anamnese.outrasObservacoes],
    ].filter(([, v]) => v && v.trim());

    return (
      <div className="doc-conteudo">
        <h2 className="doc-titulo-print">ANAMNESE</h2>
        <p className="doc-paragrafo"><strong>Paciente:</strong> {nomePaciente}</p>
        <p className="doc-paragrafo"><strong>Terapeuta:</strong> {nomeTerapeuta}</p>
        <p className="doc-paragrafo">
          <strong>Data de atualização:</strong>{" "}
          {anamnese.dataAtualizacao?.toDate?.().toLocaleDateString("pt-BR") || "—"}
        </p>
        <hr style={{ margin: "16px 0" }} />
        {campos.map(([label, valor]) => (
          <div key={label} style={{ marginBottom: "16px" }}>
            <p style={{ margin: "0 0 4px 0", fontWeight: "700", fontSize: "13px" }}>{label}</p>
            <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{valor}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderFormulario = () => {
    if (docAtivo === "contrato") return (
      <div className="doc-form">
        <div className="doc-form-grupo">
          <label>Paciente</label>
          <select value={pacienteSelecionado} onChange={(e) => setPacienteSelecionado(e.target.value)}>
            <option value="">-- Selecione --</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div className="doc-form-grupo">
          <label>Valor da sessão (R$)</label>
          <input type="number" name="valorSessao" value={dados.valorSessao} onChange={handleChange} placeholder="Ex: 150" />
        </div>
        <div className="doc-form-grupo">
          <label>Frequência</label>
          <select name="frequencia" value={dados.frequencia} onChange={handleChange}>
            <option value="semanalmente">Semanalmente</option>
            <option value="quinzenalmente">Quinzenalmente</option>
            <option value="mensalmente">Mensalmente</option>
          </select>
        </div>
        <div className="doc-form-grupo">
          <label>Duração da sessão</label>
          <select name="duracaoSessao" value={dados.duracaoSessao} onChange={handleChange}>
            <option value="50">50 minutos</option>
            <option value="60">60 minutos</option>
            <option value="90">90 minutos</option>
          </select>
        </div>
        <div className="doc-form-grupo">
          <label>Modalidade</label>
          <select name="localAtendimento" value={dados.localAtendimento} onChange={handleChange}>
            <option value="presencial">Presencial</option>
            <option value="online">Online</option>
            <option value="presencial e online">Presencial e Online</option>
          </select>
        </div>
        <div className="doc-form-grupo">
          <label>Data do contrato</label>
          <input type="date" name="dataContrato" value={dados.dataContrato} onChange={handleChange} />
        </div>
      </div>
    );

    if (docAtivo === "comparecimento") return (
      <div className="doc-form">
        <div className="doc-form-grupo">
          <label>Paciente</label>
          <select value={pacienteSelecionado} onChange={(e) => setPacienteSelecionado(e.target.value)}>
            <option value="">-- Selecione --</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div className="doc-form-grupo">
          <label>Data do comparecimento</label>
          <input type="date" name="dataComparecimento" value={dados.dataComparecimento} onChange={handleChange} />
        </div>
        <div className="doc-form-grupo">
          <label>Horário (opcional)</label>
          <input type="time" name="horaComparecimento" value={dados.horaComparecimento} onChange={handleChange} />
        </div>
        <div className="doc-form-grupo">
          <label>Motivo</label>
          <input type="text" name="motivoComparecimento" value={dados.motivoComparecimento} onChange={handleChange} />
        </div>
      </div>
    );

    if (docAtivo === "anamnese") return (
      <div className="doc-form">
        <div className="doc-form-grupo">
          <label>Paciente</label>
          <select value={pacienteSelecionado} onChange={(e) => setPacienteSelecionado(e.target.value)}>
            <option value="">-- Selecione --</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
      </div>
    );

    // lgpd e consentimento só precisam do paciente
    return (
      <div className="doc-form">
        <div className="doc-form-grupo">
          <label>Paciente</label>
          <select value={pacienteSelecionado} onChange={(e) => setPacienteSelecionado(e.target.value)}>
            <option value="">-- Selecione --</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="doc-container">
      <h2 className="fin-titulo">Documentos</h2>

      <div className="doc-layout">
        {/* Sidebar de documentos */}
        <div className="doc-sidebar">
          {DOCS.map((d) => (
            <button
              key={d.key}
              className={`doc-btn ${docAtivo === d.key ? "ativo" : ""}`}
              onClick={() => setDocAtivo(d.key)}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Área principal */}
        <div className="doc-main">
          {/* Formulário de personalização */}
          <div className="doc-form-area">
            <h3 className="doc-form-titulo">Dados do documento</h3>
            {renderFormulario()}
            <button className="doc-btn-imprimir" onClick={imprimir}>
              🖨️ Imprimir / Salvar PDF
            </button>
          </div>

          {/* Preview do documento */}
          <div className="doc-preview-area">
            <div className="doc-preview-header">
              <span>Pré-visualização</span>
            </div>
            <div className="doc-preview" id="doc-para-imprimir">
              {docAtivo === "contrato" && renderContrato()}
              {docAtivo === "lgpd" && renderLGPD()}
              {docAtivo === "consentimento" && renderConsentimento()}
              {docAtivo === "comparecimento" && renderComparecimento()}
              {docAtivo === "anamnese" && renderAnamneseImpressao()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentos;
