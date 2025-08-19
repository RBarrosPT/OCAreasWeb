class MapaSVGApp {
	constructor() {
		this.showSetores = false;
		this.zoomLevel = 1.4;
		this.selectedColor = "#f9f9f9ff";
		this.itemColors = {};
		this.colorNames = {};
		this.notes = "";
		this.colors = [
			{ id: 2, color: "#FFFFFF", text: "#000000" },
			{ id: 1, color: "#000000", text: "#FFFFFF" },
			{ id: 3, color: "#FF0000", text: "#FFFFFF" },
			{ id: 4, color: "#00FF00", text: "#000000" },
			{ id: 5, color: "#0000FF", text: "#FFFFFF" },
			{ id: 6, color: "#FFFF00", text: "#000000" },
			{ id: 7, color: "#FF00FF", text: "#FFFFFF" },
			{ id: 8, color: "#00FFFF", text: "#000000" },
			{ id: 9, color: "#FF8000", text: "#000000" },
			{ id: 10, color: "#8000FF", text: "#FFFFFF" },
			{ id: 11, color: "#80FF00", text: "#000000" },
			{ id: 12, color: "#00BFFF", text: "#000000" },
			{ id: 13, color: "#FF66CC", text: "#000000" },
			{ id: 14, color: "#8B4513", text: "#FFFFFF" },
			{ id: 15, color: "#555555", text: "#FFFFFF" },
			{ id: 16, color: "#CCCCCC", text: "#000000" },
			{ id: 17, color: "#40E0D0", text: "#000000" },
			{ id: 18, color: "#FFD700", text: "#000000" },
			{ id: 19, color: "#000080", text: "#FFFFFF" },
			{ id: 20, color: "#006400", text: "#FFFFFF" },
		];
		this.init();
	}
	init() {
		// Inicializar todas as áreas com cor padrão
		if (typeof dadosOc !== "undefined") {
			// Cor padrão: id 2
			const defaultColor = this.colors.find((c) => c.id === 2)?.color || "#FFFFFF";
			dadosOc.forEach((item) => {
				this.itemColors[item.dataName] = defaultColor;
			});
		}

		this.render();
	}

	render() {
		const app = document.getElementById("app");
		app.innerHTML = `
            <div class="container">
                ${this.renderHeader()}
                <div class="main-content">
                    ${this.renderMap()}
                    ${this.renderColorPalette()}
                </div>
            </div>
        `;
		this.attachEventListeners();
	}

	renderHeader() {
		return `
            <div class="header">
                <div class="title">Outro Chão - Agricultura Biológica, Lda.</div>
                <div class="header-controls">
                    <div class="zoom-controls">
                        <button class="zoom-button" id="zoom-out">-</button>
                        <div class="zoom-text">${Math.round(this.zoomLevel * 100)}%</div>
                        <button class="zoom-button" id="zoom-in">+</button>
                    </div>
                    <button class="toggle-button" id="toggle-setores">
                        ${this.showSetores ? "Esconder Setores" : "Mostrar Setores"}
                    </button>
                </div>
            </div>
        `;
	}

	renderMap() {
		const baseViewBoxWidth = 800;
		const baseViewBoxHeight = 1350;
		const viewBoxWidth = baseViewBoxWidth / this.zoomLevel;
		const viewBoxHeight = baseViewBoxHeight / this.zoomLevel;

		return `
            <div class="map-container">
                <div class="svg-container">
                    <svg width="1350" height="800" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" style="border: 1px solid #ccc;">
                       ${this.renderSVGItems()}
                    </svg>
                </div>
            </div>
        `;
	}

	renderSVGItems() {
		if (typeof dadosOc === "undefined" || !dadosOc.length) {
			console.log("dadosOc não está definido ou está vazio");
			return '<text x="50" y="50" fill="red">Dados não carregados</text>';
		}

		return dadosOc
			.map((item, idx) => {
				const itemColor = this.itemColors[item.dataName] || "#f9f9f9ff";
				// Buscar o objeto de cor correspondente
				const colorObj = this.colors.find((c) => c.color === itemColor);
				const textColor = colorObj ? colorObj.text : "#000000";

				return `
				<g>
					<path d="${item.pathData}"
						  fill="${itemColor}"
						  stroke="#000000"
						  stroke-width="1"
						  data-item="${item.dataName}"
						  style="cursor: pointer;" />
					<text transform="${item.textTransform}" font-size="11" fill="${textColor}">
						<tspan x="${item.nomeTspanX}" y="${item.nomeTspanY}">${item.dataName}</tspan>
					</text>
					${
						this.showSetores
							? `
						<text transform="${item.setorTransform}" font-size="10" font-weight="bold" fill="#ff0000">
							<tspan x="${item.setorTspanX}" y="${item.setorTspanY}">${item.setorData}</tspan>
						</text>
						`
							: ""
					}
				</g>
			`;
			})
			.join("");
	}

	renderColorPalette() {
		return `
            <div class="color-palette">
                <div class="color-palette-title">Grupos</div>
                ${this.colors.map((colorItem) => this.renderColorRow(colorItem)).join("")}
                ${this.renderNotesSection()}
            </div>
        `;
	}

	renderColorRow(colorItem) {
		const count = this.getColorCount(colorItem.color);
		const area = this.getColorArea(colorItem.color);
		const percentage = this.getColorPercentage(colorItem.color);
		const isSelected = this.selectedColor === colorItem.color;

		// Visualização da amostra: cor sólida
		let sampleStyle = `background-color: ${colorItem.color}; color: ${colorItem.text};`;
		return `
            <div class="color-row">
                <div class="radio-button ${isSelected ? "selected" : ""}" data-color="${colorItem.color}">
                    ${isSelected ? '<div class="radio-button-inner"></div>' : ""}
                </div>
		  <div class="color-sample" style="${sampleStyle}" data-color="${colorItem.color}"></div>

		  <input type="text" class="color-input" placeholder="Notas" 
			  value="${this.colorNames[colorItem.color] || ""}"
			  data-color="${colorItem.color}">
	
                <div class="color-stats">
                    <span class="color-count">(${count})</span>
                    <span class="color-area">${area} ha</span>
                    <span class="color-percentage">${percentage}%</span>
                </div>
            </div>
        `;
	}

	renderNotesSection() {
		return `
            <div class="notes-section">
                <div class="notes-title">Notas Gerais</div>
                <textarea class="notes-input" placeholder="Adicione suas notas aqui...">${this.notes}</textarea>
            </div>
            <span class="color-percentage">@RB 2025</span>
        `;
	}

	attachEventListeners() {
		// Zoom controls
		document.getElementById("zoom-in")?.addEventListener("click", () => this.handleZoomIn());
		document.getElementById("zoom-out")?.addEventListener("click", () => this.handleZoomOut());
		document.getElementById("toggle-setores")?.addEventListener("click", () => this.toggleSetores());

		// SVG paths
		document.querySelectorAll("path[data-item]").forEach((path) => {
			path.addEventListener("click", (e) => {
				const itemName = e.target.getAttribute("data-item");
				this.handleItemPress(itemName);
			});
		});

		// Color selection
		document.querySelectorAll("[data-color]").forEach((element) => {
			if (element.classList.contains("radio-button") || element.classList.contains("color-sample")) {
				element.addEventListener("click", (e) => {
					const color = e.target.getAttribute("data-color");
					this.selectColor(color);
				});
			}
		});

		// Color names
		document.querySelectorAll(".color-input").forEach((input) => {
			input.addEventListener("change", (e) => {
				const color = e.target.getAttribute("data-color");
				this.updateColorName(color, e.target.value);
			});
		});

		// Notes
		document.querySelector(".notes-input")?.addEventListener("change", (e) => {
			this.updateNotes(e.target.value);
		});
	}

	// Event handlers
	handleZoomIn() {
		this.zoomLevel = Math.min(this.zoomLevel + 0.1, 2);
		this.render();
	}

	handleZoomOut() {
		this.zoomLevel = Math.max(this.zoomLevel - 0.1, 0.7);
		this.render();
	}

	toggleSetores() {
		this.showSetores = !this.showSetores;
		this.render();
	}

	selectColor(color) {
		this.selectedColor = color;
		this.render();
	}

	handleItemPress(itemName) {
		this.itemColors[itemName] = this.selectedColor;
		this.render();
	}

	updateColorName(color, name) {
		this.colorNames[color] = name;
	}

	updateNotes(text) {
		this.notes = text;
	}

	// Utility methods
	getColorCount(color) {
		return Object.values(this.itemColors).filter((itemColor) => itemColor === color).length;
	}

	getColorArea(color) {
		if (typeof dadosOc === "undefined") return "0.00";

		const selectedItems = Object.keys(this.itemColors).filter((itemName) => this.itemColors[itemName] === color);
		const totalArea = selectedItems.reduce((sum, itemName) => {
			const item = dadosOc.find((data) => data.dataName === itemName);
			const area = parseFloat(item?.area) || 0;
			return sum + area;
		}, 0);
		return totalArea.toFixed(2);
	}

	getTotalArea() {
		if (typeof dadosOc === "undefined") return 0;

		return dadosOc.reduce((sum, item) => {
			const area = parseFloat(item?.area) || 0;
			return sum + area;
		}, 0);
	}

	getColorPercentage(color) {
		const colorArea = parseFloat(this.getColorArea(color));
		const totalArea = this.getTotalArea();
		const percentage = totalArea > 0 ? (colorArea / totalArea) * 100 : 0;
		return percentage.toFixed(1);
	}
}

// Aguardar o carregamento da página antes de inicializar
document.addEventListener("DOMContentLoaded", function () {
	console.log("Página carregada, inicializando app...");
	console.log("dadosOc disponível:", typeof dadosOc !== "undefined" && dadosOc.length > 0);
	window.app = new MapaSVGApp();
});
