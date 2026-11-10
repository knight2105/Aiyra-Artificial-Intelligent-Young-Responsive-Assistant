(() => {
  const ranks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
  const suits = ["♠","♥","♦","♣"];
  let deck = [], player = [], dealer = [], finished = false, hideDealer = true;
  const $ = id => document.getElementById(id);
  const redSuit = suit => suit === "♥" || suit === "♦";
  function shuffle(items) { for (let i=items.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [items[i],items[j]]=[items[j],items[i]]; } return items; }
  function makeDeck() { deck=[]; for (const suit of suits) for (const rank of ranks) deck.push({rank,suit}); shuffle(deck); }
  function draw() { return deck.pop(); }
  function points(hand) { let total=0, aces=0; for (const c of hand) { if (c.rank === "A") {total+=11;aces++;} else if (["J","Q","K"].includes(c.rank)) total+=10; else total+=Number(c.rank); } while(total>21 && aces>0){total-=10;aces--;} return total; }
  function cardElement(card, hidden=false) { const el=document.createElement('div'); el.className='playing-card'+(hidden?' hidden':(!hidden&&redSuit(card.suit)?' red':'')); if(hidden){el.textContent='✦';el.setAttribute('aria-label','Carta virada para baixo');return el;} const rank=document.createElement('span');rank.className='rank';rank.textContent=card.rank;const suit=document.createElement('span');suit.className='suit';suit.textContent=card.suit;el.append(rank,suit);el.setAttribute('aria-label',`${card.rank} ${card.suit}`);return el; }
  function render() { $('dealer-cards').replaceChildren(); $('player-cards').replaceChildren(); dealer.forEach((c,i)=>$('dealer-cards').appendChild(cardElement(c,hideDealer&&i===1))); player.forEach(c=>$('player-cards').appendChild(cardElement(c))); $('player-title').textContent=`JOGADOR — ${points(player)} pontos`; $('dealer-title').textContent=hideDealer?'BANCA — ?':`BANCA — ${points(dealer)} pontos`; }
  function end(message) { finished=true;hideDealer=false;$('game-status').textContent=message;$('hit').disabled=true;$('stand').disabled=true;render(); }
  function newGame() { makeDeck();player=[draw(),draw()];dealer=[draw(),draw()];finished=false;hideDealer=true;$('hit').disabled=false;$('stand').disabled=false;$('game-status').textContent='Sua vez! Peça uma carta ou pare.';render();if(points(player)===21){if(points(dealer)===21)end('Empate! Os dois fizeram 21.');else end('BLACKJACK! Você ganhou!');} }
  function hit() { if(finished)return;player.push(draw());const p=points(player);render();if(p>21)end('Você estourou 21! A banca venceu.');else if(p===21)stand(); }
  function stand() { if(finished)return;hideDealer=false;while(points(dealer)<17&&deck.length)dealer.push(draw());const p=points(player),d=points(dealer);if(d>21)end('A banca estourou! Você ganhou!');else if(p>d)end('Você ganhou!');else if(p<d)end('A banca ganhou.');else end('Empate!'); }
  $('hit').addEventListener('click',hit);$('stand').addEventListener('click',stand);$('new-game').addEventListener('click',newGame);newGame();
})();
