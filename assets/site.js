/* pms.co.il — shared site behaviour: menu sheet, guide lead form, guides hub search */
(function(){
  "use strict";

  /* ---- 1. one navigation, with a sheet on the phone ---- */
  (function(){
    var btn=document.getElementById('navBtn'),sheet=document.getElementById('navSheet');
    if(btn&&sheet){
      var open=false;
      var set=function(v){
        open=v;btn.setAttribute('aria-expanded',String(v));
        btn.setAttribute('aria-label',v?'סגירת תפריט':'פתיחת תפריט');
        sheet.classList.toggle('open',v);document.body.classList.toggle('navOpen',v);
        if(v){var first=sheet.querySelector('a');if(first)first.focus({preventScroll:true})}
      };
      btn.addEventListener('click',function(){set(!open)});
      document.addEventListener('keydown',function(e){if(e.key==='Escape'&&open){set(false);btn.focus()}});
      document.addEventListener('click',function(e){
        if(!open||sheet.contains(e.target)||btn.contains(e.target))return;
        set(false);
      });
      addEventListener('resize',function(){if(open&&innerWidth>760)set(false)});
    }
    var here=location.pathname.replace(/\.html$/,'').replace(/\/$/,'')||'/';
    [].forEach.call(document.querySelectorAll('.siteNav a,.navSheet a.row'),function(a){
      if(a.getAttribute('href').replace(/\/$/,'')===here)a.setAttribute('aria-current','page');
    });
  })();

  /* ---- 2. lead form inside the page ---- */
  (function(){
    var f=document.getElementById('guideForm');if(!f)return;
    var err=document.getElementById('gErr');
    var bad=function(el,msg){el.classList.add('bad');err.textContent=msg;err.hidden=false;el.focus()};
    f.addEventListener('input',function(e){if(e.target&&e.target.classList)e.target.classList.remove('bad')});
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var d=new FormData(f),btn=f.querySelector('.submit'),label=btn.textContent;
      err.hidden=true;
      var name=String(d.get('name')||'').trim(),phone=String(d.get('phone')||'').trim();
      if(name.length<2)return bad(f.name,'נא למלא שם מלא');
      if(phone.replace(/\D/g,'').length<9)return bad(f.phone,'נא למלא מספר טלפון תקין');
      btn.disabled=true;btn.textContent='שולח…';
      fetch('/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:name,phone:phone,subject:d.get('subject'),details:d.get('details'),
          company:d.get('company'),source:'guide:'+location.pathname})})
      .then(function(r){return r.json().catch(function(){return{}}).then(function(o){
        if(!r.ok||!o.ok)throw new Error('send failed');
        f.innerHTML='<div class="gOk" role="status"><i>✓</i><b>הפנייה התקבלה</b><p>תודה. נחזור אליכם בהקדם, ובינתיים אפשר גם בוואטסאפ.</p></div>';
      })})
      .catch(function(){
        btn.disabled=false;btn.textContent=label;
        err.innerHTML='השליחה נכשלה. אפשר לשלוח ב־<a href="https://wa.me/972528822044">WhatsApp</a> או להתקשר ל־03-940-5151.';
        err.hidden=false;
      });
    });
  })();

  /* ---- 3. guides hub: live search over the grouped list ---- */
  (function(){
    var q=document.getElementById('hubQ');if(!q)return;
    var clear=document.getElementById('hubClear'),count=document.getElementById('hubCount'),
        empty=document.getElementById('hubEmpty'),echo=document.getElementById('hubQEcho'),
        rows=[].slice.call(document.querySelectorAll('.hubRow')),
        groups=[].slice.call(document.querySelectorAll('.hubGroup')),
        total=rows.filter(function(r){return !r.dataset.tool}).length;
    var norm=function(s){return String(s||'').toLowerCase().replace(/["'׳״`.,!?]/g,'').replace(/\s+/g,' ').trim()};
    rows.forEach(function(r){r._hay=norm(r.textContent+' '+(r.dataset.k||''))});
    var apply=function(){
      var v=norm(q.value),n=0;
      clear.hidden=!q.value;
      rows.forEach(function(r){var hit=!v||r._hay.indexOf(v)>-1;r.hidden=!hit;if(hit)n++});
      groups.forEach(function(g){
        var vis=[].slice.call(g.querySelectorAll('.hubRow')).filter(function(r){return !r.hidden}).length;
        g.hidden=vis===0;
        var c=g.querySelector('.gTitle i');if(c)c.textContent=vis;
      });
      count.textContent=v?(n+' '+(n===1?'תוצאה':'תוצאות')):(total+' מדריכים, ועוד כלי בדיקה אחד');
      empty.hidden=n>0;
      if(!n&&echo)echo.textContent='״'+q.value.trim()+'״';
    };
    q.addEventListener('input',apply);
    q.addEventListener('keydown',function(e){if(e.key==='Escape'){q.value='';apply()}});
    clear.addEventListener('click',function(){q.value='';apply();q.focus()});
    apply();
  })();
})();
