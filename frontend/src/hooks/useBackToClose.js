import { useEffect, useRef } from "react";

// Faz o "back" do telemóvel (ou do browser) fechar uma janela, formulário ou edição aberta
// na própria página, em vez de sair da página.
//
// Ao abrir, junta-se ao histórico uma entrada com o mesmo endereço. O "back" consome essa
// entrada e fecha o que estiver aberto por cima. Ao fechar pelo botão (Cancelar, Guardar, ✕,
// tocar fora), a entrada é retirada com history.back() e esse popstate é ignorado aqui.
// history.back() é assíncrono: se outra coisa abrir logo a seguir (ex.: detalhe -> editar),
// a nova entrada só é criada depois de o back terminar, senão o browser recuava a entrada nova.
const stack = [];
let pendingPushes = [];
let ignorePops = 0;
let listening = false;

function pushEntry(entry) {
  // Mantém o estado do React Router (key/idx) para ele ver a mesma localização.
  window.history.pushState({ ...window.history.state, backToClose: true }, "");
  entry.pushed = true;
  entry.href = window.location.href;
  entry.key = window.history.state?.key;
}

function onPopState() {
  if (ignorePops > 0) {
    ignorePops--;
    if (ignorePops === 0) {
      const queued = pendingPushes;
      pendingPushes = [];
      queued.forEach(pushEntry);
    }
    return;
  }
  const entry = stack.pop();
  if (entry) {
    entry.popped = true;
    entry.close();
  } else if (window.history.state?.backToClose) {
    // Entrada de uma janela que já não está aberta (ex.: saiu-se da página com ela aberta): salta-a.
    window.history.back();
  }
}

export default function useBackToClose(open, close) {
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return undefined;
    if (!listening) {
      window.addEventListener("popstate", onPopState);
      listening = true;
    }
    const entry = { popped: false, pushed: false, close: () => closeRef.current() };
    stack.push(entry);
    if (ignorePops > 0) pendingPushes.push(entry);
    else pushEntry(entry);

    return () => {
      if (entry.popped) return;
      const i = stack.indexOf(entry);
      if (i !== -1) stack.splice(i, 1);
      if (!entry.pushed) {
        pendingPushes = pendingPushes.filter((e) => e !== entry);
        return;
      }
      // Se entretanto se mudou de página (link do menu), não se volta atrás: isso desfazia a navegação.
      if (window.location.href !== entry.href || window.history.state?.key !== entry.key) return;
      ignorePops++;
      window.history.back();
    };
  }, [open]);
}
