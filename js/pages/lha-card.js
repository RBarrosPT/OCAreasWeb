import { escapeHtml } from "../utils.js?v=__ASSET_VERSION__";
import { calcularCaudal, calcularProdutoAplicado, calcularVelocidade } from "../helpers/lha-calculations.js?v=__ASSET_VERSION__";

function parseLocaleNumber(value, fallback) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  const numeric = Number.parseFloat(normalized);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatLocaleNumber(value, decimals = 2) {
  const fixed = Number(value).toFixed(decimals);
  return fixed
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(".", ",");
}

function renderResultBadge(label, value, unit) {
  return `<div class="home-lha-result-item"><span class="home-lha-result-label">${escapeHtml(label)}</span><span class="home-lha-result-value">${escapeHtml(value)} ${escapeHtml(unit)}</span></div>`;
}

function renderCaudalCalculationHelp() {
  return `
    <div class="home-lha-help">
      <div><strong>Descrição:</strong> Calcula o caudal total do atomizador e o caudal por bico.</div>
      <div><strong>Fórmula:</strong> Caudal (L/min) = (L/ha &times; largura (m) &times; velocidade (km/h)) / 600.</div>
      <div><strong>Nota:</strong> a constante 600 faz a conversão de unidades para hectares/minuto.</div>
    </div>
  `;
}

function renderProdutoAplicadoCalculationHelp() {
  return `
    <div class="home-lha-help">
      <div><strong>Descrição:</strong> Calcula quantos litros por hectare est&atilde;o a ser aplicados.</div>
      <div><strong>Fórmula:</strong> L/ha = (CaudalTotal (L/min) &times; 600) / (largura (m) &times; velocidade (km/h)).</div>
      <div><strong>Nota:</strong> CaudalTotal = caudal do bico &times; n&uacute;mero de bicos.</div>
    </div>
  `;
}

function renderVelocidadeCalculationHelp() {
  return `
    <div class="home-lha-help">
      <div><strong>Descrição:</strong> Calcula a velocidade necess&aacute;ria para atingir um volume alvo (L/ha).</div>
      <div><strong>Fórmula:</strong> Velocidade (km/h) = (CaudalTotal (L/min) &times; 600) / (largura (m) &times; L/ha).</div>
      <div><strong>Nota:</strong> mantendo o caudal fixo, menor velocidade aumenta os litros por hectare.</div>
    </div>
  `;
}

function buildCaudalResultHelper(values) {
  return calcularCaudal(
    values.litrosHectare,
    values.larguraTrabalho,
    values.velocidade,
    values.numBoquilhas,
  );
}

function buildProdutoAplicadoResultHelper(values) {
  return calcularProdutoAplicado(
    values.caudalBoquilha,
    values.numBoquilhas,
    values.larguraTrabalho,
    values.velocidade,
  );
}

function buildVelocidadeResultHelper(values) {
  return calcularVelocidade(
    values.caudalBoquilha,
    values.numBoquilhas,
    values.larguraTrabalho,
    values.litrosHectare,
  );
}

