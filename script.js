const Bridge = {
    platform: 'web',
    init() {
        if (window.Telegram?.WebApp) { this.platform = 'tg'; Telegram.WebApp.ready(); Telegram.WebApp.expand(); }
        else if (typeof YaGames !== 'undefined') { YaGames.init().then(y => window.ysdk = y); this.platform = 'yandex'; }
        else if (typeof vkBridge !== 'undefined') { vkBridge.send("VKWebAppInit"); this.platform = 'vk'; }
    },
    showReward(callback) {
        if (this.platform === 'yandex' && window.ysdk) {
            ysdk.adv.showRewardedVideo({ callbacks: { onRewarded: () => callback(true), onError: () => callback(false) } });
        } else if (this.platform === 'vk') {
            vkBridge.send("VKWebAppShowNativeAds", {ad_format:"reward"}).then(d => callback(d.result)).catch(() => callback(false));
        } else { if(confirm("Посмотреть рекламу для ТУРБО x10?")) callback(true); }
    },
    save(data) { localStorage.setItem('ai_nomad_final_build_v12', JSON.stringify(data)); }
};

let state = { 
    money: 0, reach: 10, gems: 100, level: 1, xp: 0, nextXp: 100, autoIncome: 0, 
    reputation: 100, isCanceled: false, res: { chips: 0, code: 0 }, 
    inventory: { helmet: false, server: false },
    farm: { bot1: { count: 0, cost: 100, inc: 5 }, bot2: { count: 0, cost: 800, inc: 30 } },
    turbo: { active: false, time: 0 }, production: { chips: false, code: false }
};

let bots = [
    { name: "CryptoKing", money: 50000, level: 15 }, { name: "NeuralPunk", money: 35000, level: 12 },
    { name: "MemeLord", money: 20000, level: 10 }, { name: "GPT_Viper", money: 10000, level: 7 }
];

let currentOfferReward = 0;

const playSnd = (id) => { const s = document.getElementById(id); if(s){s.currentTime=0; s.play().catch(()=>{});} };
const showToast = (txt) => { const t = document.getElementById('toast'); t.innerText = txt; t.style.opacity = 1; setTimeout(() => t.style.opacity = 0, 2000); };

function showTab(e, id) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active'); e.currentTarget.classList.add('active');
}

document.getElementById('generate-btn').onclick = () => {
    if(state.isCanceled) return;
    playSnd('snd-click');
    let mult = (state.turbo.active ? 10 : 1);
    state.money += state.reach * mult; state.reach++;
    addXP(15 * (state.inventory.helmet ? 2 : 1) * (state.turbo.active ? 1.5 : 1));
    
    if(Math.random() > 0.94) state.res.chips++;
    if(Math.random() > 0.97) { state.reputation -= 5; if(state.reputation < 50) cancelPlayer(); }
    
    triggerRandomOffer();
    updateUI(); Bridge.save(state);
};

function triggerRandomOffer() {
    if (Math.random() > 0.97 && state.money > 500) {
        currentOfferReward = Math.floor(state.money * 0.4) + 1000;
        document.getElementById('offer-text').innerText = `Реклама пирамиды. Платят $${currentOfferReward.toLocaleString()}, но репутация -40%!`;
        document.getElementById('offer-overlay').style.display = 'block';
    }
}

function acceptOffer() {
    state.money += currentOfferReward; state.reputation -= 40;
    showToast("💸 Ты продался!");
    if (state.reputation < 50) cancelPlayer();
    closeModal('offer-overlay'); updateUI();
}

function cancelPlayer() {
    state.isCanceled = true; state.reputation = Math.max(0, state.reputation);
    document.getElementById('ai-output').innerHTML = "<span style='color:red'>ОТМЕНЕН (5с)</span>";
    setTimeout(() => { 
        state.isCanceled = false; state.reputation = 100;
        document.getElementById('ai-output').innerText = "Система онлайн";
        updateUI(); 
    }, 5000);
}

function addXP(amt) {
    state.xp += amt;
    while (state.xp >= state.nextXp) {
        state.xp -= state.nextXp; state.level++;
        state.nextXp = Math.floor(state.nextXp * 1.6);
        playSnd('snd-level'); showToast(`LVL ${state.level}`);
    }
}

function activateTurbo() {
    if(state.turbo.active) return;
    Bridge.showReward((success) => {
        if(success) {
            state.turbo.active = true; state.turbo.time = 30;
            document.getElementById('turbo-timer').style.display = 'block';
            let t = setInterval(() => {
                state.turbo.time--; document.getElementById('turbo-sec').innerText = state.turbo.time;
                if(state.turbo.time <= 0) { clearInterval(t); state.turbo.active = false; document.getElementById('turbo-timer').style.display = 'none'; }
            }, 1000);
        }
    });
}

function buyFarm(id, base, inc) {
    let price = Math.floor(base * Math.pow(1.15, state.farm[id].count));
    if (state.money >= price) {
        state.money -= price; state.farm[id].count++; state.autoIncome += inc;
        addXP(price * 0.2); updateUI(); Bridge.save(state);
    } else showToast("Мало денег!");
}

function startResourceProduction(type, cost, sec) {
    if (state.money < cost || state.production[type]) return;
    state.money -= cost; state.production[type] = true;
    const bar = document.getElementById(`progress-${type}`);
    bar.style.transition = `width ${sec}s linear`;
    setTimeout(() => bar.style.width = "100%", 50);
    setTimeout(() => {
        state.res[type]++; state.production[type] = false;
        bar.style.transition = "none"; bar.style.width = "0%";
        updateUI(); Bridge.save(state);
    }, sec * 1000);
    updateUI();
}

