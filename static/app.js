const chat = document.querySelector("#chat");
const form = document.querySelector("#form");
const input = document.querySelector("#message");
const send = document.querySelector("#send");
const statusLine = document.querySelector("#status");
const emotionLine = document.querySelector("#emotion-status");
const fileInput = document.querySelector("#file");
const fileName = document.querySelector("#file-name");
const micButton = document.querySelector("#mic");
const voiceStatus = document.querySelector("#voice-status");

let mediaRecorder = null;
let recordedChunks = [];
let activeStream = null;
let isRecording = false;

function getLocalGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}
function updateWelcomeByLocalTime() {
  const heading = document.querySelector(".welcome h2");
  const paragraph = document.querySelector(".welcome p");
  if (heading) heading.textContent = `${getLocalGreeting()}! Eu sou a Aiyra.`;
  if (paragraph) paragraph.textContent = "Podemos conversar, organizar projetos ou criar histórias juntos.";
}
updateWelcomeByLocalTime();

function addMessage(text, who, extra = "") {
  const node = document.createElement("div");
  node.className = `message ${who} ${extra}`.trim();
  node.textContent = text;
  chat.appendChild(node);
  chat.scrollTop = chat.scrollHeight;
  return node;
}
function removeWelcome() {
  const welcome = chat.querySelector(".welcome");
  if (welcome) welcome.remove();
}
async function checkStatus() {
  try {
    const res = await fetch("/api/status");
    if (res.status === 401) { location.href = "/login"; return; }
    const data = await res.json();
    statusLine.textContent = data.ok
      ? (data.model_available ? `Online · ${data.model}` : `Ollama online · instale ${data.model}`)
      : "Ollama desconectado";
  } catch { statusLine.textContent = "Não foi possível verificar a conexão"; }
}
async function loadWelcome() {
  try {
    const res = await fetch("/api/welcome");
    if (res.status === 401) { location.href = "/login"; return; }
    const data = await res.json();
    const p = document.querySelector(".welcome p");
    if (p) p.textContent = data.message;
  } catch {}
}
async function sendMessage() {
  const text = input.value.trim();
  const file = fileInput.files[0];
  if (!text && !file) return;
  removeWelcome();
  addMessage((text || "Analise este arquivo") + (file ? `\n📎 ${file.name}` : ""), "user");
  input.value = "";
  input.style.height = "auto";
  send.disabled = true;
  const waiting = addMessage("Deixa eu pensar um pouquinho…", "ai");
  try {
    const body = new FormData();
    body.append("message", text);
    body.append("local_time", new Date().toString());
    if (file) body.append("file", file);
    const res = await fetch("/api/chat", {method: "POST", body});
    const data = await res.json();
    waiting.remove();
    if (res.status === 401) { location.href = "/login"; return; }
    if (!res.ok) addMessage(data.error || "Ocorreu um erro.", "ai", "error");
    else {
      addMessage(data.reply, "ai");
      emotionLine.textContent = `Estado: ${data.emotion || "neutra"}`;
    }
  } catch {
    waiting.remove();
    addMessage("Não consegui alcançar o servidor. Confira se o computador está ligado e conectado.", "ai", "error");
  } finally {
    fileInput.value = "";
    fileName.textContent = "";
    send.disabled = false;
    input.focus();
    checkStatus();
  }
}

function preferredAudioMimeType() {
  if (!window.MediaRecorder) return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) || "";
}

async function startRecording() {
  // O pedido de permissão precisa ser iniciado por um clique do usuário.
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    voiceStatus.textContent = "O Chrome só permite usar o microfone em uma conexão segura. Abra a Aiyra pelo endereço HTTPS do Tailscale (ou localhost no próprio computador).";
    return;
  }
  if (!window.MediaRecorder) {
    voiceStatus.textContent = "Este navegador não oferece gravação de áudio. Atualize o Chrome e tente novamente.";
    return;
  }
  try {
    voiceStatus.textContent = "Aguardando permissão do microfone do Chrome…";
    activeStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    recordedChunks = [];
    const mimeType = preferredAudioMimeType();
    mediaRecorder = new MediaRecorder(activeStream, mimeType ? {mimeType} : undefined);
    mediaRecorder.addEventListener("dataavailable", event => {
      if (event.data && event.data.size > 0) recordedChunks.push(event.data);
    });
    mediaRecorder.addEventListener("stop", transcribeRecording, {once: true});
    mediaRecorder.start();
    isRecording = true;
    micButton.textContent = "■";
    micButton.setAttribute("aria-pressed", "true");
    micButton.title = "Parar gravação";
    voiceStatus.textContent = "Gravando… toque no botão novamente para terminar.";
  } catch (error) {
    if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
      voiceStatus.textContent = "O acesso ao microfone foi bloqueado. No Chrome, toque no ícone à esquerda do endereço da Aiyra → Configurações do site → Microfone → Permitir. Depois recarregue a página e tente novamente.";
    } else if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
      voiceStatus.textContent = "Não encontrei um microfone disponível neste dispositivo.";
    } else if (error?.name === "NotReadableError" || error?.name === "TrackStartError") {
      voiceStatus.textContent = "O microfone está ocupado ou não pôde ser iniciado. Feche outros aplicativos que o estejam usando e tente novamente.";
    } else {
      voiceStatus.textContent = `Não consegui acessar o microfone (${error?.name || "erro desconhecido"}). Confira as permissões do Chrome.`;
    }
    stopTracks();
  }
}

function stopTracks() {
  if (activeStream) {
    activeStream.getTracks().forEach(track => track.stop());
    activeStream = null;
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording && mediaRecorder.state !== "inactive") {
    isRecording = false;
    micButton.disabled = true;
    micButton.textContent = "…";
    voiceStatus.textContent = "Enviando áudio ao computador para transcrição local…";
    mediaRecorder.stop();
  }
  stopTracks();
}

async function transcribeRecording() {
  try {
    const mime = recordedChunks[0]?.type || mediaRecorder?.mimeType || "audio/webm";
    const extension = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
    const blob = new Blob(recordedChunks, {type: mime});
    if (!blob.size) {
      voiceStatus.textContent = "A gravação ficou vazia. Tente novamente.";
      return;
    }
    const body = new FormData();
    body.append("audio", blob, `comando.${extension}`);
    const response = await fetch("/api/transcribe", {method: "POST", body});
    const data = await response.json();
    if (response.status === 401) { location.href = "/login"; return; }
    if (!response.ok) {
      voiceStatus.textContent = data.error || "Não consegui transcrever o áudio.";
      return;
    }
    input.value = data.text;
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 150) + "px";
    input.focus();
    voiceStatus.textContent = "Transcrição pronta. Revise o texto e pressione Enviar.";
  } catch {
    voiceStatus.textContent = "Falha ao enviar o áudio. Confira a conexão com a Aiyra.";
  } finally {
    recordedChunks = [];
    micButton.disabled = false;
    micButton.textContent = "🎙";
    micButton.setAttribute("aria-pressed", "false");
    micButton.title = "Gravar comando de voz";
    stopTracks();
  }
}

form.addEventListener("submit", e => { e.preventDefault(); sendMessage(); });
input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 150) + "px"; });
input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
});
fileInput.addEventListener("change", () => {
  fileName.textContent = fileInput.files[0] ? `Arquivo selecionado: ${fileInput.files[0].name}` : "";
});
micButton?.addEventListener("click", () => {
  if (isRecording) stopRecording();
  else startRecording();
});
document.querySelectorAll(".suggestion").forEach(b => b.addEventListener("click", () => { input.value = b.textContent; sendMessage(); }));
loadWelcome();
checkStatus();