export function renderLhaCard(app) {
  const isCollapsed = Boolean(app.homeSectionCollapsed?.lhaCalculator);
  const config = app.lhaCalculatorConfig || {};

  const caudalConfig = config.caudal || {};
  const produtoConfig = config.produtoAplicado || {};
  const velocidadeConfig = config.velocidade || {};

  const litrosHectare = parseLocaleNumber(caudalConfig.litrosHectare, 400);
  const larguraTrabalhoCaudal = parseLocaleNumber(caudalConfig.larguraTrabalho, 5);
  const velocidadeCaudal = parseLocaleNumber(caudalConfig.velocidade, 6);
  const numBoquilhasCaudal = parseLocaleNumber(caudalConfig.numBoquilhas, 10);

  const caudalResultado = buildCaudalResultHelper({
    litrosHectare,
    larguraTrabalho: larguraTrabalhoCaudal,
    velocidade: velocidadeCaudal,
    numBoquilhas: numBoquilhasCaudal,
  });

  const caudalBoquilhaProduto = parseLocaleNumber(produtoConfig.caudalBoquilha, 2.5);
  const numBoquilhasProduto = parseLocaleNumber(produtoConfig.numBoquilhas, 12);
  const larguraTrabalhoProduto = parseLocaleNumber(produtoConfig.larguraTrabalho, 4.5);
  const velocidadeProduto = parseLocaleNumber(produtoConfig.velocidade, 5);

  const produtoAplicado = buildProdutoAplicadoResultHelper({
    caudalBoquilha: caudalBoquilhaProduto,
    numBoquilhas: numBoquilhasProduto,
    larguraTrabalho: larguraTrabalhoProduto,
    velocidade: velocidadeProduto,
  });

  const caudalBoquilhaVelocidade = parseLocaleNumber(velocidadeConfig.caudalBoquilha, 3);
  const numBoquilhasVelocidade = parseLocaleNumber(velocidadeConfig.numBoquilhas, 10);
  const larguraTrabalhoVelocidade = parseLocaleNumber(velocidadeConfig.larguraTrabalho, 5);
  const litrosHectareVelocidade = parseLocaleNumber(velocidadeConfig.litrosHectare, 450);

  const velocidadeNecessaria = buildVelocidadeResultHelper({
    caudalBoquilha: caudalBoquilhaVelocidade,
    numBoquilhas: numBoquilhasVelocidade,
    larguraTrabalho: larguraTrabalhoVelocidade,
    litrosHectare: litrosHectareVelocidade,
  });

  return `
    <div class="home-section card p-3">
      <div class="home-card-header d-flex align-items-center justify-content-between gap-2">
        <h3 class="mb-0">Cálculo L/Ha</h3>
        <button type="button" class="home-card-toggle btn btn-link" data-home-section-toggle="lhaCalculator" aria-expanded="${String(!isCollapsed)}" aria-label="${isCollapsed ? "Expandir" : "Colapsar"} card Cálculo L/Ha">
          <span class="home-card-toggle-icon ${isCollapsed ? "collapsed" : ""}">▾</span>
        </button>
      </div>
      ${isCollapsed ? "" : `
        <div class="home-card-body home-lha-body">
          <section class="home-lha-block home-lha-section" aria-labelledby="lha-caudal-title">
            <div class="home-lha-section-header">
              <h4 id="lha-caudal-title" class="h5 mb-1">1. Caudal de saída</h4>
              <p class="home-lha-section-description">Defina volume, largura, velocidade e número de bicos para obter o caudal ideal.</p>
            </div>
            <div class="home-sprayer-form row g-3 align-items-end">
              <div class="col-12 col-md-3">
                <label for="lha-caudal-litros-hectare" class="form-label mb-1">Volume (L/ha)</label>
                <input id="lha-caudal-litros-hectare" class="form-control form-control-sm" type="text" inputmode="decimal" value="${escapeHtml(formatLocaleNumber(litrosHectare))}">
              </div>
              <div class="col-12 col-md-3">
                <label for="lha-caudal-largura" class="form-label mb-1">Largura (m)</label>
                <input id="lha-caudal-largura" class="form-control form-control-sm" type="text" inputmode="decimal" value="${escapeHtml(formatLocaleNumber(larguraTrabalhoCaudal))}">
              </div>
              <div class="col-12 col-md-3">
                <label for="lha-caudal-velocidade" class="form-label mb-1">Velocidade (km/h)</label>
                <input id="lha-caudal-velocidade" class="form-control form-control-sm" type="text" inputmode="decimal" value="${escapeHtml(formatLocaleNumber(velocidadeCaudal))}">
              </div>
              <div class="col-12 col-md-3">
                <label for="lha-caudal-boquilhas" class="form-label mb-1">Nº bicos</label>
                <input id="lha-caudal-boquilhas" class="form-control form-control-sm" type="text" inputmode="numeric" value="${escapeHtml(formatLocaleNumber(numBoquilhasCaudal, 0))}">
              </div>
            </div>
            <div class="home-lha-result-grid mt-3">
              ${renderResultBadge("Caudal total", formatLocaleNumber(caudalResultado.total), "L/min")}
              ${renderResultBadge("Caudal por bocal", formatLocaleNumber(caudalResultado.porBocal), "L/min")}
            </div>
            ${renderCaudalCalculationHelp()}
          </section>

          <section class="home-lha-block home-lha-section" aria-labelledby="lha-produto-title">
            <div class="home-lha-section-header">
              <h4 id="lha-produto-title" class="h5 mb-1">2. Produto aplicado (L/ha)</h4>
              <p class="home-lha-section-description">Introduza o caudal por bico, nº de bicos, largura e velocidade para calcular a aplicação por hectare.</p>
            </div>
            <div class="home-sprayer-form row g-3 align-items-end">
              <div class="col-12 col-md-3">
                <label for="lha-produto-caudal" class="form-label mb-1">Caudal bico (L/min)</label>
                <input id="lha-produto-caudal" class="form-control form-control-sm" type="text" inputmode="decimal" value="${escapeHtml(formatLocaleNumber(caudalBoquilhaProduto))}">
              </div>
              <div class="col-12 col-md-3">
                <label for="lha-produto-boquilhas" class="form-label mb-1">Nº bicos</label>
                <input id="lha-produto-boquilhas" class="form-control form-control-sm" type="text" inputmode="numeric" value="${escapeHtml(formatLocaleNumber(numBoquilhasProduto, 0))}">
              </div>
              <div class="col-12 col-md-3">
                <label for="lha-produto-largura" class="form-label mb-1">Largura (m)</label>
                <input id="lha-produto-largura" class="form-control form-control-sm" type="text" inputmode="decimal" value="${escapeHtml(formatLocaleNumber(larguraTrabalhoProduto))}">
              </div>
              <div class="col-12 col-md-3">
                <label for="lha-produto-velocidade" class="form-label mb-1">Velocidade (km/h)</label>
                <input id="lha-produto-velocidade" class="form-control form-control-sm" type="text" inputmode="decimal" value="${escapeHtml(formatLocaleNumber(velocidadeProduto))}">
              </div>
            </div>
            <div class="home-lha-result-grid mt-3">
              ${renderResultBadge("Produto aplicado", formatLocaleNumber(produtoAplicado), "L/ha")}
            </div>
            ${renderProdutoAplicadoCalculationHelp()}
          </section>

          <section class="home-lha-block home-lha-section" aria-labelledby="lha-velocidade-title">
            <div class="home-lha-section-header">
              <h4 id="lha-velocidade-title" class="h5 mb-1">3. Velocidade de avanço</h4>
              <p class="home-lha-section-description">Com caudal e largura definidos, calcule a velocidade necessária para atingir o volume alvo.</p>
            </div>
            <div class="home-sprayer-form row g-3 align-items-end">
              <div class="col-12 col-md-3">
                <label for="lha-velocidade-caudal" class="form-label mb-1">Caudal bico (L/min)</label>
                <input id="lha-velocidade-caudal" class="form-control form-control-sm" type="text" inputmode="decimal" value="${escapeHtml(formatLocaleNumber(caudalBoquilhaVelocidade))}">
              </div>
              <div class="col-12 col-md-3">
                <label for="lha-velocidade-boquilhas" class="form-label mb-1">Nº bicos</label>
                <input id="lha-velocidade-boquilhas" class="form-control form-control-sm" type="text" inputmode="numeric" value="${escapeHtml(formatLocaleNumber(numBoquilhasVelocidade, 0))}">
              </div>
              <div class="col-12 col-md-3">
                <label for="lha-velocidade-largura" class="form-label mb-1">Largura (m)</label>
                <input id="lha-velocidade-largura" class="form-control form-control-sm" type="text" inputmode="decimal" value="${escapeHtml(formatLocaleNumber(larguraTrabalhoVelocidade))}">
              </div>
              <div class="col-12 col-md-3">
                <label for="lha-velocidade-litros-hectare" class="form-label mb-1">Volume alvo (L/ha)</label>
                <input id="lha-velocidade-litros-hectare" class="form-control form-control-sm" type="text" inputmode="decimal" value="${escapeHtml(formatLocaleNumber(litrosHectareVelocidade))}">
              </div>
            </div>
            <div class="home-lha-result-grid mt-3">
              ${renderResultBadge("Velocidade necessária", formatLocaleNumber(velocidadeNecessaria), "km/h")}
            </div>
            ${renderVelocidadeCalculationHelp()}
          </section>
        </div>
      `}
    </div>
  `;
}
