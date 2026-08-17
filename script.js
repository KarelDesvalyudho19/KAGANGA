'use strict';

/* ==========================================================================
   DIAGA â€” script.js  (v2)
   1. AKSARA_DATA      â€” Konstanta Unicode Rejang
   2. AbugidaEngine    â€” Parser suku kata dua arah (Latinâ†”Kaganga)
   3. SpaceDust        â€” Partikel Canvas
   4. GalleryGenerator â€” Grid aksara
   5. Converter        â€” Konverter dua arah + toggle + salin
   6. VirtualKeyboard  â€” Papan ketik virtual (#ketik)
   7. QuizEngine       â€” Kuis 3 level (#belajar)
   8. GSAPAnimations   â€” Animasi scroll
   9. VanillaTilt      â€” Efek tilt batik
   10. Navbar          â€” Scroll + mobile menu
   11. Bootstrap       â€” Init semua modul
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. DATA AKSARA KAGANGA
   -------------------------------------------------------------------------- */
const AKSARA_KAGANGA = Object.freeze([
  { char:'\uA930', latin:'Ka',  bunyi:'"Ka" seperti kata Kala' },
  { char:'\uA931', latin:'Ga',  bunyi:'"Ga" seperti kata Gajah' },
  { char:'\uA932', latin:'Nga', bunyi:'"Nga" seperti kata Nganga' },
  { char:'\uA933', latin:'Ta',  bunyi:'"Ta" seperti kata Tala' },
  { char:'\uA934', latin:'Da',  bunyi:'"Da" seperti kata Dara' },
  { char:'\uA935', latin:'Na',  bunyi:'"Na" seperti kata Naga' },
  { char:'\uA936', latin:'Pa',  bunyi:'"Pa" seperti kata Padi' },
  { char:'\uA937', latin:'Ba',  bunyi:'"Ba" seperti kata Batu' },
  { char:'\uA938', latin:'Ma',  bunyi:'"Ma" seperti kata Madu' },
  { char:'\uA939', latin:'Ca',  bunyi:'"Ca" seperti kata Cakra' },
  { char:'\uA93A', latin:'Ja',  bunyi:'"Ja" seperti kata Jala' },
  { char:'\uA93B', latin:'Nya', bunyi:'"Nya" seperti kata Nyala' },
  { char:'\uA93C', latin:'Sa',  bunyi:'"Sa" seperti kata Satu' },
  { char:'\uA93D', latin:'Ra',  bunyi:'"Ra" seperti kata Raja' },
  { char:'\uA93E', latin:'La',  bunyi:'"La" seperti kata Laut' },
  { char:'\uA93F', latin:'Ya',  bunyi:'"Ya" seperti kata Yakin' },
  { char:'\uA940', latin:'Wa',  bunyi:'"Wa" seperti kata Waja' },
  { char:'\uA941', latin:'Ha',  bunyi:'"Ha" seperti kata Hari' },
  { char:'\uA942', latin:'Mba', bunyi:'"Mba" â€” konsonan rangkap Mb' },
  { char:'\uA943', latin:'Ngga',bunyi:'"Ngga" â€” konsonan rangkap Ngg' },
  { char:'\uA944', latin:'Nda', bunyi:'"Nda" â€” konsonan rangkap Nd' },
]);

const VOWEL_DIACRITICS = Object.freeze([
  { char:'\uA947', latin:'i'  },
  { char:'\uA948', latin:'u'  },
  { char:'\uA949', latin:'e'  },
  { char:'\uA94A', latin:'ai' },
  { char:'\uA94B', latin:'o'  },
  { char:'\uA94C', latin:'au' },
  { char:'\uA94D', latin:'eu' },
  { char:'\uA94E', latin:'ea' },
]);

const CODA_DIACRITICS = Object.freeze([
  { char:'\uA94F', latin:'ng' },
  { char:'\uA950', latin:'n'  },
  { char:'\uA951', latin:'r'  },
  { char:'\uA952', latin:'h'  },
]);

