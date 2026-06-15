(function(){
'use strict';

/* ── CONFIG ─────────────────────────────────── */
const SB_URL  = 'https://dsssrxvngbewuwftcvjq.supabase.co';
const SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzc3NyeHZuZ2Jld3V3ZnRjdmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTg5NDksImV4cCI6MjA5NTM5NDk0OX0.2ieDX1FEuY-eAS8_u1IhoDgIllmpTge2E7_gohIdQSE';
const TG_TOKEN= '8760861714:AAGwQNeqO4iAxMJFHKTu9FEdxdfkETrV02c';
const TG_CHAT = '938980190';
const YM_ID   = 109572421;
const sb      = supabase.createClient(SB_URL, SB_KEY);

/* ── PRELOADER ──────────────────────────────── */
window.addEventListener('DOMContentLoaded', function(){
  const pre     = document.getElementById('preloader');
  const preInner= document.getElementById('preInner');
  const preLine = document.getElementById('preLine');
  const preLab  = document.getElementById('preLab');
  const navLogo = document.getElementById('navLogo');

  const tl = gsap.timeline({
    onComplete: function(){
      // fold preloader into nav logo
      const logoRect = navLogo.getBoundingClientRect();
      const preRect  = pre.getBoundingClientRect();
      const tx = logoRect.left + logoRect.width/2  - (preRect.width/2);
      const ty = logoRect.top  + logoRect.height/2 - (preRect.height/2);

      gsap.to(preInner, {
        scale: 0.18,
        x: tx,
        y: ty - preRect.height/2,
        duration: 0.6,
        ease: 'power3.inOut',
        onComplete: function(){
          gsap.to(pre, {opacity:0, duration:0.25, onComplete:function(){
            pre.style.display='none';
            gsap.to(navLogo, {opacity:1, duration:0.3});
            revealAll();
          }});
        }
      });
    }
  });

  tl.from('.pre-v',    {opacity:0, y:20, duration:0.4, ease:'back.out(1.4)'})
    .from('.pre-elox', {opacity:0, x:-10, duration:0.35, ease:'power2.out'}, '-=0.15')
    .to(preLine,       {width:'160px', duration:0.4, ease:'power2.out'}, '-=0.1')
    .to(preLab,        {opacity:1, y:0, duration:0.3, ease:'power2.out'}, '-=0.1')
    .to({},            {duration:0.7});
});

/* ── REVEAL ─────────────────────────────────── */
function revealAll(){
  gsap.registerPlugin(ScrollTrigger);
  document.querySelectorAll('.reveal').forEach(function(el){
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      onEnter: function(){ el.classList.add('visible'); }
    });
  });
  // also fire for elements already in viewport
  document.querySelectorAll('.reveal').forEach(function(el){
    var r = el.getBoundingClientRect();
    if(r.top < window.innerHeight*0.88) el.classList.add('visible');
  });
}

