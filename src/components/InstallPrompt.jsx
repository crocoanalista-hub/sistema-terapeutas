import React, { useState, useEffect } from "react";

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => /android/i.test(navigator.userAgent);
const isStandalone = () =>
  window.navigator.standalone === true ||
  window.matchMedia("(display-mode: standalone)").matches;

const AUTO_ADVANCE_MS = 3200;

export default function InstallPrompt() {
  const [visivel, setVisivel] = useState(false);
  const [plataforma, setPlataforma] = useState(null); // "ios" | "android" | "android-manual"
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [passo, setPasso] = useState(0);

  const dispositivoIOS = isIOS();
  const dispositivoAndroid = isAndroid();
  const podeInstalar = (dispositivoIOS || dispositivoAndroid) && !isStandalone();

  useEffect(() => {
    if (isStandalone()) return;

    // Android: sempre escuta o evento nativo, mesmo que o popup já tenha sido
    // dispensado — assim o botão flutuante pode reaproveitá-lo depois.
    let handler;
    if (isAndroid()) {
      handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener("beforeinstallprompt", handler);
    }

    // Só abre o tutorial sozinho se o usuário ainda não tiver dispensado
    if (!localStorage.getItem("pwa_dispensado")) {
      if (isIOS()) {
        setPlataforma("ios");
        setVisivel(true);
      } else if (isAndroid()) {
        setPlataforma("android");
        const timer = setTimeout(() => setVisivel(true), 3000);
        return () => {
          clearTimeout(timer);
          if (handler) window.removeEventListener("beforeinstallprompt", handler);
        };
      }
    }

    return () => {
      if (handler) window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  // Avança os passos do tutorial automaticamente, um de cada vez
  useEffect(() => {
    const tutorialManual =
      plataforma === "ios" ||
      plataforma === "android-manual" ||
      (plataforma === "android" && !deferredPrompt);
    if (!visivel || !tutorialManual) return;

    const t = setInterval(() => {
      setPasso((p) => (p + 1) % 3);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [visivel, plataforma, deferredPrompt]);

  const dispensar = () => {
    localStorage.setItem("pwa_dispensado", "1");
    setVisivel(false);
  };

  const abrirTutorial = () => {
    setPasso(0);
    if (dispositivoIOS) {
      setPlataforma("ios");
      setVisivel(true);
    } else if (dispositivoAndroid) {
      setPlataforma(deferredPrompt ? "android" : "android-manual");
      setVisivel(true);
    }
  };

  const instalarAndroid = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") dispensar();
      setDeferredPrompt(null);
    } else {
      setPlataforma("android-manual");
    }
  };

  return (
    <>
      {visivel && plataforma === "ios" && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.pill} />
            <div style={styles.appRow}>
              <div style={styles.appIcon}>N</div>
              <div>
                <div style={styles.appNome}>Novu</div>
                <div style={styles.appSub}>Adicione à tela de início</div>
              </div>
            </div>
            <p style={styles.intro}>
              Para a melhor experiência, instale o Novu como app no seu iPhone. É rápido e gratuito!
            </p>
            <div style={styles.avisoSafari}>
              ℹ️ O Safari não permite instalar com 1 toque — siga os 3 passos abaixo.
            </div>

            <div style={styles.passos}>
              {IOS_PASSOS.map((p, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.passo,
                    opacity: passo === i ? 1 : 0.45,
                    transform: passo === i ? "scale(1.02)" : "scale(1)",
                  }}
                  onClick={() => setPasso(i)}
                >
                  <div style={{ ...styles.passoNum, background: passo === i ? "#1a73e8" : "#e8edf3", color: passo === i ? "white" : "#666" }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={styles.passoTitulo}>{p.icone} {p.titulo}</div>
                    {passo === i && <div style={styles.passoDesc}>{p.desc}</div>}
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.setaBox}>
              <div style={styles.setaTexto}>👇 Botão Compartilhar está aqui em baixo</div>
            </div>

            <button style={styles.btnDismiss} onClick={dispensar}>
              Agora não
            </button>
          </div>
        </div>
      )}

      {visivel && plataforma === "android" && deferredPrompt && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.pill} />
            <div style={styles.appRow}>
              <div style={styles.appIcon}>N</div>
              <div>
                <div style={styles.appNome}>Novu</div>
                <div style={styles.appSub}>Adicione à tela de início</div>
              </div>
            </div>
            <p style={styles.intro}>
              Instale o Novu como app no seu celular para acesso rápido, sem precisar abrir o navegador!
            </p>
            <button style={styles.btnInstalar} onClick={instalarAndroid}>
              📲 Instalar agora
            </button>
            <button style={styles.btnDismiss} onClick={dispensar}>
              Agora não
            </button>
          </div>
        </div>
      )}

      {visivel && (plataforma === "android-manual" || (plataforma === "android" && !deferredPrompt)) && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.pill} />
            <div style={styles.appRow}>
              <div style={styles.appIcon}>N</div>
              <div>
                <div style={styles.appNome}>Novu</div>
                <div style={styles.appSub}>Adicione à tela de início</div>
              </div>
            </div>
            <p style={styles.intro}>
              Para instalar o Novu como app, siga os passos abaixo:
            </p>
            <div style={styles.passos}>
              {ANDROID_PASSOS.map((p, i) => (
                <div
                  key={i}
                  style={{ ...styles.passo, opacity: passo === i ? 1 : 0.45 }}
                  onClick={() => setPasso(i)}
                >
                  <div style={{ ...styles.passoNum, background: passo === i ? "#1a73e8" : "#e8edf3", color: passo === i ? "white" : "#666" }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={styles.passoTitulo}>{p.icone} {p.titulo}</div>
                    {passo === i && <div style={styles.passoDesc}>{p.desc}</div>}
                  </div>
                </div>
              ))}
            </div>
            <button style={styles.btnDismiss} onClick={dispensar}>
              Agora não
            </button>
          </div>
        </div>
      )}

      {podeInstalar && !visivel && (
        <button style={styles.fab} onClick={abrirTutorial}>
          📲 Instalar app
        </button>
      )}
    </>
  );
}

