import { useEffect, useMemo, useState } from "react";
import { useWebSocketGame } from "./hooks/useWebSocketGame";
import { initRenderer } from "./game/engine/renderer";
import { useTwitchAuth } from "./hooks/useTwitchAuth";

function App() {
  const [roomId] = useState("demo-room");
  const [userId] = useState(() => `user-${Math.floor(Math.random() * 10000)}`);
  const { status, players, connect, sendCreateCharacter, sendStartBattle } = useWebSocketGame({
    roomId,
    userId,
  });
  const twitch = useTwitchAuth();
  const [form, setForm] = useState({
    name: "Viewer Hero",
    clazz: "warrior",
    health: 80,
    damage: 15,
    armor: 5,
    speed: 10,
    abilities: "slash,dash",
    pool: 100,
  });

  useEffect(() => {
    connect();
    initRenderer("#gpu-canvas").catch((err) => console.error("WebGPU init failed", err));
  }, [connect]);

  const channelPointsInfo = useMemo(
    () => ({
      available: form.pool,
      spent: form.health + form.damage + form.armor + form.speed,
    }),
    [form],
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: "100vh" }}>
      <aside style={{ padding: "1rem", borderRight: "1px solid #222" }}>
        <h1>Battle Twitchers</h1>
        <p>Estado: {status}</p>
        <section style={{ marginBottom: "1rem" }}>
          {twitch.isAuthenticated ? (
            <div>
              <p>Conectado a Twitch ✅</p>
              <button onClick={twitch.logout}>Cerrar sesión</button>
            </div>
          ) : (
            <button onClick={twitch.login} disabled={twitch.loading}>
              {twitch.loading ? "Conectando..." : "Login con Twitch"}
            </button>
          )}
          {twitch.error && <p style={{ color: "salmon" }}>Error: {twitch.error}</p>}
        </section>
        <section style={{ marginBottom: "1rem" }}>
          <h3>Crear personaje</h3>
          <label>Nombre</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            style={{ width: "100%" }}
          />
          <label>Clase</label>
          <select
            value={form.clazz}
            onChange={(e) => setForm((f) => ({ ...f, clazz: e.target.value }))}
            style={{ width: "100%" }}
          >
            <option value="warrior">Guerrero</option>
            <option value="mage">Mago</option>
            <option value="archer">Arquero</option>
          </select>
          <label>Stats (gasta puntos)</label>
          {(["health", "damage", "armor", "speed"] as const).map((key) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 70 }}>{key}</span>
              <input
                type="number"
                value={form[key]}
                min={0}
                onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                style={{ flex: 1 }}
              />
            </div>
          ))}
          <label>Habilidades (csv)</label>
          <input
            value={form.abilities}
            onChange={(e) => setForm((f) => ({ ...f, abilities: e.target.value }))}
            style={{ width: "100%" }}
          />
          <p>
            Puntos usados: {channelPointsInfo.spent} / {channelPointsInfo.available}
          </p>
          <button
            onClick={() =>
              sendCreateCharacter({
                name: form.name,
                clazz: form.clazz,
                stats: {
                  health: form.health,
                  damage: form.damage,
                  armor: form.armor,
                  speed: form.speed,
                  abilities: form.abilities.split(",").map((a) => a.trim()),
                },
              })
            }
            disabled={channelPointsInfo.spent > channelPointsInfo.available}
          >
            Guardar personaje
          </button>
        </section>
        <section>
          <button style={{ marginTop: 8 }} onClick={sendStartBattle}>
            Iniciar batalla
          </button>
        </section>
        <h3>Jugadores</h3>
        <ul>
          {players.map((p) => (
            <li key={p.userId}>
              {p.userId} - {p.character?.name ?? "sin personaje"}
            </li>
          ))}
        </ul>
      </aside>
      <main>
        <canvas id="gpu-canvas" style={{ width: "100%", height: "100%", display: "block" }} />
      </main>
    </div>
  );
}

export default App;

