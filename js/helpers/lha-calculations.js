const CONSTANTE_CONVERSAO = 600;

function normalizePositiveNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatFixed(value, decimals = 2) {
  return Number(value).toFixed(decimals);
}

export function calcularCaudal(litrosHectare, larguraTrabalho, velocidade, numBoquilhas = 1) {
  const litros = normalizePositiveNumber(litrosHectare);
  const largura = normalizePositiveNumber(larguraTrabalho);
  const velocidadeAvanco = normalizePositiveNumber(velocidade);
  const boquilhas = normalizePositiveNumber(numBoquilhas, 1);

  if (!litros || !largura || !velocidadeAvanco || !boquilhas) {
    return {
      total: formatFixed(0),
      porBocal: formatFixed(0),
    };
  }

  const caudalTotal = (litros * largura * velocidadeAvanco) / CONSTANTE_CONVERSAO;
  const caudalPorBocal = caudalTotal / boquilhas;

  return {
    total: formatFixed(caudalTotal),
    porBocal: formatFixed(caudalPorBocal),
  };
}

export function calcularProdutoAplicado(caudalBoquilha, numBoquilhas, larguraTrabalho, velocidade) {
  const caudal = normalizePositiveNumber(caudalBoquilha);
  const boquilhas = normalizePositiveNumber(numBoquilhas);
  const largura = normalizePositiveNumber(larguraTrabalho);
  const velocidadeAvanco = normalizePositiveNumber(velocidade);

  if (!caudal || !boquilhas || !largura || !velocidadeAvanco) {
    return formatFixed(0);
  }

  const caudalTotal = caudal * boquilhas;
  const litrosHectare = (caudalTotal * CONSTANTE_CONVERSAO) / (largura * velocidadeAvanco);

  return formatFixed(litrosHectare);
}

export function calcularVelocidade(caudalBoquilha, numBoquilhas, larguraTrabalho, litrosHectare) {
  const caudal = normalizePositiveNumber(caudalBoquilha);
  const boquilhas = normalizePositiveNumber(numBoquilhas);
  const largura = normalizePositiveNumber(larguraTrabalho);
  const litros = normalizePositiveNumber(litrosHectare);

  if (!caudal || !boquilhas || !largura || !litros) {
    return formatFixed(0);
  }

  const caudalTotal = caudal * boquilhas;
  const velocidadeAvanco = (caudalTotal * CONSTANTE_CONVERSAO) / (largura * litros);

  return formatFixed(velocidadeAvanco);
}