const IOS_PASSOS = [
  {
    icone: "⬆️",
    titulo: 'Toque em "Compartilhar"',
    desc: "No Safari, toque no ícone de compartilhar na barra inferior (seta apontando para cima).",
  },
  {
    icone: "➕",
    titulo: '"Adicionar à Tela de Início"',
    desc: 'Role a lista e toque em "Adicionar à Tela de Início".',
  },
  {
    icone: "✅",
    titulo: "Confirme",
    desc: 'Toque em "Adicionar" no canto superior direito. Pronto!',
  },
];

const ANDROID_PASSOS = [
  { icone: "⋮", titulo: 'Toque nos "3 pontinhos"', desc: "No canto superior direito do Chrome." },
  { icone: "➕", titulo: '"Adicionar à tela inicial"', desc: "Toque nessa opção no menu." },
  { icone: "✅", titulo: "Confirme", desc: 'Toque em "Adicionar". Pronto!' },
];

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 9999,
    display: "flex",
    alignItems: "flex-end",
  },
  modal: {
    width: "100%",
    background: "white",
    borderRadius: "20px 20px 0 0",
    padding: "12px 24px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    maxHeight: "90vh",
    overflowY: "auto",
  },
  pill: {
    width: 40,
    height: 4,
    background: "#ddd",
    borderRadius: 99,
    margin: "0 auto 4px",
  },
  appRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  appIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: "linear-gradient(135deg, #1a73e8, #0d47a1)",
    color: "white",
    fontSize: 26,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  appNome: {
    fontSize: 18,
    fontWeight: 800,
    color: "#1a2535",
  },
  appSub: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  intro: {
    margin: 0,
    fontSize: 14,
    color: "#444",
    lineHeight: 1.5,
  },
  avisoSafari: {
    background: "#fff3cd",
    color: "#856404",
    fontSize: 13,
    fontWeight: 600,
    padding: "10px 14px",
    borderRadius: 10,
    lineHeight: 1.4,
  },
  passos: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  passo: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 12,
    background: "#f8f9fa",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  passoNum: {
    width: 28,
    height: 28,
    borderRadius: 99,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 800,
    flexShrink: 0,
    transition: "all 0.2s",
  },
  passoTitulo: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1a2535",
  },
  passoDesc: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    lineHeight: 1.4,
  },
  setaBox: {
    background: "#fff3cd",
    borderRadius: 10,
    padding: "10px 14px",
    textAlign: "center",
  },
  setaTexto: {
    fontSize: 13,
    color: "#856404",
    fontWeight: 600,
  },
  btnInstalar: {
    padding: "14px",
    background: "#1a73e8",
    color: "white",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
  },
  btnDismiss: {
    padding: "12px",
    background: "none",
    color: "#888",
    border: "none",
    fontSize: 14,
    cursor: "pointer",
    width: "100%",
  },
  fab: {
    position: "fixed",
    right: 16,
    bottom: "max(90px, calc(env(safe-area-inset-bottom) + 90px))",
    zIndex: 500,
    background: "#1a73e8",
    color: "white",
    border: "none",
    borderRadius: 999,
    padding: "12px 18px",
    fontSize: 14,
    fontWeight: 700,
    boxShadow: "0 4px 16px rgba(26,115,232,0.4)",
    cursor: "pointer",
  },
};