/* --------------------------------------------------------------------------
   2. ABUGIDA ENGINE â€” Tokenisasi Suku Kata Dua Arah
   -------------------------------------------------------------------------- */
const AbugidaEngine = (() => {
  const A_LETTER = '\uA946';
  const VIRAMA   = '\uA953';

  // ONSET: kunci = konsonan TANPA vokal bawaan /a/
  const ONSET = [
    ['ngg','\uA943'],['nd','\uA944'],['mb','\uA942'],
    ['ng', '\uA932'],['ny','\uA93B'],
    ['k','\uA930'],['g','\uA931'],['t','\uA933'],['d','\uA934'],
    ['n','\uA935'],['p','\uA936'],['b','\uA937'],['m','\uA938'],
    ['c','\uA939'],['j','\uA93A'],['s','\uA93C'],['r','\uA93D'],
    ['l','\uA93E'],['y','\uA93F'],['w','\uA940'],['h','\uA941'],
  ];

  const VOWEL = [
    ['ea','\uA94E'],['ai','\uA94A'],['au','\uA94C'],['eu','\uA94D'],
    ['i','\uA947'],['u','\uA948'],['e','\uA949'],['o','\uA94B'],['a',''],
  ];

  const SIMPLE_CODA = [
    ['ng','\uA94F'],['n','\uA950'],['r','\uA951'],['h','\uA952'],
  ];

  const R_ONSET = new Map(ONSET.map(([k,v])=>[v,k]));
  const R_VOWEL = new Map(VOWEL.filter(([,v])=>v).map(([k,v])=>[v,k]));
  const R_CODA  = new Map(SIMPLE_CODA.map(([k,v])=>[v,k]));

  function matchFirst(arr, str, pos) {
    for (const [key,val] of arr)
      if (str.startsWith(key,pos)) return {key,val,len:key.length};
    return null;
  }

  // Apakah pos memulai onset+vokal yang valid (suku kata baru)?
  function startsNewSyllable(str, pos) {
    for (const [key] of ONSET) {
      if (!str.startsWith(key,pos)) continue;
      const after = pos + key.length;
      if (after >= str.length || !/[a-z]/.test(str[after])) return true;
      if (matchFirst(VOWEL, str, after) !== null) return true;
    }
    return false;
  }

  function matchCoda(str, pos) {
    for (const [key,val] of SIMPLE_CODA) {
      if (!str.startsWith(key,pos)) continue;
      if (startsNewSyllable(str, pos)) continue;
      const after = pos + key.length;
      if (!matchFirst(VOWEL, str, after)) return {key,val,len:key.length};
    }
    for (const [key,val] of ONSET) {
      if (!str.startsWith(key,pos)) continue;
      if (startsNewSyllable(str, pos)) break;
      const after = pos + key.length;
      if (!matchFirst(VOWEL, str, after)) return {key,val:val+VIRAMA,len:key.length};
      break;
    }
    return null;
  }

  function latinToKaganga(text) {
    const s = text.toLowerCase();
    let out = '', i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (!/[a-z]/.test(ch)) { out += ch; i++; continue; }
      const onset = matchFirst(ONSET, s, i);
      if (onset) {
        const vPos = i + onset.len;
        const vowel = matchFirst(VOWEL, s, vPos);
        if (vowel !== null) {
          i = vPos + vowel.len;
          const coda = matchCoda(s, i);
          out += onset.val + vowel.val + (coda ? coda.val : '');
          if (coda) i += coda.len;
        } else {
          const atEnd = vPos >= s.length || !/[a-z]/.test(s[vPos]);
          out += onset.val + (atEnd ? '' : VIRAMA);
          i = vPos;
        }
      } else {
        const vowel = matchFirst(VOWEL, s, i);
        if (vowel !== null) {
          i += vowel.len;
          out += vowel.key === 'a' ? A_LETTER : A_LETTER + vowel.val;
          const coda = matchCoda(s, i);
          if (coda) { out += coda.val; i += coda.len; }
        } else { out += ch; i++; }
      }
    }
    return out;
  }

  function kagangaToLatin(text) {
    let out = '', i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (ch === A_LETTER) {
        const nx = text[i+1];
        if (nx && R_VOWEL.has(nx)) { out += R_VOWEL.get(nx); i += 2; }
        else { out += 'a'; i++; }
        const nx2 = text[i];
        if (nx2 && R_CODA.has(nx2)) { out += R_CODA.get(nx2); i++; }
      } else if (R_ONSET.has(ch)) {
        const base = R_ONSET.get(ch);
        const nx = text[i+1];
        if (nx === VIRAMA) { out += base; i += 2; }
        else if (nx && R_VOWEL.has(nx)) {
          out += base + R_VOWEL.get(nx); i += 2;
          const nx2 = text[i];
          if (nx2 && R_CODA.has(nx2)) { out += R_CODA.get(nx2); i++; }
        } else {
          out += base + 'a'; i++;
          const nx2 = text[i];
          if (nx2 && R_CODA.has(nx2)) { out += R_CODA.get(nx2); i++; }
        }
      } else if (R_CODA.has(ch)) { out += R_CODA.get(ch); i++; }
      else if (ch === VIRAMA) { i++; }
      else { out += ch; i++; }
    }
    return out;
  }

  return { latinToKaganga, kagangaToLatin, ONSET, VOWEL, SIMPLE_CODA, A_LETTER, VIRAMA };
})();