/* ── NAV SCROLL ─────────────────────────────── */
var nav = document.getElementById('mainNav');
window.addEventListener('scroll', function(){
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, {passive:true});

/* ── MOBILE MENU ────────────────────────────── */
var burger  = document.getElementById('burger');
var mobMenu = document.getElementById('mobMenu');
burger.addEventListener('click', function(){
  burger.classList.toggle('open');
  mobMenu.classList.toggle('open');
});
window.closeMob = function(){
  burger.classList.remove('open');
  mobMenu.classList.remove('open');
};

/* ── FAQ ACCORDION ──────────────────────────── */
document.querySelectorAll('.faq-q').forEach(function(q){
  q.addEventListener('click', function(){
    var item = q.parentElement;
    var wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(function(i){ i.classList.remove('open'); });
    if(!wasOpen) item.classList.add('open');
  });
});

/* ── CALCULATOR ─────────────────────────────── */
var selected = {};
document.querySelectorAll('.calc-svc').forEach(function(el){
  el.addEventListener('click', function(){
    var id    = el.dataset.id;
    var price = parseInt(el.dataset.price, 10);
    if(selected[id]){
      delete selected[id];
      el.classList.remove('sel');
    } else {
      selected[id] = price;
      el.classList.add('sel');
    }
    updateCalc();
  });
});

function updateCalc(){
  var items = Object.keys(selected);
  var raw   = items.reduce(function(s,k){ return s+selected[k]; }, 0);
  var disc  = items.length >= 2 ? Math.round(raw*0.1) : 0;
  var total = raw - disc;

  var itemsEl   = document.getElementById('calcResultItems');
  var discRow   = document.getElementById('calcDiscount');
  var discAmt   = document.getElementById('calcDiscountAmt');
  var totalEl   = document.getElementById('calcTotal');
  var emptyEl   = document.getElementById('calcEmpty');

  var names = {
    landing:'Лендинг', multipage:'Многостр. сайт',
    bot:'Telegram-бот', crm:'CRM-интеграция',
    direct:'Яндекс.Директ', max:'MAX-бот'
  };

  if(items.length === 0){
    itemsEl.innerHTML = '<div class="calc-empty" id="calcEmpty">Выберите услуги</div>';
    discRow.style.display='none';
    totalEl.textContent = '0 ₽';
    return;
  }

  var html = '';
  items.forEach(function(k){
    html += '<div class="calc-item"><span>'+names[k]+'</span><span>'+fmt(selected[k])+'</span></div>';
  });
  itemsEl.innerHTML = html;

  if(disc > 0){
    discRow.style.display = 'flex';
    discAmt.textContent = '−'+fmt(disc);
  } else {
    discRow.style.display = 'none';
  }
  totalEl.textContent = total > 0 ? fmt(total) : '0 ₽';
}

function fmt(n){ return n.toLocaleString('ru-RU')+'&#8201;₽'; }

/* ── MODAL ──────────────────────────────────── */
window.openModal = function(){
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow='hidden';
};
window.closeModal = function(e){
  if(e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow='';
};
document.addEventListener('keydown', function(e){
  if(e.key==='Escape') window.closeModal();
});

/* ── FORM STEPS ─────────────────────────────── */
window.nextStep = function(){
  var name  = document.getElementById('fName').value.trim();
  var phone = document.getElementById('fPhone').value.trim();
  if(name.length < 2){ showToast('Введите имя','er'); return; }
  if(phone.replace(/\D/g,'').length < 7){ showToast('Введите телефон','er'); return; }
  ymGoal('FORM_STEP2');
  document.getElementById('step1').classList.remove('act');
  document.getElementById('step2').classList.add('act');
  document.getElementById('fp1').classList.remove('act');
  document.getElementById('fp2').classList.add('act');
};
window.prevStep = function(){
  document.getElementById('step2').classList.remove('act');
  document.getElementById('step1').classList.add('act');
  document.getElementById('fp2').classList.remove('act');
  document.getElementById('fp1').classList.add('act');
};

/* ── FORM SUBMIT ────────────────────────────── */
window.submitForm = function(){
  var name    = document.getElementById('fName').value.trim();
  var phone   = document.getElementById('fPhone').value.trim();
  var type    = document.getElementById('fType').value;
  var budget  = document.getElementById('fBudget').value;
  var comment = document.getElementById('fMessage').value.trim();
  var consent = document.getElementById('fConsent').checked;
  if(!consent){ showToast('Необходимо согласие на обработку данных','er'); return; }

  var btn = document.getElementById('formSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Отправляем...';

  sb.from('leads').insert([{
    name:name, phone:phone, project_type:type||null,
    budget:budget||null, comment:comment||null,
    source:'veloxlab_form'
  }]).then(function(res){
    if(res.error){ throw res.error; }
    notifyTg('📬 Новая заявка с сайта\n👤 '+name+'\n📱 '+phone+(type?'\n💼 '+type:'')+(budget?'\n💰 '+budget:'')+(comment?'\n💬 '+comment:''));
    ymGoal('FORM_SUBMIT');
    document.getElementById('formContent').style.display='none';
    document.getElementById('formSuccess').style.display='block';
  }).catch(function(){
    btn.disabled=false;
    btn.textContent='Отправить заявку';
    showToast('Ошибка. Попробуйте ещё раз или напишите в бот.','er');
  });
};

/* ── HERO FORM ──────────────────────────────── */
document.getElementById('heroFormBtn').addEventListener('click', function(){
  var name  = document.getElementById('heroName').value.trim();
  var phone = document.getElementById('heroPhone').value.trim();
  var type  = document.getElementById('heroType').value;
  if(name.length < 2){ showToast('Введите имя','er'); return; }
  if(phone.replace(/\D/g,'').length < 7){ showToast('Введите телефон','er'); return; }

  var btn = document.getElementById('heroFormBtn');
  btn.disabled=true; btn.textContent='Отправляем...';

  sb.from('leads').insert([{
    name:name, phone:phone, project_type:type||null,
    source:'veloxlab_hero'
  }]).then(function(res){
    if(res.error) throw res.error;
    notifyTg('🚀 Заявка из Hero\n👤 '+name+'\n📱 '+phone+(type?'\n💼 '+type:''));
    ymGoal('FORM_SUBMIT');
    document.getElementById('heroInlineForm').style.display='none';
    document.getElementById('heroSent').style.display='block';
  }).catch(function(){
    btn.disabled=false; btn.textContent='Получить расчёт →';
    showToast('Ошибка. Попробуйте ещё раз.','er');
  });
});

/* ── HELPERS ────────────────────────────────── */
function notifyTg(msg){
  var opts={method:'POST',headers:{'Content-Type':'application/json'}};
  fetch('https://api.telegram.org/bot'+TG_TOKEN+'/sendMessage',Object.assign({},opts,{body:JSON.stringify({chat_id:TG_CHAT,text:msg})})).catch(function(){});
  fetch('https://api.telegram.org/bot'+TG_TOKEN+'/sendMessage',Object.assign({},opts,{body:JSON.stringify({chat_id:'-5024237600',text:msg})})).catch(function(){});
}

function ymGoal(target){
  if(typeof ym === 'function') ym(YM_ID,'reachGoal',target);
}

function showToast(msg, type){
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast '+(type||'');
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){ t.classList.add('show'); });
  });
  setTimeout(function(){ t.classList.remove('show'); }, 3500);
}

/* ── BOT LINK TRACKING ──────────────────────── */
var botCta = document.getElementById('botCta');
if(botCta){
  botCta.addEventListener('click', function(){
    ymGoal('BOT_CLICK');
  });
}

/* ── COOKIE BANNER ──────────────────────────── */
if(!localStorage.getItem('cookie_ok')){
  var cb = document.createElement('div');
  cb.style.cssText='position:fixed;bottom:80px;left:16px;right:16px;max-width:480px;background:#0A0A1A;color:#fff;border-radius:12px;padding:16px 20px;font-size:13px;z-index:9000;display:flex;align-items:center;justify-content:space-between;gap:16px;box-shadow:0 4px 24px rgba(0,0,0,.3)';
  cb.innerHTML='<span>Мы используем cookies для аналитики</span><button style="background:var(--pr);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0">Понятно</button>';
  cb.querySelector('button').addEventListener('click',function(){
    localStorage.setItem('cookie_ok','1');
    cb.remove();
  });
  document.body.appendChild(cb);
}

})();
