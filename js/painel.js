import { db, ref, onValue } from "./firebase.js";

const filaRef = ref(db, "fila");
const DURACAO_MINUTOS = 10;
let filaCache = [];

function atualizarTexto(id, texto) {
  const el = document.getElementById(id);
  if (el) el.innerText = texto;
}

function setFinalizado(ativo) {
  document.body.classList.toggle("finalizado", ativo);
}

function atualizarRelogio() {
  const agora = new Date();
  const hora = agora.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  atualizarTexto("relogio", `RELOGIO: ${hora}`);
}

atualizarRelogio();
setInterval(atualizarRelogio, 1000);

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

function renderizarPainel() {
  const agoraMs = Date.now();
  const lista = filtrarFuturos([...filaCache]);
  ordenarFila(lista);

  if (lista.length === 0) {
    setFinalizado(true);
    atualizarTexto("agora", "AGORA: periodo de oracao finalizado");
    atualizarTexto("proximo", "PROXIMO: deus abencoe a todos");
    atualizarTexto("fila", "FILA: -");
    return;
  }
  setFinalizado(false);

  const indexAtual = lista.findIndex(
    (p) =>
      p.startAt !== undefined &&
      p.endAt !== undefined &&
      p.startAt <= agoraMs &&
      agoraMs < p.endAt
  );

  if (indexAtual === -1) {
    const proximo = lista[0];
    atualizarTexto("agora", "AGORA: aguardando");
    atualizarTexto(
      "proximo",
      proximo
        ? `PROXIMO: ${proximo.nome} (${proximo.inicio} - ${proximo.fim})`
        : "PROXIMO: -"
    );
    const nomes = lista.slice(1).map((p) => p.nome);
    atualizarTexto("fila", nomes.length ? `FILA: ${nomes.join(" | ")}` : "FILA: -");
    return;
  }

  const atual = lista[indexAtual];
  const proximo = lista[indexAtual + 1];

  atualizarTexto(
    "agora",
    `AGORA: ${atual.nome} (${atual.inicio} - ${atual.fim})`
  );

  if (proximo) {
    atualizarTexto(
      "proximo",
      `PROXIMO: ${proximo.nome} (${proximo.inicio} - ${proximo.fim})`
    );
  } else {
    atualizarTexto("proximo", "PROXIMO: -");
  }

  const nomes = lista.slice(indexAtual + 2).map((p) => p.nome);
  atualizarTexto("fila", nomes.length ? `FILA: ${nomes.join(" | ")}` : "FILA: -");
}

onValue(filaRef, (snapshot) => {
  const dados = snapshot.val();
  const listaRaw = dados ? Object.values(dados) : [];
  const baseMs = Date.now();
  filaCache = listaRaw.map((pessoa, index) =>
    normalizarRegistro(pessoa, baseMs, index)
  );
  renderizarPainel();
});

setInterval(renderizarPainel, 1000);
