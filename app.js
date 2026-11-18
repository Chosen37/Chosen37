(() => {
  'use strict';
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  const data = window.VAIL_BREEZE;
  const planner = window.VailPlanner;
  const menu = $('.menu-toggle');
  const nav = $('#main-nav');
  const mobile = matchMedia('(max-width: 1199px)');
  const openers = new WeakMap();
  const dropdowns = $$('.nav-dropdown');
  const closeDropdowns = except => dropdowns.forEach(item => { if (item !== except) item.open = false; });
  dropdowns.forEach(item => item.addEventListener('toggle', () => { if (item.open) closeDropdowns(item); }));
  document.addEventListener('click', event => { if (!event.target.closest('.nav-dropdown')) closeDropdowns(); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const open = dropdowns.find(item => item.open);
    if (open) { open.open = false; $('summary', open).focus(); }
  });

  function closeMenu(restore=false) {
    const wasOpen = menu.getAttribute('aria-expanded') === 'true';
    menu.setAttribute('aria-expanded','false');
    nav.classList.remove('open');
    closeDropdowns();
    if(restore && wasOpen) menu.focus();
  }
  menu.hidden = false;
  menu.addEventListener('click',()=>{
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded',String(open));
    nav.classList.toggle('open',open);
  });
  nav.addEventListener('click',event=>{if(event.target.closest('a,button'))closeMenu();});
  document.addEventListener('click',event=>{if(!event.target.closest('.site-header'))closeMenu();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu(true);});
  mobile.addEventListener('change',()=>closeMenu());
  function openDialog(dialog, trigger) {
    openers.set(dialog,trigger || document.activeElement);
    dialog.showModal();
    document.documentElement.classList.add('has-dialog');
    const title = $('#'+dialog.getAttribute('aria-labelledby'));
    title?.focus();
  }
  $$('dialog').forEach(dialog=>{
    $('[data-close]',dialog).addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{
      if(event.target!==dialog)return;
      const rect=dialog.getBoundingClientRect();
      if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
    });
    dialog.addEventListener('close',()=>{
      if(!$('dialog[open]'))document.documentElement.classList.remove('has-dialog');
      const opener=openers.get(dialog);
      if(opener?.isConnected && opener.getClientRects().length)opener.focus();
      else if(opener?.closest('#main-nav') && mobile.matches)menu.focus();
    });
  });
  function validateDates(form) {
    if(!form.elements.checkin)return;
    const start=form.elements.checkin, end=form.elements.checkout;
    start.min=planner.today();
    end.min=start.value?planner.nextDay(start.value):planner.nextDay(planner.today());
    start.setCustomValidity(''); end.setCustomValidity('');
    const error=planner.dateError(start.value,end.value);
    if(error)form.elements[error.field].setCustomValidity(error.message);
  }
  const stayForm=$('#stay-form');
  const quickForm=$('#quick-stay');
  [stayForm,quickForm].filter(Boolean).forEach(form=>{
    validateDates(form);
    ['checkin','checkout'].forEach(name=>form.elements[name].addEventListener('input',()=>validateDates(form)));
  });
  function edit(form,focus=true) {
    $('[data-fields]',form).hidden=false;
    $('.form-result',form).hidden=true;
    if(focus)$('[data-fields] input,[data-fields] select',form)?.focus();
  }
  function openStay(trigger,reference='any',values={}) {
    const property=data.properties.some(p=>p.id===reference)?reference:'any';
    stayForm.elements.property.value=property;
    for(const [key,value] of Object.entries(values))if(stayForm.elements[key])stayForm.elements[key].value=value;
    edit(stayForm,false);
    validateDates(stayForm);
    closeMenu();
    openDialog($('#stay-dialog'),trigger);
  }
  $$('[data-inquire]').forEach(button=>button.addEventListener('click',()=>openStay(button,button.dataset.reference)));
  $$('[data-privacy]').forEach(button=>button.addEventListener('click',event=>openDialog($('#privacy-dialog'),event.currentTarget)));
  $('[data-close-panel]').addEventListener('click',()=>$('#privacy-dialog').close());
  if(navigator.globalPrivacyControl === true) $('[data-gpc]').textContent = 'Global Privacy Control is enabled in your browser. Website data is not sold or used for targeted advertising.';
  quickForm?.addEventListener('submit',event=>{
    event.preventDefault();
    validateDates(quickForm);
    if(quickForm.reportValidity())openStay($('button',quickForm),'any',Object.fromEntries(new FormData(quickForm)));
  });
  const filters = $('#stay-filters');
  if (filters) {
    const cards = $$('.property-card');
    const applyFilters = (updateURL=true) => {
      const city = filters.elements.city.value;
      const guests = Number(filters.elements.guests.value);
      let count = 0;
      cards.forEach(card => {
        const show = (city === 'all' || card.dataset.city === city) && Number(card.dataset.guests) >= guests;
        card.hidden = !show;
        if (show) count++;
      });
      $('[data-filter-count]').textContent = `${count} ${count === 1 ? 'home' : 'homes'} · Book direct or on Airbnb`;
      $('[data-empty]').hidden = count > 0;
      if (updateURL) {
        const url = new URL(location.href);
        if (city === 'all') url.searchParams.delete('location'); else url.searchParams.set('location', city);
        if (guests === 1) url.searchParams.delete('guests'); else url.searchParams.set('guests', String(guests));
        history.replaceState(null, '', url);
      }
    };
    const fromURL = () => {
      const params = new URLSearchParams(location.search);
      filters.elements.city.value = ['Denver','Englewood'].includes(params.get('location')) ? params.get('location') : 'all';
      filters.elements.guests.value = ['1','2','3','4','5','6'].includes(params.get('guests')) ? params.get('guests') : '1';
      applyFilters(false);
    };
    filters.hidden = false;
    filters.addEventListener('change', () => applyFilters());
    filters.addEventListener('submit', event => event.preventDefault());
    filters.addEventListener('reset', event => {
      event.preventDefault();
      filters.elements.city.value = 'all';
      filters.elements.guests.value = '1';
      applyFilters();
    });
    $('[data-reset-filters]').addEventListener('click', () => filters.reset());
    window.addEventListener('popstate', fromURL);
    fromURL();
  }
  const ownerForm=$('#owner-form');
  if(ownerForm){
    const plan=new URLSearchParams(location.search).get('plan');
    if(data.plans.some(p=>p.id===plan))ownerForm.elements.plan.value=plan;
  }
  [stayForm,ownerForm].filter(Boolean).forEach(form=>{
    const kind=form===stayForm?'stay':'owner';
    const result=$('.form-result',form),text=$('.summary-text',result),status=$('.result-status',result);
    form.addEventListener('submit',event=>{
      event.preventDefault();
      validateDates(form);
      if(!form.reportValidity())return;
      text.value=planner.summary(kind,Object.fromEntries(new FormData(form)),data);
      $('[data-email]',result).href=planner.emailDraft(kind,text.value);
      $('[data-fields]',form).hidden=true;
      result.hidden=false;
      status.textContent='';
      result.focus();
    });
    $('[data-email]',result).addEventListener('click',()=>{status.textContent='Your email app should open. Review and send the draft there. If it does not open, copy the summary and email vailbreezeproperties@gmail.com.';});
    $('[data-edit]',result).addEventListener('click',()=>edit(form));
    $('[data-copy]',result).addEventListener('click',async()=>{
      let copied=false;
      try {
        if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text.value);copied=true;}
      } catch { /* Fall through to an explicit selection/copy fallback. */ }
      if(!copied){
        text.focus(); text.select();
      }
      status.textContent=copied?'Summary copied. Nothing was sent to Vail Breeze.':'Automatic copy is unavailable. Summary selected — press Ctrl+C or ⌘C, or use your device’s Copy command.';
    });
    $('[data-download]',result).addEventListener('click',()=>{
      const blob=new Blob([text.value+'\n'],{type:'text/plain;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url; link.download=`vail-breeze-${kind==='stay'?'stay-plan':'owner-inquiry'}.txt`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      status.textContent='Download started. Nothing was sent to Vail Breeze.';
    });
  });
  // Progressive enhancement: no-JS forms remain disabled, preventing accidental GET submissions.
  $$('[data-fields]').forEach(fields=>fields.disabled=false);
  document.documentElement.classList.add('js');
})();
