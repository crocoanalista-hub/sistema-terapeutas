import { useState, useEffect, useCallback } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, doc as fDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../services/firebaseConfig";
import { criarCobrancaAsaas } from "../../services/asaasService";
import { buscarConfigAsaas, VALORES_PLANO } from "../../services/planoService";

// ─────────────────────────────────────────────────────────────
//  Constantes
// ─────────────────────────────────────────────────────────────

const ACCENT = "#1a73e8";

const FORMAS_PAGAMENTO = [
  { val: "pix",           label: "Pix" },
  { val: "dinheiro",      label: "Dinheiro" },
  { val: "transferencia", label: "Transferência" },
  { val: "cartao",        label: "Cartão" },
  { val: "boleto",        label: "Boleto" },
  { val: "outro",         label: "Outro" },
];

const COR_SIT = {
  pendente:  { bg: "rgba(249,171,0,0.12)",   text: "#b45309", label: "Pendente"  },
  vencida:   { bg: "rgba(234,67,53,0.12)",   text: "#ea4335", label: "Vencida"   },
  pago:      { bg: "rgba(52,168,83,0.12)",   text: "#34a853", label: "Quitada"   },
  cancelado: { bg: "rgba(95,99,104,0.12)",   text: "#5f6368", label: "Cancelada" },
};

const S = {
  input: {
    background: "#fff", border: "1px solid #dadce0", borderRadius: 8,
    padding: "9px 12px", color: "#3c4043", fontSize: 13,
    width: "100%", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  },
  select: {
    background: "#fff", border: "1px solid #dadce0", borderRadius: 8,
    padding: "8px 12px", color: "#3c4043", fontSize: 13,
    width: "100%", outline: "none", cursor: "pointer", fontFamily: "inherit", boxSizing: "border-box",
  },
  label: {
    fontSize: 11, fontWeight: 700, color: "#5f6368",
    textTransform: "uppercase", letterSpacing: "0.04em",
    display: "block", marginBottom: 5,
  },
};

function Campo({ label, children, obrigatorio }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <label style={S.label}>{label}{obrigatorio && <span style={{ color: "#ea4335", marginLeft: 2 }}>*</span>}</label>
      {children}
    </div>
  );
}

