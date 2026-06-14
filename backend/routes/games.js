import express from "express";

export const gamesRouter = express.Router();

function getTodayIsoDate() {
	return new Date().toISOString().slice(0, 10);
}

function getTodayUsDate() {
	const now = new Date();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const year = String(now.getFullYear());
	return `${month}/${day}/${year}`;
}

function normalizeGamesList(payload) {
	if (Array.isArray(payload?.games)) {
		return payload.games;
	}

	if (Array.isArray(payload)) {
		return payload;
	}

	return [];
}

gamesRouter.get("/today", async (_req, res) => {
	try {
		const response = await fetch("https://worldcup26.ir/get/games");
		if (!response.ok) {
			return res.status(502).json({ error: "Falha ao obter jogos do serviço externo." });
		}

		const payload = await response.json();
		const today = getTodayIsoDate();
		const todayUs = getTodayUsDate();
		const games = normalizeGamesList(payload)
			.filter((game) => {
				const localDate = String(game?.local_date || "").trim();
				if (localDate.startsWith(todayUs)) {
					return true;
				}

				const isoDate = String(game?.date || "").trim();
				return isoDate.startsWith(today);
			})
			.map((game) => ({
				id: game?.id || null,
				date: String(game?.date || ""),
				localDate: String(game?.local_date || ""),
				group: String(game?.group || ""),
				homeTeam: String(game?.home_team_name_en || ""),
				awayTeam: String(game?.away_team_name_en || ""),
				stadium: String(game?.stadium_name_en || ""),
			}));

		return res.json({
			today,
			count: games.length,
			games,
		});
	} catch {
		return res.status(500).json({ error: "Não foi possível carregar os jogos de hoje." });
	}
});