/* --------------------------------------------------------------------------
   3. SPACE DUST PARTICLES
   -------------------------------------------------------------------------- */
function initSpaceDustParticles() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height;
  const COUNT=80, MAX_R=2.2, DRIFT=0.35, TWINKLE=0.015;
  const PAL=[{r:212,g:168,b:67},{r:255,g:215,b:0},{r:184,g:134,b:11},{r:0,g:232,b:123},{r:0,g:180,b:100}];
  let particles=[];
  function resize(){width=canvas.width=window.innerWidth;height=canvas.height=window.innerHeight;}
  function mkP(top){const c=PAL[Math.floor(Math.random()*PAL.length)];return{x:Math.random()*width,y:top?height+Math.random()*40:Math.random()*height,vx:(Math.random()-.5)*.25,vy:-(Math.random()*DRIFT+.08),radius:Math.random()*MAX_R+.4,color:c,alpha:Math.random()*.5+.1,dir:Math.random()>.5?1:-1,ts:TWINKLE*(.5+Math.random())};}
  function seed(){particles=[];for(let i=0;i<COUNT;i++)particles.push(mkP(false));}
  function render(){ctx.clearRect(0,0,width,height);for(let i=0;i<particles.length;i++){const p=particles[i];ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fillStyle=`rgba(${p.color.r},${p.color.g},${p.color.b},${p.alpha})`;ctx.fill();if(p.radius>1.2){ctx.beginPath();ctx.arc(p.x,p.y,p.radius*2.5,0,Math.PI*2);ctx.fillStyle=`rgba(${p.color.r},${p.color.g},${p.color.b},${p.alpha*.15})`;ctx.fill();}p.x+=p.vx;p.y+=p.vy;p.alpha+=p.dir*p.ts;if(p.alpha>=.65){p.alpha=.65;p.dir=-1;}if(p.alpha<=.05){p.alpha=.05;p.dir=1;}if(p.y<-20)particles[i]=mkP(true);if(p.x<-20)p.x=width+10;if(p.x>width+20)p.x=-10;}requestAnimationFrame(render);}
  resize();window.addEventListener('resize',resize);seed();render();
}

/* --------------------------------------------------------------------------
   4. GALLERY GENERATOR
   -------------------------------------------------------------------------- */
