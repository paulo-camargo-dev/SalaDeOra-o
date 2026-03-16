import { db, ref, onValue, push, remove } from "./firebase.js";

const filaRef = ref(db, "fila");
const DURACAO_MINUTOS = 10;
let filaAtual = [];

function formatarHora(ms) {
  return new Date(ms).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function parseHoraParaMs(horaTexto) {
  if (!horaTexto) return null;
  const match = horaTexto.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const hora = Number(match[1]);
  const minuto = Number(match[2]);
  const segundo = Number(match[3] || 0);
  const agora = new Date();
  return new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate(),
    hora,
    minuto,
    segundo,
    0
  ).getTime();
}

function normalizarRegistro(pessoa, baseMs, fallbackPosicao) {
  let startAt = pessoa.startAt;
  let endAt = pessoa.endAt;
  let inicio = pessoa.inicio;
  let fim = pessoa.fim;

  if (startAt === undefined || endAt === undefined) {
    const parsedStart = parseHoraParaMs(inicio);
    const parsedEnd = parseHoraParaMs(fim);
    if (parsedStart && parsedEnd) {
      startAt = parsedStart;
      endAt = parsedEnd;
    } else {
      const base = baseMs ?? pessoa.criadoEm ?? Date.now();
      startAt = base + (fallbackPosicao || 0) * DURACAO_MINUTOS * 60000;
      endAt = startAt + DURACAO_MINUTOS * 60000;
    }
  }

  if (!inicio) inicio = formatarHora(startAt);
  if (!fim) fim = formatarHora(endAt);

  return { ...pessoa, startAt, endAt, inicio, fim };
}

function ordenarFila(lista) {
  lista.sort((a, b) => {
    if (a.startAt !== undefined && b.startAt !== undefined) {
      return a.startAt - b.startAt;
    }
    return (a.posicao || 0) - (b.posicao || 0);
  });
}

function filtrarFuturos(lista) {
  const agora = Date.now();
  return lista.filter((p) => p.endAt === undefined || p.endAt > agora);
}

function renderizarLista() {
  const lista = document.getElementById("listaFila");
  lista.innerHTML = "";

  if (filaAtual.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Fila vazia";
    lista.appendChild(li);
    return;
  }

  filaAtual.forEach((pessoa, index) => {
    const li = document.createElement("li");
    const texto = document.createElement("span");
    texto.textContent = `${index + 1}. ${pessoa.nome} (${pessoa.inicio} - ${pessoa.fim})`;
    li.appendChild(texto);

    if (pessoa.key) {
      const btn = document.createElement("button");
      btn.textContent = "Excluir";
      btn.className = "btn-excluir";
      btn.addEventListener("click", () => removerPessoa(pessoa.key));
      li.appendChild(btn);
    }
    lista.appendChild(li);
  });
}

onValue(filaRef, (snapshot) => {
  const dados = snapshot.val();
  const listaRaw = dados
    ? Object.entries(dados).map(([key, value]) => ({ ...value, key }))
    : [];
  const baseMs = Date.now();
  const lista = listaRaw.map((pessoa, index) =>
    normalizarRegistro(pessoa, baseMs, index)
  );
  ordenarFila(lista);
  filaAtual = filtrarFuturos(lista);
  renderizarLista();
});

function removerPessoa(key) {
  if (!key) return;
  remove(ref(db, `fila/${key}`));
}

window.adicionar = function adicionar() {
  const input = document.getElementById("nome");
  const nome = input.value.trim();
  if (!nome) return;

  const agora = Date.now();
  const futuros = filtrarFuturos([...filaAtual]);
  ordenarFila(futuros);
  const ultimo = futuros[futuros.length - 1];
  const startAt = ultimo && ultimo.endAt ? ultimo.endAt : agora;
  const endAt = startAt + DURACAO_MINUTOS * 60000;
  const posicao = futuros.length;

  push(filaRef, {
    nome: nome,
    posicao: posicao,
    inicio: formatarHora(startAt),
    fim: formatarHora(endAt),
    startAt: startAt,
    endAt: endAt,
    criadoEm: Date.now()
  });

  input.value = "";
  input.focus();
};

window.limparFila = function limparFila() {
  remove(filaRef);
};

function aplicarTema(tema) {
  document.body.dataset.theme = tema;
  const btn = document.getElementById("btnTema");
  if (btn) {
    btn.textContent = tema === "light" ? "Modo escuro" : "Modo claro";
  }
}

window.alternarTema = function alternarTema() {
  const atual = document.body.dataset.theme === "light" ? "light" : "dark";
  const novo = atual === "light" ? "dark" : "light";
  aplicarTema(novo);
  localStorage.setItem("tema", novo);
};

const temaSalvo = localStorage.getItem("tema");
aplicarTema(temaSalvo === "light" ? "light" : "dark");