function AcaoBotao({ label, onClick, danger = false, disabled = false }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "8px 12px",
        background: hover && !disabled ? (danger ? "rgba(234,67,53,0.08)" : "#f1f3f4") : "transparent",
        border: `1px solid ${danger ? "#ea4335" : "#dadce0"}`,
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 12,
        fontWeight: 600,
        color: danger ? "#ea4335" : "#3c4043",
        textAlign: "left",
        width: "100%",
        transition: "background 0.15s",
        fontFamily: "inherit",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
//  Modal — Incluir
// ─────────────────────────────────────────────────────────────

function ModalIncluir({ cliente, onClose, onSalvo, toast_ }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [jaRecebido,     setJaRecebido]     = useState(false);
  const [plano,          setPlano]          = useState("essencial");
  const [valor,          setValor]          = useState(String(VALORES_PLANO.essencial || "79"));
  const [vencimento,     setVencimento]     = useState("");
  const [descricao,      setDescricao]      = useState("");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [dataPagamento,  setDataPagamento]  = useState(hoje);
  const [cpfCnpj,        setCpfCnpj]        = useState("");
  const [mobilePhone,    setMobilePhone]    = useState("");
  const [salvando,       setSalvando]       = useState(false);

  function handlePlano(p) {
    setPlano(p);
    const v = VALORES_PLANO[p];
    if (v) setValor(String(v));
  }

  async function salvar() {
    if (!valor || parseFloat(valor) <= 0) { toast_("⚠️ Informe o valor."); return; }
    if (!jaRecebido && !vencimento)        { toast_("⚠️ Informe a data de vencimento."); return; }
    setSalvando(true);
    try {
      const vencFinal = vencimento || dataPagamento;
      const descFinal = descricao ||
        `Plano ${plano} — ${new Date(vencFinal + "T12:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`;

      let asaasDados = {};
      if (!jaRecebido) {
        const cfg = await buscarConfigAsaas().catch(() => null);
        if (cfg?.apiKey) {
          try {
            asaasDados = await criarCobrancaAsaas({
              nome: cliente.nome, email: cliente.email,
              cpfCnpj: cpfCnpj || "", mobilePhone: mobilePhone || "",
              valor: parseFloat(valor), vencimento: vencFinal,
              descricao: descFinal, externalReference: cliente.id,
            });
          } catch (e) { console.warn("Asaas:", e.message); }
        }
      }

      await addDoc(collection(db, "cobrancas"), {
        terapeutaId:    cliente.id,
        terapeutaNome:  cliente.nome,
        terapeutaEmail: cliente.email,
        valor:          parseFloat(valor),
        vencimento:     vencFinal,
        plano,
        descricao:      descFinal,
        recorrente:     false,
        asaasId:        asaasDados.asaasId        || null,
        linkPagamento:  asaasDados.linkPagamento  || null,
        pixCopiaECola:  asaasDados.pixCopiaECola  || null,
        criadoEm:       serverTimestamp(),
        ...(jaRecebido
          ? { status: "pago", pagoEm: new Date(dataPagamento + "T12:00:00"), formaPagamento }
          : { status: "pendente" }
        ),
      });

      toast_("✓ Cobrança registrada!");
      onSalvo();
      onClose();
    } catch (e) { toast_("❌ " + e.message); }
    finally     { setSalvando(false); }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modalBox, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={mHeader}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1a2535" }}>Incluir cobrança</span>
          <button onClick={onClose} style={btnX}>×</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#3c4043" }}>
            👤 {cliente.nome || cliente.email}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setJaRecebido(false)}
              style={{ flex: 1, padding: "10px 8px", borderRadius: 8, border: `2px solid ${!jaRecebido ? ACCENT : "#dadce0"}`, background: !jaRecebido ? "#e8f0fe" : "#fff", color: !jaRecebido ? ACCENT : "#5f6368", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              💳 Gerar cobrança
            </button>
            <button type="button" onClick={() => setJaRecebido(true)}
              style={{ flex: 1, padding: "10px 8px", borderRadius: 8, border: `2px solid ${jaRecebido ? "#34a853" : "#dadce0"}`, background: jaRecebido ? "#e8f5e9" : "#fff", color: jaRecebido ? "#34a853" : "#5f6368", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              ✅ Já recebi
            </button>
          </div>

          <Campo label="Plano">
            <select style={S.select} value={plano} onChange={e => handlePlano(e.target.value)}>
              <option value="essencial">Essencial — R$ 79</option>
              <option value="profissional">Profissional — R$ 149</option>
              <option value="pioneiro">Pioneiro — R$ 49</option>
              <option value="outro">Outro</option>
            </select>
          </Campo>

          <Campo label="Valor (R$)" obrigatorio>
            <input style={S.input} type="number" min="0" step="0.01"
              value={valor} onChange={e => setValor(e.target.value)} />
          </Campo>

          {jaRecebido ? (
            <>
              <Campo label="Forma de recebimento">
                <select style={S.select} value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}>
                  {FORMAS_PAGAMENTO.map(f => <option key={f.val} value={f.val}>{f.label}</option>)}
                </select>
              </Campo>
              <Campo label="Data do recebimento" obrigatorio>
                <input style={S.input} type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} />
              </Campo>
            </>
          ) : (
            <>
              <Campo label="Vencimento" obrigatorio>
                <input style={S.input} type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} />
              </Campo>
              <Campo label="CPF / CNPJ">
                <input style={S.input} value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} placeholder="000.000.000-00" />
              </Campo>
              <Campo label="WhatsApp">
                <input style={S.input} value={mobilePhone} onChange={e => setMobilePhone(e.target.value)} placeholder="(11) 99999-9999" />
              </Campo>
            </>
          )}

          <Campo label="Descrição (opcional)">
            <input style={S.input} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Mensalidade julho 2026" />
          </Campo>
        </div>

        <div style={{ padding: "14px 24px", borderTop: "1px solid #e8eaed", display: "flex", gap: 10, justifyContent: "flex-end", background: "#f8f9fa" }}>
          <button onClick={onClose} style={btnSecundario}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{ ...btnPrimario, opacity: salvando ? 0.7 : 1 }}>
            {salvando ? "Salvando..." : jaRecebido ? "✅ Registrar" : "Criar cobrança"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Modal — Quitar
// ─────────────────────────────────────────────────────────────

function ModalQuitar({ totalValor, qtd, onClose, onConfirm, salvando }) {
  const [valorPago,      setValorPago]      = useState(String(Number(totalValor || 0).toFixed(2)).replace(".", ","));
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [dataPagamento,  setDataPagamento]  = useState(new Date().toISOString().slice(0, 10));

  const vp   = parseFloat(valorPago.replace(",", ".")) || 0;
  const diff = vp - (totalValor || 0);

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modalBox, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div style={mHeader}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1a2535" }}>
            Quitar {qtd > 1 ? `${qtd} cobranças` : "cobrança"}
          </span>
          <button onClick={onClose} style={btnX}>×</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 13, color: "#5f6368" }}>
            Valor original: <strong>R$ {Number(totalValor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
          </div>

          <Campo label="Valor pago (R$)" obrigatorio>
            <input style={S.input} value={valorPago} onChange={e => setValorPago(e.target.value)} autoFocus />
          </Campo>

          <Campo label="Forma de pagamento" obrigatorio>
            <select style={S.select} value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}>
              <option value="">(Selecione)</option>
              {FORMAS_PAGAMENTO.map(f => <option key={f.val} value={f.val}>{f.label}</option>)}
            </select>
          </Campo>

          <Campo label="Data de pagamento" obrigatorio>
            <input style={S.input} type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} />
          </Campo>

          {Math.abs(diff) > 0.01 && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, fontSize: 13,
              background: diff < 0 ? "rgba(249,171,0,0.1)" : "rgba(234,67,53,0.1)",
              border: diff < 0 ? "1px solid rgba(249,171,0,0.4)" : "1px solid rgba(234,67,53,0.3)",
              color: diff < 0 ? "#b45309" : "#ea4335",
            }}>
              {diff < 0
                ? `Desconto de R$ ${Math.abs(diff).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} aplicado`
                : `Juros/multa de R$ ${diff.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} aplicados`}
            </div>
          )}
        </div>

        <div style={{ padding: "14px 24px", borderTop: "1px solid #e8eaed", display: "flex", gap: 10, justifyContent: "flex-end", background: "#f8f9fa" }}>
          <button onClick={onClose} style={btnSecundario}>Cancelar</button>
          <button
            disabled={salvando || vp <= 0 || !formaPagamento || !dataPagamento}
            onClick={() => onConfirm(vp, diff, formaPagamento, dataPagamento)}
            style={{ ...btnPrimario, background: "#34a853", opacity: (salvando || !formaPagamento) ? 0.7 : 1 }}>
            {salvando ? "Aguarde..." : "Quitar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Modal — Editar
// ─────────────────────────────────────────────────────────────

function ModalEditar({ cobranca, onClose, onSalvo, toast_ }) {
  const [valor,      setValor]      = useState(String(cobranca.valor || ""));
  const [vencimento, setVencimento] = useState(cobranca.vencimento || "");
  const [descricao,  setDescricao]  = useState(cobranca.descricao  || "");
  const [status,     setStatus]     = useState(cobranca.status     || "pendente");
  const [salvando,   setSalvando]   = useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      await updateDoc(fDoc(db, "cobrancas", cobranca.id), {
        valor: parseFloat(String(valor).replace(",", ".")) || 0,
        vencimento, descricao, status,
      });
      toast_("✓ Cobrança atualizada!");
      onSalvo();
      onClose();
    } catch (e) { toast_("❌ " + e.message); }
    finally     { setSalvando(false); }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modalBox, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={mHeader}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1a2535" }}>Editar cobrança</span>
          <button onClick={onClose} style={btnX}>×</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <Campo label="Valor (R$)" obrigatorio>
            <input style={S.input} value={valor} onChange={e => setValor(e.target.value)} />
          </Campo>
          <Campo label="Vencimento">
            <input style={S.input} type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} />
          </Campo>
          <Campo label="Descrição">
            <input style={S.input} value={descricao} onChange={e => setDescricao(e.target.value)} />
          </Campo>
          <Campo label="Situação">
            <select style={S.select} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="pendente">Pendente</option>
              <option value="pago">Quitada</option>
              <option value="cancelado">Cancelada</option>
            </select>
          </Campo>
        </div>

        <div style={{ padding: "14px 24px", borderTop: "1px solid #e8eaed", display: "flex", gap: 10, justifyContent: "flex-end", background: "#f8f9fa" }}>
          <button onClick={onClose} style={btnSecundario}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{ ...btnPrimario, opacity: salvando ? 0.7 : 1 }}>
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Componente principal — ContasCliente
// ─────────────────────────────────────────────────────────────