function generateGallery() {
  const grid = document.getElementById('aksaraGrid');
  if (!grid) return;
  grid.innerHTML = '';
  AKSARA_KAGANGA.forEach((a, idx) => {
    const cell = document.createElement('div');
    cell.className = 'aksara-cell';
    cell.setAttribute('role','button');
    cell.setAttribute('tabindex','0');
    cell.setAttribute('aria-label',`Aksara ${a.latin}: ${a.bunyi}`);
    cell.title = a.bunyi;
    cell.style.animationDelay = `${(idx%7)*.5}s`;
    cell.innerHTML = `<span class="aksara-char kaganga-font">${a.char}</span><span class="aksara-label">${a.latin}</span>`;
    const bounce = () => {
      cell.style.transition='transform .25s cubic-bezier(.34,1.56,.64,1)';
      cell.style.transform='translateY(-18px) scale(1.15)';
      setTimeout(()=>{cell.style.transition='transform .5s cubic-bezier(.22,1,.36,1)';cell.style.transform='';},350);
    };
    cell.addEventListener('click',bounce);
    cell.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();bounce();}});
    grid.appendChild(cell);
  });
}

/* --------------------------------------------------------------------------
   5. INTERACTIVE CONVERTER â€” Dua Arah
   -------------------------------------------------------------------------- */
function initConverter() {
  const inputEl   = document.getElementById('latinInput');
  const outputEl  = document.getElementById('kagangaOutput');
  const toggleBtn = document.getElementById('converterToggle');
  const copyBtn   = document.getElementById('converterCopy');
  const dirLabel  = document.getElementById('converterDirLabel');
  if (!inputEl || !outputEl) return;

  let dirLatin = true; // true = Latinâ†’Kaganga, false = Kagangaâ†’Latin

  const PH = '<span style="color:#4b5563;font-size:1rem">Hasil akan muncul di sini...</span>';

  function convert() {
    const raw = inputEl.value.trim();
    if (!raw) { outputEl.innerHTML = PH; outputEl.classList.remove('has-content'); return; }
    const result = dirLatin
      ? AbugidaEngine.latinToKaganga(raw)
      : AbugidaEngine.kagangaToLatin(raw);
    outputEl.textContent = result;
    outputEl.classList.toggle('has-content', !!result);
    // font class
    if (dirLatin) outputEl.classList.add('kaganga-font');
    else outputEl.classList.remove('kaganga-font');
  }

  function updateDir() {
    if (dirLatin) {
      inputEl.placeholder = 'Contoh: bengkulu, rejang lebong';
      inputEl.classList.remove('kaganga-font');
      outputEl.classList.add('kaganga-font');
      if (dirLabel) dirLabel.textContent = 'Latin → Aksara Kaganga';
    } else {
      inputEl.placeholder = 'Tempel teks aksara Kaganga di sini';
      inputEl.classList.add('kaganga-font');
      outputEl.classList.remove('kaganga-font');
      if (dirLabel) dirLabel.textContent = 'Aksara Kaganga → Latin';
    }
    inputEl.value = '';
    outputEl.innerHTML = PH;
    outputEl.classList.remove('has-content');
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => { dirLatin = !dirLatin; updateDir(); });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const txt = outputEl.textContent;
      if (!txt || txt === 'Hasil akan muncul di sini...') return;
      navigator.clipboard.writeText(txt).then(() => {
        copyBtn.textContent = 'âœ“ Disalin!';
        setTimeout(() => { copyBtn.textContent = 'Salin'; }, 1800);
      });
    });
  }

  inputEl.addEventListener('input', convert);
  inputEl.addEventListener('paste', () => requestAnimationFrame(convert));
  updateDir();

  // Uji konversi saat init (tampilkan di console)
  const tests = ['bengkulu','kaganga','rejang lebong','curup','aksara'];
  tests.forEach(w => console.log(`[DIAGA] "${w}" â†’ "${AbugidaEngine.latinToKaganga(w)}"`));
}

