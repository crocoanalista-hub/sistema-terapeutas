import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  listarItens, adicionarItem, excluirItem,
  registrarMovimentacao, listarMovimentacoes,
} from "../../services/estoqueService";
import "../../styles/estoque.css";

const CATEGORIAS = ["Higiene", "Material clínico", "Escritório", "Limpeza", "Bebidas/Alimentos", "Outro"];

const mostra = (n) => Number(n || 0);

export default function Estoque() {
  const { workspaceId } = useAuth();
  const [aba, setAba] = useState("itens");
  const [itens, setItens] = useState([]);
  const [movs, setMovs] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Formulário novo item
  const [novoItem, setNovoItem] = useState({
    nome: "", categoria: "Outro", unidade: "un", quantidade: "", quantidadeMinima: "",
  });
  const [salvandoItem, setSalvandoItem] = useState(false);

  // Modal movimentação
  const [modalMov, setModalMov] = useState(null); // { item }
  const [mov, setMov] = useState({ tipo: "entrada", quantidade: "", observacao: "" });
  const [salvandoMov, setSalvandoMov] = useState(false);

  const carregar = useCallback(async () => {
    if (!workspaceId) return;
    setCarregando(true);
    const [i, m] = await Promise.all([listarItens(workspaceId), listarMovimentacoes(workspaceId)]);
    setItens(i);
    setMovs(m);
    setCarregando(false);
  }, [workspaceId]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!novoItem.nome) return;
    setSalvandoItem(true);
    await adicionarItem(workspaceId, novoItem);
    setNovoItem({ nome: "", categoria: "Outro", unidade: "un", quantidade: "", quantidadeMinima: "" });
    await carregar();
    setSalvandoItem(false);
    setAba("itens");
  };

  const handleExcluir = async (id, nome) => {
    if (!window.confirm(`Excluir "${nome}"?`)) return;
    await excluirItem(id);
    await carregar();
  };

  const handleMovimentar = async () => {
    if (!mov.quantidade) return;
    setSalvandoMov(true);
    await registrarMovimentacao(workspaceId, modalMov.id, modalMov.nome, mov.tipo, mov.quantidade, mov.observacao);
    setModalMov(null);
    setMov({ tipo: "entrada", quantidade: "", observacao: "" });
    await carregar();
    setSalvandoMov(false);
  };

  const abas = [
    { key: "itens",    label: "📦 Itens" },
    { key: "movs",     label: "📋 Movimentações" },
    { key: "adicionar",label: "➕ Adicionar item" },
  ];

  return (
    <div className="estoque-container">
      <h2 className="estoque-titulo">Controle de Estoque</h2>

      <div className="estoque-abas">
        {abas.map(a => (
          <button key={a.key} className={`estoque-aba${aba === a.key ? " ativa" : ""}`} onClick={() => setAba(a.key)}>
            {a.label}
          </button>
        ))}
      </div>

      {carregando ? <p className="estoque-vazio">Carregando...</p> : (
        <>
          {/* ── Itens ── */}
          {aba === "itens" && (
            itens.length === 0 ? (
              <div className="estoque-vazio">Nenhum item cadastrado. Adicione na aba "Adicionar item".</div>
            ) : (
              <div className="estoque-tabela-wrap">
                <table className="estoque-tabela">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Categoria</th>
                      <th>Unidade</th>
                      <th>Qtd atual</th>
                      <th>Qtd mínima</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map(item => {
                      const abaixo = mostra(item.quantidade) < mostra(item.quantidadeMinima);
                      return (
                        <tr key={item.id}>
                          <td><strong>{item.nome}</strong></td>
                          <td><span className="estoque-cat-badge">{item.categoria}</span></td>
                          <td>{item.unidade}</td>
                          <td><strong>{mostra(item.quantidade)}</strong></td>
                          <td>{mostra(item.quantidadeMinima)}</td>
                          <td>
                            {abaixo
                              ? <span className="estoque-badge-alerta">⚠️ Abaixo do mínimo</span>
                              : <span className="estoque-badge-ok">OK</span>
                            }
                          </td>
                          <td>
                            <div className="estoque-acoes">
                              <button className="estoque-btn estoque-btn--mov"
                                onClick={() => { setModalMov(item); setMov({ tipo: "entrada", quantidade: "", observacao: "" }); }}>
                                Movimentar
                              </button>
                              <button className="estoque-btn estoque-btn--del"
                                onClick={() => handleExcluir(item.id, item.nome)}>
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Movimentações ── */}
          {aba === "movs" && (
            movs.length === 0 ? (
              <div className="estoque-vazio">Nenhuma movimentação registrada ainda.</div>
            ) : (
              <div className="estoque-tabela-wrap">
                <table className="estoque-tabela">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Item</th>
                      <th>Tipo</th>
                      <th>Quantidade</th>
                      <th>Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movs.map(m => (
                      <tr key={m.id}>
                        <td>{m.data ? new Date(m.data + "T00:00").toLocaleDateString("pt-BR") : "—"}</td>
                        <td><strong>{m.itemNome}</strong></td>
                        <td>
                          <span className={`estoque-hist-tipo estoque-hist-tipo--${m.tipo}`}>
                            {m.tipo}
                          </span>
                        </td>
                        <td>{m.quantidade}</td>
                        <td>{m.observacao || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Adicionar item ── */}
          {aba === "adicionar" && (
            <div className="estoque-form-card">
              <h3 className="estoque-form-titulo">Novo item de estoque</h3>
              <form onSubmit={handleAddItem}>
                <div className="estoque-form-grid">
                  <div className="estoque-form-group" style={{ gridColumn: "1 / -1" }}>
                    <label>Nome *</label>
                    <input required value={novoItem.nome} onChange={e => setNovoItem(n => ({ ...n, nome: e.target.value }))} placeholder="Ex: Algodão hidrófilo" />
                  </div>
                  <div className="estoque-form-group">
                    <label>Categoria</label>
                    <select value={novoItem.categoria} onChange={e => setNovoItem(n => ({ ...n, categoria: e.target.value }))}>
                      {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="estoque-form-group">
                    <label>Unidade</label>
                    <input value={novoItem.unidade} onChange={e => setNovoItem(n => ({ ...n, unidade: e.target.value }))} placeholder="un, cx, kg, L..." />
                  </div>
                  <div className="estoque-form-group">
                    <label>Quantidade inicial</label>
                    <input type="number" min={0} value={novoItem.quantidade} onChange={e => setNovoItem(n => ({ ...n, quantidade: e.target.value }))} placeholder="0" />
                  </div>
                  <div className="estoque-form-group">
                    <label>Quantidade mínima</label>
                    <input type="number" min={0} value={novoItem.quantidadeMinima} onChange={e => setNovoItem(n => ({ ...n, quantidadeMinima: e.target.value }))} placeholder="0" />
                  </div>
                </div>
                <div className="estoque-form-acoes">
                  <button type="submit" className="estoque-btn estoque-btn--save" disabled={salvandoItem}>
                    {salvandoItem ? "Salvando..." : "Salvar item"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* Modal movimentação */}
      {modalMov && (
        <div className="estoque-overlay" onClick={() => setModalMov(null)}>
          <div className="estoque-modal" onClick={e => e.stopPropagation()}>
            <h3>Movimentar — {modalMov.nome}</h3>
            <div className="estoque-modal-form">
              <label>Tipo
                <select value={mov.tipo} onChange={e => setMov(m => ({ ...m, tipo: e.target.value }))}>
                  <option value="entrada">Entrada</option>
                  <option value="saída">Saída</option>
                  <option value="ajuste">Ajuste (definir valor absoluto)</option>
                </select>
              </label>
              <label>Quantidade
                <input type="number" min={0} value={mov.quantidade} onChange={e => setMov(m => ({ ...m, quantidade: e.target.value }))} placeholder="0" />
              </label>
              <label>Observação (opcional)
                <textarea rows={2} value={mov.observacao} onChange={e => setMov(m => ({ ...m, observacao: e.target.value }))} placeholder="Ex: Compra de reposição" />
              </label>
            </div>
            <div className="estoque-modal-acoes">
              <button className="estoque-btn estoque-btn--save" onClick={handleMovimentar} disabled={salvandoMov}>
                {salvandoMov ? "Salvando..." : "Confirmar"}
              </button>
              <button className="estoque-btn" onClick={() => setModalMov(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