const FILTROS = [
  { val: "pendente",  label: "Pendentes"  },
  { val: "pago",      label: "Quitadas"   },
  { val: "cancelado", label: "Canceladas" },
  { val: "vencida",   label: "Vencidas"   },
  { val: "todas",     label: "Todas"      },
];

const planoInfo = {
  trial:        { label: "Trial",        cor: "#f9ab00" },
  ativo:        { label: "Ativo",        cor: "#34a853" },
  bloqueado:    { label: "Bloqueado",    cor: "#ea4335" },
  pioneiro:     { label: "Pioneiro",     cor: "#f59e0b" },
  profissional: { label: "Profissional", cor: "#1a73e8" },
  essencial:    { label: "Essencial",    cor: "#5f6368" },
};

export default function ContasCliente({ cliente, onClose }) {
  const [cobrancas,    setCobrancas]    = useState([]);
  const [selecionadas, setSelecionadas] = useState([]);
  const [filtroSit,    setFiltroSit]    = useState("pendente");
  const [loading,      setLoading]      = useState(true);
  const [salvando,     setSalvando]     = useState(false);
  const [toast,        setToast]        = useState("");
  const [mdIncluir,    setMdIncluir]    = useState(false);
  const [mdQuitar,     setMdQuitar]     = useState(false);
  const [mdEditar,     setMdEditar]     = useState(null);

  const toast_ = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "cobrancas"), where("terapeutaId", "==", cliente.id)));
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => (a.vencimento || "").localeCompare(b.vencimento || ""));
      setCobrancas(lista);
    } catch { toast_("❌ Erro ao carregar."); }
    finally   { setLoading(false); }
  }, [cliente.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { carregar(); }, [carregar]);

  function toggleSel(c) {
    setSelecionadas(prev => prev.find(x => x.id === c.id) ? prev.filter(x => x.id !== c.id) : [...prev, c]);
  }

  async function excluir() {
    if (!selecionadas.length) { toast_("⚠️ Selecione ao menos uma cobrança."); return; }
    if (!window.confirm(`Excluir ${selecionadas.length} cobrança(s)?`)) return;
    setSalvando(true);
    try {
      for (const c of selecionadas) await deleteDoc(fDoc(db, "cobrancas", c.id));
      setSelecionadas([]);
      toast_(`✓ ${selecionadas.length} excluída(s).`);
      await carregar();
    } catch { toast_("❌ Erro ao excluir."); }
    finally   { setSalvando(false); }
  }

  async function quitar(valorPago, diff, formaPagamento, dataPagamento) {
    if (!selecionadas.length) return;
    setSalvando(true);
    try {
      const quitadaEm = new Date(dataPagamento + "T12:00:00");
      for (const c of selecionadas) {
        const updates = { status: "pago", valorPago, formaPagamento, dataPagamento, pagoEm: quitadaEm };
        if (diff < 0)      updates.desconto   = Math.abs(diff);
        else if (diff > 0) updates.jurosMulta = diff;
        await updateDoc(fDoc(db, "cobrancas", c.id), updates);
      }
      toast_(`✓ ${selecionadas.length} quitada(s)!`);
      setSelecionadas([]);
      setMdQuitar(false);
      await carregar();
    } catch { toast_("❌ Erro ao quitar."); }
    finally   { setSalvando(false); }
  }

  async function cancelar() {
    if (!selecionadas.length) { toast_("⚠️ Selecione ao menos uma cobrança."); return; }
    if (!window.confirm(`Cancelar ${selecionadas.length} cobrança(s)?`)) return;
    setSalvando(true);
    try {
      for (const c of selecionadas) await updateDoc(fDoc(db, "cobrancas", c.id), { status: "cancelado" });
      toast_(`✓ ${selecionadas.length} cancelada(s).`);
      setSelecionadas([]);
      await carregar();
    } catch { toast_("❌ Erro ao cancelar."); }
    finally   { setSalvando(false); }
  }

  const hoje = new Date().toISOString().slice(0, 10);

  const cobrancasFiltradas = cobrancas.filter(c => {
    if (filtroSit === "todas")    return true;
    if (filtroSit === "vencida")  return c.status === "pendente" && c.vencimento && c.vencimento < hoje;
    return c.status === filtroSit;
  });

  const totalFiltrado   = cobrancasFiltradas.reduce((s, c) => s + (Number(c.valor) || 0), 0);
  const totalSelecionado = selecionadas.reduce((s, c) => s + (Number(c.valor) || 0), 0);
  const nSel            = selecionadas.length;
  const aviso           = () => toast_("⚠️ Selecione ao menos uma cobrança.");

  const acoes = [
    { label: "Incluir",  onClick: () => setMdIncluir(true) },
    { label: "Editar",   onClick: () => { if (nSel !== 1) { toast_("⚠️ Selecione exatamente uma cobrança."); return; } setMdEditar(selecionadas[0]); } },
    { label: "Quitar",   onClick: () => { if (!nSel) { aviso(); return; } setMdQuitar(true); } },
    { label: "Cancelar", onClick: cancelar, disabled: salvando },
    { label: "Excluir",  onClick: excluir,  danger: true, disabled: salvando },
    { label: "↻ Atualizar", onClick: carregar },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 1000, height: "min(88vh, 100%)", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.4)", fontFamily: "'Segoe UI', system-ui, sans-serif", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}>

        {/* Toast */}
        {toast && (
          <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", background: "#1a2535", color: "#fff", padding: "10px 22px", borderRadius: 8, fontSize: 13, zIndex: 9999, whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,0.3)", pointerEvents: "none" }}>
            {toast}
          </div>
        )}

        {/* Aba header */}
        <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #e8eaed", background: "#f8f9fa", padding: "0 16px" }}>
          <button style={{ padding: "14px 20px", fontWeight: 700, fontSize: 13, border: "none", cursor: "default", background: `${ACCENT}18`, color: ACCENT, borderBottom: `2px solid ${ACCENT}`, fontFamily: "inherit" }}>
            Contas a Receber
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
            <span style={{ fontSize: 12, color: "#9aa0a6" }}>{cliente.nome || cliente.email}</span>
            {cliente.plano && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: (planoInfo[cliente.plano]?.cor || "#888") + "20", color: planoInfo[cliente.plano]?.cor || "#888" }}>
                {planoInfo[cliente.plano]?.label || cliente.plano}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ padding: "8px", border: "none", background: "transparent", cursor: "pointer", color: "#9aa0a6", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* Corpo: tabela + sidebar */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* Tabela */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#9aa0a6" }}>Carregando...</div>
            ) : cobrancasFiltradas.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#9aa0a6" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>💸</div>
                <div>Nenhum registro encontrado para este filtro.</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Clique em "Incluir" para criar a primeira cobrança.</div>
              </div>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8f9fa", borderBottom: "1px solid #e8eaed", position: "sticky", top: 0 }}>
                      <th style={thStyle}>
                        <input type="checkbox"
                          onChange={e => setSelecionadas(e.target.checked ? cobrancasFiltradas : [])}
                          checked={nSel === cobrancasFiltradas.length && nSel > 0}
                          style={{ accentColor: ACCENT }} />
                      </th>
                      <th style={thStyle}>Descrição</th>
                      <th style={thStyle}>Plano</th>
                      <th style={thStyle}>Vencimento</th>
                      <th style={thStyle}>Pagamento</th>
                      <th style={thStyle}>Valor</th>
                      <th style={thStyle}>Situação</th>
                      <th style={thStyle}>Forma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cobrancasFiltradas.map((c, i) => {
                      const vencida = c.status === "pendente" && c.vencimento && c.vencimento < hoje;
                      const sitKey  = vencida ? "vencida" : (c.status || "pendente");
                      const sit     = COR_SIT[sitKey] || COR_SIT.pendente;
                      const sel     = !!selecionadas.find(x => x.id === c.id);
                      return (
                        <tr key={c.id}
                          onClick={() => toggleSel(c)}
                          onDoubleClick={() => { setSelecionadas([c]); setMdEditar(c); }}
                          style={{ background: sel ? `${ACCENT}10` : i % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer", borderBottom: "1px solid #e8eaed" }}>
                          <td style={tdStyle} onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={sel} onChange={() => toggleSel(c)} style={{ accentColor: ACCENT }} />
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 600, color: "#1a2535" }}>{c.descricao || "—"}</td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: 11, fontWeight: 700, background: "#f1f3f4", color: "#5f6368", padding: "2px 8px", borderRadius: 12 }}>
                              {c.plano || "—"}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, color: vencida ? "#ea4335" : "#5f6368", whiteSpace: "nowrap" }}>
                            {c.vencimento ? new Date(c.vencimento + "T12:00").toLocaleDateString("pt-BR") : "—"}
                          </td>
                          <td style={{ ...tdStyle, color: "#5f6368", fontSize: 12, whiteSpace: "nowrap" }}>
                            {c.pagoEm
                              ? new Date(c.pagoEm?.toDate?.() || c.pagoEm).toLocaleDateString("pt-BR")
                              : "—"}
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: "#1a2535", whiteSpace: "nowrap" }}>
                            R$ {Number(c.status === "pago" && c.valorPago ? c.valorPago : c.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: sit.bg, color: sit.text }}>
                              {sit.label}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, color: "#9aa0a6", fontSize: 12 }}>
                            {c.formaPagamento
                              ? FORMAS_PAGAMENTO.find(f => f.val === c.formaPagamento)?.label || c.formaPagamento
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ padding: "10px 16px", borderTop: "1px solid #e8eaed", display: "flex", justifyContent: "flex-end", gap: 8, fontSize: 13, background: "#f8f9fa" }}>
                  <span style={{ color: "#9aa0a6" }}>{cobrancasFiltradas.length} registro{cobrancasFiltradas.length !== 1 ? "s" : ""} · Total:</span>
                  <span style={{ fontWeight: 700, color: "#1a2535" }}>R$ {totalFiltrado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
          </div>

          {/* Sidebar direita */}
          <div style={{ width: 190, borderLeft: "1px solid #e8eaed", display: "flex", flexDirection: "column", flexShrink: 0, background: "#f8f9fa", overflowY: "auto" }}>

            {/* Ações */}
            <div style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#9aa0a6", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e8eaed" }}>
              Ações
            </div>
            <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: 6, borderBottom: "1px solid #e8eaed" }}>
              {acoes.map(a => (
                <AcaoBotao key={a.label} label={a.label} onClick={a.onClick} danger={a.danger} disabled={a.disabled} />
              ))}
            </div>

            {/* Filtros */}
            <div style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#9aa0a6", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e8eaed" }}>
              Filtros Rápidos
            </div>
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 2, borderBottom: "1px solid #e8eaed" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#5f6368", marginBottom: 8, border: "1px solid #e8eaed", borderRadius: 6, padding: "5px 10px", background: "#fff" }}>
                Situação
              </div>
              {FILTROS.map(fi => (
                <label key={fi.val} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, cursor: "pointer", color: filtroSit === fi.val ? ACCENT : "#5f6368", fontWeight: filtroSit === fi.val ? 700 : 400, padding: "4px 2px", fontFamily: "inherit" }}>
                  <input type="radio" name="filtroSit" value={fi.val} checked={filtroSit === fi.val} onChange={() => setFiltroSit(fi.val)} style={{ accentColor: ACCENT }} />
                  {fi.label}
                </label>
              ))}
            </div>

            {/* Info de seleção */}
            {nSel > 0 && (
              <div style={{ margin: "10px", padding: "10px 12px", background: `${ACCENT}0D`, border: `1px solid ${ACCENT}30`, borderRadius: 8, fontSize: 11, color: ACCENT }}>
                <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 12 }}>{nSel} selecionada{nSel > 1 ? "s" : ""}</div>
                {nSel === 1 && <div style={{ color: "#5f6368", marginBottom: 4, fontSize: 11 }}>{selecionadas[0].descricao}</div>}
                <div style={{ fontWeight: 700, color: "#1a2535" }}>
                  R$ {totalSelecionado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                {nSel === 1 && <div style={{ marginTop: 5, fontSize: 10, color: "#9aa0a6" }}>Duplo clique para editar</div>}
                <button onClick={() => setSelecionadas([])} style={{ marginTop: 8, width: "100%", padding: "4px", background: "none", border: "1px solid #dadce0", borderRadius: 6, color: "#9aa0a6", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                  Limpar seleção
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      {mdIncluir && (
        <ModalIncluir cliente={cliente} onClose={() => setMdIncluir(false)} onSalvo={carregar} toast_={toast_} />
      )}
      {mdQuitar && (
        <ModalQuitar totalValor={totalSelecionado} qtd={nSel} onClose={() => setMdQuitar(false)} onConfirm={quitar} salvando={salvando} />
      )}
      {mdEditar && (
        <ModalEditar cobranca={mdEditar} onClose={() => setMdEditar(null)} onSalvo={carregar} toast_={toast_} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Estilos compartilhados
// ─────────────────────────────────────────────────────────────

const overlay   = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 6000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const modalBox  = { background: "#fff", borderRadius: 16, width: "100%", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.4)", fontFamily: "'Segoe UI', system-ui, sans-serif", maxHeight: "92vh", overflowY: "auto" };
const mHeader   = { padding: "18px 24px", borderBottom: "1px solid #e8eaed", display: "flex", alignItems: "center", justifyContent: "space-between" };
const btnX      = { background: "none", border: "none", fontSize: 22, color: "#9aa0a6", cursor: "pointer", lineHeight: 1 };
const btnPrimario   = { padding: "9px 20px", background: ACCENT, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const btnSecundario = { padding: "9px 16px", background: "none", border: "1px solid #dadce0", borderRadius: 8, color: "#5f6368", fontSize: 13, cursor: "pointer", fontFamily: "inherit" };
const thStyle   = { padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#9aa0a6", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" };
const tdStyle   = { padding: "10px 14px" };
