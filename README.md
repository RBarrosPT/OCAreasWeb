# OCAreasWeb

Aplicação web em JavaScript (sem framework) para editar um mapa SVG por cores, com persistência local no browser e gestão de vários mapas guardados.

## Funcionalidades

- Coloração interativa de quadras no mapa SVG.
- Legenda por cor (notas por cor) e notas gerais do mapa.
- Lista de mapas guardados em `localStorage`.
- Indicador de estado (`Tudo guardado` / `Alterações por guardar`).
- Botão `Limpar Mapa` para iniciar um mapa em branco.
- Apagar mapas individuais diretamente na lista (ícone no item).
- Resumo por item guardado: `n.º de quadras | área total` (ex.: `6 | 8.12 ha`).
- Modal de definições (ícone ⚙️ no header) com:
  - Mostrar/Esconder setores de rega
  - Exportar JSON
  - Importar JSON
- Aviso ao sair da página com alterações não guardadas.
- Título do mapa apresentado acima do SVG.
- Regras de impressão: a secção `Lista de Mapas` é ocultada no `print`.

## Responsividade

Sim, a interface é responsiva.

- Em ecrãs pequenos, o layout reorganiza-se para coluna (mapa e painel).
- Os elementos de formulário e listas ajustam-se à largura disponível.
- O mapa SVG adapta-se à largura do contentor.
- O modal de definições usa largura relativa ao viewport para funcionar em mobile.

## Estrutura

- `index.html` — ponto de entrada da página.
- `styles.css` — estilos globais, responsividade, modal e impressão.
- `dados.js` — dados das quadras SVG.
- `app.js` — bootstrap da aplicação.
- `js/config.js` — configurações estáticas (paleta de cores, chave de storage).
- `js/storage.js` — leitura/escrita de dados no `localStorage`.
- `js/utils.js` — utilitários partilhados.
- `js/mapa-svg-app.js` — lógica principal da aplicação.

## Executar localmente

Como a app usa módulos ES (`type="module"`), deve ser servida por HTTP.

```bash
py -m http.server 8000
```

Abrir no browser:

```text
http://127.0.0.1:8000/
```

## Publicação

O projeto é compatível com GitHub Pages por ser estático (HTML/CSS/JS).

---

Desenvolvido por Ricardo Barros, 2025 v1.1