function craftItem(id, ch, cd) {
    if (state.res.chips >= ch && state.res.code >= cd) {
        state.res.chips -= ch; state.res.code -= cd; state.inventory[id] = true;
        updateUI(); Bridge.save(state);
    }
}

function openLeaderboard() {
    bots.forEach(b => b.money += Math.floor(Math.random() * 100));
    let list = [...bots, { name: "ТЫ", money: state.money, level: state.level, isPlayer: true }].sort((a,b)=>b.money-a.money);
    document.getElementById('leaderboard-list').innerHTML = list.slice(0, 10).map((p,i)=>`
        <div style="display:flex; justify-content:space-between; padding:5px; ${p.isPlayer?'color:var(--neon)':''}">
            <span>${i+1}. ${p.name}</span><span>$${Math.floor(p.money).toLocaleString()}</span>
        </div>`).join('');
    document.getElementById('leaderboard-overlay').style.display='block';
}

let gT = 0;
setInterval(() => { 
    if(!state.isCanceled) state.money += state.autoIncome; 
    if(state.inventory.server) { 
        gT++; if(gT >= 30) { state.gems++; gT = 0; } 
        const o = document.getElementById('mining-overlay'); o.style.display = 'block';
        const p = document.createElement('div'); p.className = 'mining-particle'; p.innerText = Math.round(Math.random());
        p.style.left = Math.random()*100+"vw"; p.style.animationDuration = (Math.random()*2+1)+"s";
        o.appendChild(p); setTimeout(()=>p.remove(), 2500);
    }
    updateUI(); 
}, 1000);

function openCase() {
    if (state.gems < 50) return showToast("Нужно 50 💎");
    state.gems -= 50; const strip = document.getElementById('items-strip'); const items = ['⚙️','💾','💎','👑','💩'];
    strip.innerHTML = ''; const pool = [];
    for(let i=0; i<60; i++) { const itm = items[Math.floor(Math.random()*items.length)]; pool.push(itm); let d = document.createElement('div'); d.className='strip-item'; d.innerText = itm; strip.appendChild(d); }
    document.getElementById('case-overlay').style.display='block'; document.getElementById('collect-btn').style.display='none';
    strip.style.transition = 'none'; strip.style.transform = 'translateX(0)';
    setTimeout(() => {
        strip.style.transition = 'transform 4s cubic-bezier(0.1, 0, 0.1, 1)';
        const winIdx = 55; const offset = -(winIdx * 80) + (document.getElementById('spinner-container').offsetWidth / 2) - 40;
        strip.style.transform = `translateX(${offset}px)`;
        setTimeout(() => {
            playSnd('snd-win'); const prize = pool[winIdx];
            document.getElementById('win-msg').innerText = `Приз: ${prize}`;
            document.getElementById('collect-btn').style.display='inline-block';
            if(prize === '⚙️') state.res.chips += 10; if(prize === '💾') state.res.code += 10; if(prize === '💎') state.gems += 200; if(prize === '👑') state.money += 5000;
            updateUI(); Bridge.save(state);
        }, 4100);
    }, 50);
}

function updateUI() {
    document.getElementById('money').innerText = Math.floor(state.money).toLocaleString();
    document.getElementById('reach').innerText = state.reach;
    document.getElementById('gems').innerText = state.gems;
    document.getElementById('level').innerText = state.level;
    document.getElementById('reputation').innerText = state.reputation;
    document.getElementById('res-chips').innerText = state.res.chips;
    document.getElementById('res-code').innerText = state.res.code;
    document.getElementById('total-auto-income').innerText = state.autoIncome;
    document.getElementById('xp-fill').style.width = (state.xp/state.nextXp*100) + "%";
    document.getElementById('fab-controls').className = state.level < 5 ? 'locked' : '';
    Object.keys(state.farm).forEach(id => {
        document.getElementById(`price-${id}`).innerText = Math.floor(state.farm[id].cost * Math.pow(1.15, state.farm[id].count)).toLocaleString();
        document.getElementById(`count-${id}`).innerText = state.farm[id].count;
    });
    if(state.inventory.helmet) { let b = document.getElementById('btn-craft-helmet'); b.innerText = "АКТИВНО"; b.disabled = true; b.style.background="#444"; }
    if(state.inventory.server) { let b = document.getElementById('btn-craft-server'); b.innerText = "АКТИВНО"; b.disabled = true; b.style.background="#444"; }
    document.getElementById('league-name').innerText = state.money > 100000 ? "Платина" : state.money > 10000 ? "Золото" : "Бронза";
    document.getElementById('rank').innerText = ["Новичок", "Блогер", "Техно-Маг", "AI Tycoon"][Math.min(Math.floor(state.level/5), 3)];
}

function processDonate(amt) { state.gems += amt; updateUI(); Bridge.save(state); closeModal('donate-overlay'); }
function closeModal(id) { document.getElementById(id).style.display='none'; }
function openDonateShop() { document.getElementById('donate-overlay').style.display='block'; }

window.onload = () => {
    Bridge.init();
    const saved = localStorage.getItem('ai_nomad_final_build_v12');
    if(saved) { state = {...state, ...JSON.parse(saved)}; }
    updateUI();
};