/* --------------------------------------------------------------------------
   6. VIRTUAL KEYBOARD (#ketik)
   -------------------------------------------------------------------------- */
function initVirtualKeyboard() {
  const display = document.getElementById('ketikDisplay');
  if (!display) return;

  // Semua tombol: konsonan + A standalone + tanda vokal + coda + virama + spasi + hapus
  const KB_CONSONANTS = AKSARA_KAGANGA;
  const KB_VOWELS = [
    {char:'\uA946', latin:'A'},
    ...VOWEL_DIACRITICS.map(v=>({char:v.char,latin:'-'+v.latin})),
  ];
  const KB_CODAS = [
    ...CODA_DIACRITICS.map(c=>({char:c.char,latin:'-'+c.latin})),
    {char:'\uA953', latin:'virama'},
  ];

  function buildSection(container, items, cls) {
    items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = `kb-btn ${cls}`;
      btn.setAttribute('aria-label', item.latin);
      btn.innerHTML = `<span class="kb-glyph kaganga-font">${item.char}</span><span class="kb-label">${item.latin}</span>`;
      btn.addEventListener('click', () => { display.value += item.char; display.focus(); });
      container.appendChild(btn);
    });
  }

  const consonantGrid = document.getElementById('kbConsonants');
  const vowelGrid     = document.getElementById('kbVowels');
  const codaGrid      = document.getElementById('kbCodas');

  if (consonantGrid) buildSection(consonantGrid, KB_CONSONANTS, 'kb-consonant');
  if (vowelGrid)     buildSection(vowelGrid, KB_VOWELS, 'kb-vowel');
  if (codaGrid)      buildSection(codaGrid, KB_CODAS, 'kb-coda');

  document.getElementById('kbSpace')?.addEventListener('click', () => { display.value += ' '; display.focus(); });
  document.getElementById('kbBack')?.addEventListener('click', () => {
    // Hapus 1 codepoint Unicode (bisa multi-char)
    const s = display.value;
    if (!s) return;
    const arr = [...s];
    arr.pop();
    display.value = arr.join('');
    display.focus();
  });
  document.getElementById('kbClear')?.addEventListener('click', () => { display.value = ''; display.focus(); });
  document.getElementById('kbCopy')?.addEventListener('click', () => {
    if (!display.value) return;
    navigator.clipboard.writeText(display.value).then(() => {
      const btn = document.getElementById('kbCopy');
      const orig = btn.textContent;
      btn.textContent = 'âœ“ Disalin!';
      setTimeout(() => btn.textContent = orig, 1800);
    });
  });
  // Toggle konversi hasil ke latin
  document.getElementById('kbToLatin')?.addEventListener('click', () => {
    if (!display.value) return;
    const result = AbugidaEngine.kagangaToLatin(display.value);
    alert('Bacaan Latin: ' + result);
  });
}

/* --------------------------------------------------------------------------
   7. QUIZ ENGINE (#belajar)
   -------------------------------------------------------------------------- */
