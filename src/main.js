import { supabase } from './supabaseClient.js';
import { FlappyGame } from './game.js';

// Elementos del DOM
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');

const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const bestScoreEl = document.getElementById('best-score');
const totalGamesEl = document.getElementById('total-games');

const canvas = document.getElementById('flappy-canvas');
const currentScoreEl = document.getElementById('current-score');
const gameOverlay = document.getElementById('game-overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayDesc = document.getElementById('overlay-desc');
const overlaySummary = document.getElementById('overlay-summary');
const btnStart = document.getElementById('btn-start');
const historyBody = document.getElementById('history-body');

let currentUser = null;
let personalBest = 0;

// Inicializar juego
const game = new FlappyGame(
  canvas,
  (score) => {
    currentScoreEl.textContent = score;
  },
  async ({ score, duration }) => {
    await handleGameOver(score, duration);
  }
);

// Controles de salto (ratón/táctil y teclado)
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (game.isRunning) game.flap();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    if (!gameScreen.classList.contains('hidden')) {
      e.preventDefault();
      if (game.isRunning) {
        game.flap();
      } else if (!gameOverlay.classList.contains('hidden')) {
        startNewRound();
      }
    }
  }
});

btnStart.addEventListener('click', startNewRound);

function startNewRound() {
  gameOverlay.classList.add('hidden');
  overlaySummary.classList.add('hidden');
  game.start();
}

// Autenticación con Google
btnLogin.addEventListener('click', async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) alert('Error al iniciar sesión: ' + error.message);
});

btnLogout.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// Cargar perfil e historial desde PostgreSQL
async function loadPlayerProfileAndHistory() {
  if (!currentUser) return;

  const { data, error } = await supabase
    .from('partidas')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error cargando partidas:', error);
    return;
  }

  const partidas = data || [];
  totalGamesEl.textContent = partidas.length;

  // Calcular el mejor puntaje del jugador
  personalBest = partidas.reduce((max, p) => Math.max(max, p.puntuacion), 0);
  bestScoreEl.textContent = personalBest;

  renderHistoryTable(partidas);
}

function renderHistoryTable(partidas) {
  if (partidas.length === 0) {
    historyBody.innerHTML = `
      <tr>
        <td colspan="4" class="muted">Aún no has jugado ninguna partida. ¡Pulsa Jugar ahora!</td>
      </tr>
    `;
    return;
  }

  historyBody.innerHTML = partidas
    .map((p) => {
      const fechaFmt = new Date(p.fecha).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      const isBest = p.puntuacion === personalBest && personalBest > 0;
      return `
        <tr>
          <td>${fechaFmt}</td>
          <td><strong>${p.puntuacion}</strong></td>
          <td>${p.duracion}s</td>
          <td class="${isBest ? 'badge-record' : 'badge-normal'}">
            ${isBest ? '🏆 Récord' : p.resultado}
          </td>
        </tr>
      `;
    })
    .join('');
}

// Guardar partida al terminar
async function handleGameOver(score, duration) {
  const isNewRecord = score > personalBest && score > 0;
  const resultadoTexto = isNewRecord ? 'Nuevo Récord' : 'Completada';

  overlayTitle.textContent = '¡Fin del vuelo!';
  overlayDesc.textContent = 'Tu partida se ha guardado en tu perfil.';
  overlaySummary.innerHTML = `
    <div>Puntuación obtenida: <strong>${score}</strong></div>
    <div>Duración: <strong>${duration} segundos</strong></div>
    ${isNewRecord ? '<div class="new-record">🏆 ¡NUEVO RÉCORD PERSONAL!</div>' : `<div>Mejor puntaje actual: <strong>${personalBest}</strong></div>`}
  `;
  overlaySummary.classList.remove('hidden');
  btnStart.textContent = 'Volver a jugar';
  gameOverlay.classList.remove('hidden');

  if (!currentUser) return;

  const { error } = await supabase.from('partidas').insert([
    {
      user_id: currentUser.id,
      resultado: resultadoTexto,
      puntuacion: score,
      duracion: duration
    }
  ]);

  if (error) {
    console.error('Error guardando partida:', error);
  } else {
    await loadPlayerProfileAndHistory();
  }
}

// Escuchar estado de sesión
btnLogin.addEventListener('click', async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        prompt: 'select_account'
      }
    }
  });
  if (error) alert('Error al iniciar sesión: ' + error.message);
});
supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    currentUser = session.user;
    const meta = currentUser.user_metadata || {};

    userName.textContent = meta.full_name || meta.name || 'Jugador';
    userEmail.textContent = currentUser.email || '';
    userAvatar.src = meta.avatar_url || 'https://ui-avatars.com/api/?name=Jugador';

    loginScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    await loadPlayerProfileAndHistory();
  } else {
    currentUser = null;
    gameScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
  }
});