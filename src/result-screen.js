const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function resultScreen(r){
 const values=[['Gold',r.gold],['Gems',r.gems??0],['Battle XP',r.xp??(r.won?50:20)]];
 return `<section class="battle-result ${r.won?'victory':'defeat'}" data-result-id="${escape(r.id)}" aria-label="${r.won?'Victory':'Defeat'} battle results">
 <div class="result-canvas"><img class="result-background" src="/pirate-bash/public/menu-art/${r.won?'victory':'defeat'}-full.jpg" alt="${r.won?'Victorious pirate beside the battle rewards board':'Defeated pirate beside the battle rewards board'}">
 ${!r.won&&!r.rematch&&!r.rematchAsked?'<button class="result-rematch" data-action="rematch" aria-label="Demand a rematch"><img src="/pirate-bash/public/menu-art/rematch__e48b14f8.png" alt=""></button>':''}
 ${r.won?'<button class="result-port-button" data-action="return"><span aria-hidden="true">⚓</span> Return to port <span aria-hidden="true">⚓</span></button>':''}
 <dl class="result-values">${values.map(([label,value],i)=>`<div class="result-value value-${i}"><dt class="sr-only">${label}</dt><dd data-reward="${label}">+${Math.floor(value).toLocaleString()}</dd></div>`).join('')}</dl></div>
 <footer class="result-footer"><div class="result-summary"><strong>${escape(r.enemyName)} · ${r.turns??'—'} turns</strong></div>
 <div class="result-actions"></div></footer>
 </section>`;
}

export async function preloadResult(won){const img=new Image();img.src='/pirate-bash/public/menu-art/'+(won?'victory':'defeat')+'-full.jpg';await img.decode();}