function initQuiz() {
  const section = document.getElementById('belajar');
  if (!section) return;

  const STORAGE_KEY = 'diaga_quiz';
  const PASS_SCORE  = 80; // % minimum untuk buka level berikutnya

  let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {
    xp: 0, badges: [], level: 1, scores: {1:null, 2:null, 3:null}
  };

  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  function renderProgress() {
    const xpEl = document.getElementById('quizXP');
    const badgeEl = document.getElementById('quizBadges');
    if (xpEl) xpEl.textContent = state.xp + ' XP';
    if (badgeEl) badgeEl.innerHTML = state.badges.map(b=>`<span class="quiz-badge">${b}</span>`).join('');
    [1,2,3].forEach(lv => {
      const btn = document.getElementById(`startLevel${lv}`);
      if (!btn) return;
      const locked = (lv === 2 && state.scores[1] < PASS_SCORE) ||
                     (lv === 3 && state.scores[2] < PASS_SCORE);
      btn.disabled = locked;
      btn.classList.toggle('locked', locked);
    });
  }

  function shuffle(arr) {
    const a=[...arr];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }

  // â”€â”€ LEVEL 1: Kenali Huruf â”€â”€
  function runLevel1() {
    const box = document.getElementById('quizBox');
    if (!box) return;
    const pool = shuffle([...AKSARA_KAGANGA]);
    let idx = 0, correct = 0, total = 10;
    box.innerHTML = '';

    function nextQ() {
      if (idx >= total) { endLevel(1, correct, total); return; }
      const target = pool[idx];
      const wrong = shuffle(AKSARA_KAGANGA.filter(a=>a.char!==target.char)).slice(0,3);
      const opts = shuffle([target, ...wrong]);
      box.innerHTML = `
        <p class="quiz-progress">Pertanyaan ${idx+1} / ${total}</p>
        <div class="quiz-glyph kaganga-font">${target.char}</div>
        <p class="quiz-q">Pilih bacaan Latin yang benar:</p>
        <div class="quiz-opts">
          ${opts.map(o=>`<button class="quiz-opt" data-val="${o.latin}">${o.latin}</button>`).join('')}
        </div>`;
      box.querySelectorAll('.quiz-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          const ok = btn.dataset.val === target.latin;
          if (ok) correct++;
          box.querySelectorAll('.quiz-opt').forEach(b => {
            b.disabled = true;
            if (b.dataset.val === target.latin) b.classList.add('correct');
            else if (b === btn && !ok) b.classList.add('wrong');
          });
          idx++;
          setTimeout(nextQ, 900);
        });
      });
    }
    nextQ();
  }

  // â”€â”€ LEVEL 2: Susun Suku Kata â”€â”€
  function runLevel2() {
    const box = document.getElementById('quizBox');
    if (!box) return;
    const WORDS = ['kaganga','bengkulu','rejang','curup','lebong','aksara','budaya','kita'];
    const pool = shuffle(WORDS).slice(0, 8);
    let idx = 0, correct = 0, total = pool.length;

    function nextQ() {
      if (idx >= total) { endLevel(2, correct, total); return; }
      const word = pool[idx];
      const rejang = AbugidaEngine.latinToKaganga(word);
      const chars  = [...rejang]; // Split by codepoint
      const shuffled = shuffle([...chars]);
      let chosen = [];

      function renderQ() {
        box.innerHTML = `
          <p class="quiz-progress">Pertanyaan ${idx+1} / ${total}</p>
          <p class="quiz-q">Susun glif untuk kata: <strong>${word}</strong></p>
          <div class="quiz-glyph kaganga-font" id="l2preview">${chosen.join('')||'â€”'}</div>
          <div class="quiz-opts" id="l2opts">
            ${shuffled.map((ch,i)=>`<button class="quiz-opt kaganga-font" data-i="${i}" ${chosen.includes(ch+i)?'disabled':''}>${ch}</button>`).join('')}
          </div>
          <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
            <button class="quiz-btn-sm" id="l2reset">â†º Reset</button>
            <button class="quiz-btn-sm" id="l2check">Periksa âœ“</button>
          </div>`;
        document.getElementById('l2reset')?.addEventListener('click',()=>{chosen=[];renderQ();});
        document.getElementById('l2check')?.addEventListener('click',()=>{
          const ok = chosen.join('') === rejang;
          if (ok) correct++;
          const prev = document.getElementById('l2preview');
          if (prev) { prev.style.color = ok ? '#00e87b' : '#ef4444'; }
          idx++;
          setTimeout(nextQ, 1000);
        });
        box.querySelectorAll('#l2opts .quiz-opt').forEach(btn=>{
          btn.addEventListener('click',()=>{
            chosen.push(btn.textContent);
            btn.disabled=true;
            const pv=document.getElementById('l2preview');
            if(pv) pv.textContent=chosen.join('')||'â€”';
          });
        });
      }
      renderQ();
    }
    nextQ();
  }

  // â”€â”€ LEVEL 3: Baca Ka-Ga-Nga â”€â”€
  function runLevel3() {
    const box = document.getElementById('quizBox');
    if (!box) return;
    const WORDS = ['kaganga','bengkulu','rejang','curup','lebong','aksara','budaya','kita','nusantara','warisan'];
    const pool = shuffle(WORDS).slice(0, 10);
    let idx = 0, correct = 0, total = pool.length;

    function nextQ() {
      if (idx >= total) { endLevel(3, correct, total); return; }
      const word = pool[idx];
      const rejang = AbugidaEngine.latinToKaganga(word);
      const wrong = shuffle(WORDS.filter(w=>w!==word)).slice(0,3);
      const opts = shuffle([word, ...wrong]);
      box.innerHTML = `
        <p class="quiz-progress">Pertanyaan ${idx+1} / ${total}</p>
        <div class="quiz-glyph kaganga-font">${rejang}</div>
        <p class="quiz-q">Pilih bacaan Latin yang benar:</p>
        <div class="quiz-opts">
          ${opts.map(o=>`<button class="quiz-opt" data-val="${o}">${o}</button>`).join('')}
        </div>`;
      box.querySelectorAll('.quiz-opt').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const ok = btn.dataset.val === word;
          if (ok) correct++;
          box.querySelectorAll('.quiz-opt').forEach(b=>{
            b.disabled=true;
            if(b.dataset.val===word) b.classList.add('correct');
            else if(b===btn&&!ok) b.classList.add('wrong');
          });
          idx++;
          setTimeout(nextQ,900);
        });
      });
    }
    nextQ();
  }

  function endLevel(lv, correct, total) {
    const pct = Math.round((correct/total)*100);
    state.scores[lv] = Math.max(state.scores[lv]||0, pct);
    const xpGained = correct * 10;
    state.xp += xpGained;
    if (pct >= PASS_SCORE && !state.badges.includes(`Level ${lv}`)) {
      state.badges.push(`ðŸ… Level ${lv}`);
    }
    if (pct === 100 && !state.badges.includes('Sempurna!')) state.badges.push('â­ Sempurna!');
    saveState();
    renderProgress();
    const box = document.getElementById('quizBox');
    if (!box) return;
    const pass = pct >= PASS_SCORE;
    box.innerHTML = `
      <div class="quiz-result ${pass?'pass':'fail'}">
        <div style="font-size:3rem">${pass?'ðŸŽ‰':'ðŸ’ª'}</div>
        <h3>${pass?'Luar Biasa!':'Terus Berlatih!'}</h3>
        <p>Skor: <strong>${correct}/${total} (${pct}%)</strong></p>
        <p>+${xpGained} XP diperoleh</p>
        ${pass&&lv<3?`<p style="color:#00e87b">Level ${lv+1} telah terbuka!</p>`:''}
        <button class="quiz-btn" onclick="document.getElementById('quizBox').innerHTML=''">Kembali</button>
      </div>`;
  }

  // Bind tombol start
  document.getElementById('startLevel1')?.addEventListener('click', runLevel1);
  document.getElementById('startLevel2')?.addEventListener('click', runLevel2);
  document.getElementById('startLevel3')?.addEventListener('click', runLevel3);

  renderProgress();
}

