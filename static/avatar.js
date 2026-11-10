(() => {
  const avatar = document.querySelector('#aiyra-avatar');
  if (!avatar) return;
  const mood = document.querySelector('#avatar-mood');
  const emotionLine = document.querySelector('#emotion-status');
  const chat = document.querySelector('#chat');
  const moods = {
    neutra: 'Estou aqui com você.',
    curiosa: 'Isso despertou minha curiosidade!',
    feliz: 'Fico feliz em conversar com você.',
    pensativa: 'Estou organizando minhas ideias…',
    acolhedora: 'Pode contar comigo.',
    empolgada: 'Vamos nessa! ✨',
    tímida: 'Hehe… estou ouvindo.',
  };
  function syncEmotion() {
    const match = (emotionLine?.textContent || '').match(/Estado:\s*(.+)/i);
    const emotion = (match?.[1] || 'neutra').trim().toLocaleLowerCase('pt-BR');
    avatar.dataset.emotion = moods[emotion] ? emotion : 'neutra';
    if (mood) mood.textContent = moods[avatar.dataset.emotion];
  }
  function syncSpeaking() {
    if (!chat) return;
    const lastAI = [...chat.querySelectorAll('.message.ai')].at(-1);
    const speaking = !!lastAI && /pensar um pouquinho|pesquisando|aguarde/i.test(lastAI.textContent || '');
    avatar.classList.toggle('is-speaking', speaking);
    if (speaking && mood) mood.textContent = 'Estou pensando…';
    else syncEmotion();
  }
  if (emotionLine) new MutationObserver(syncEmotion).observe(emotionLine, {childList:true,characterData:true,subtree:true});
  if (chat) new MutationObserver(syncSpeaking).observe(chat, {childList:true,subtree:true,characterData:true});
  syncEmotion(); syncSpeaking();
})();