/* --------------------------------------------------------------------------
   8. GSAP & SCROLLTRIGGER ANIMATIONS
   -------------------------------------------------------------------------- */
function initGSAPAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    document.querySelectorAll('.hero-anim,.history-item').forEach(el=>{el.style.opacity='1';el.style.transform='none';});
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  gsap.timeline({delay:.4}).to('.hero-anim',{y:0,opacity:1,duration:1.2,stagger:.2,ease:'power3.out'});
  gsap.from('.galeri-title',{scrollTrigger:{trigger:'#galeri',start:'top 82%',toggleActions:'play none none none'},y:50,opacity:0,duration:1,ease:'power2.out'});
  gsap.from('.aksara-cell',{scrollTrigger:{trigger:'#aksaraGrid',start:'top 82%',toggleActions:'play none none none'},y:60,opacity:0,scale:.8,duration:.6,stagger:{each:.04,from:'random'},ease:'back.out(1.7)'});
  document.querySelectorAll('.history-item').forEach(item=>{
    gsap.to(item,{scrollTrigger:{trigger:item,start:'top 88%',end:'top 45%',toggleActions:'play none none none'},opacity:1,y:0,duration:1,ease:'power2.out'});
  });
  // Konverter card animation (original section, always scrolled to naturally)
  const konvCard = document.querySelector('#konverter .glass-card');
  if (konvCard) {
    gsap.fromTo(konvCard,{opacity:0,y:40},{opacity:1,y:0,duration:1,ease:'power2.out',
      scrollTrigger:{trigger:konvCard,start:'top 90%',toggleActions:'play none none none'}});
  }
  gsap.from('.batik-card',{scrollTrigger:{trigger:'#koleksi',start:'top 78%',toggleActions:'play none none none'},y:70,opacity:0,duration:.8,stagger:.15,ease:'power2.out'});
  ['#sejarah h2','#konverter h2','#koleksi h2','#ketik h2','#belajar h2'].forEach(sel=>{
    const el=document.querySelector(sel);
    if(!el)return;
    gsap.from(el,{scrollTrigger:{trigger:el,start:'top 85%',toggleActions:'play none none none'},y:40,opacity:0,duration:.9,ease:'power2.out'});
  });
}

/* --------------------------------------------------------------------------
   9. VANILLA-TILT
   -------------------------------------------------------------------------- */
function initVanillaTilt() {
  if (typeof VanillaTilt==='undefined') return;
  const els=document.querySelectorAll('[data-tilt]');
  if(!els.length)return;
  VanillaTilt.init(els,{max:8,speed:400,glare:true,'max-glare':.2,perspective:1000,scale:1.02});
}

/* --------------------------------------------------------------------------
   10. NAVBAR
   -------------------------------------------------------------------------- */
function initNavbar() {
  const navbar=document.getElementById('navbar');
  const menuBtn=document.getElementById('menuBtn');
  const mobileMenu=document.getElementById('mobileMenu');
  if(!navbar||!menuBtn||!mobileMenu)return;
  let ticking=false;
  window.addEventListener('scroll',()=>{
    if(!ticking){requestAnimationFrame(()=>{navbar.classList.toggle('nav-scrolled',window.scrollY>60);ticking=false;});ticking=true;}
  });
  menuBtn.addEventListener('click',()=>{
    const open=!mobileMenu.classList.contains('hidden');
    mobileMenu.classList.toggle('hidden',open);
    mobileMenu.classList.toggle('flex',!open);
    menuBtn.textContent=open?'â˜°':'âœ•';
    menuBtn.setAttribute('aria-expanded',String(!open));
  });
  mobileMenu.querySelectorAll('a').forEach(a=>{
    a.addEventListener('click',()=>{mobileMenu.classList.add('hidden');mobileMenu.classList.remove('flex');menuBtn.textContent='â˜°';menuBtn.setAttribute('aria-expanded','false');});
  });
}

/* --------------------------------------------------------------------------
   11. SERVICE WORKER REGISTRATION (PWA)
   -------------------------------------------------------------------------- */
function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        console.log('[DIAGA] SW registered:', reg.scope);
      }).catch(err => console.warn('[DIAGA] SW failed:', err));
    });
  }
}

/* --------------------------------------------------------------------------
   12. BOOTSTRAP
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initSpaceDustParticles();
  generateGallery();
  initConverter();
  initVirtualKeyboard();
  initQuiz();
  initNavbar();
  initVanillaTilt();
  registerSW();
  requestAnimationFrame(() => setTimeout(initGSAPAnimations, 80));
});
