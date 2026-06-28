document.addEventListener('DOMContentLoaded', async () => {

  // ─── DOM ───
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  const DOM = {
    loadingScreen:  $('loadingScreen'),
    body:           document.body,
    sideNav:        document.querySelector('.side-nav'),
    mainWrapper:    $('mainWrapper'),
    navCollapseBtn: $('navCollapseBtn'),
    menuToggle:     $('menuToggle'),
    themeToggleBtn: $('themeToggleBtn'),
    themeIcon:      $('themeIcon'),
    searchInput:    $('searchInput'),
    clearSearch:    $('clearSearch'),
    apiContent:     $('apiContent'),
    notifBell:      $('notificationBell'),
    notifBadge:     $('notificationBadge'),
    toastWrap:      $('toastWrap'),
    modalBackdrop:  $('modalBackdrop'),
    apiModal:       $('apiModal'),
    modalTitle:     $('modalTitle'),
    modalSubtitle:  $('modalSubtitle'),
    modalMethod:    $('modalMethodBadge'),
    modalClose:     $('modalClose'),
    apiEndpoint:    $('apiEndpoint'),
    copyEndpoint:   $('copyEndpoint'),
    queryContainer: $('apiQueryInputContainer'),
    respLoading:    $('apiResponseLoading'),
    respContainer:  $('responseContainer'),
    respContent:    $('apiResponseContent'),
    respStatus:     $('responseStatusBadge'),
    copyResponse:   $('copyResponse'),
    submitBtn:      $('submitQueryBtn'),
    appName:        $('name'),
    sideNavName:    $('sideNavName'),
    versionBadge:   $('version'),
    appDesc:        $('description'),
    dynamicImage:   $('dynamicImage'),
    apiLinksContainer: $('apiLinks'),
    wm:             $('wm'),
  };

  let settings = {};
  let currentApi = null;
  let allNotifs = [];
  let globalAudio = null; // music player audio ref

  // ─── UTILS ───
  const debounce = (fn, ms) => {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  };
  const setText = (el, val, fb = '') => { if (el) el.textContent = val || fb; };

  // ─── TOAST ───
  const showToast = (msg, type = 'info', title = null) => {
    const icons = {
      success: { icon: 'fa-check-circle', color: 'var(--green)' },
      error:   { icon: 'fa-exclamation-circle', color: 'var(--red)' },
      info:    { icon: 'fa-circle-info', color: 'var(--cyan)' },
      notification: { icon: 'fa-bell', color: 'var(--yellow)' },
    };
    const cfg = icons[type] || icons.info;
    const titles = { success: 'Berhasil', error: 'Error', info: 'Info', notification: 'Notifikasi' };
    const el = document.createElement('div');
    el.className = `toast-item toast-${type}`;
    el.innerHTML = `
      <i class="toast-icon fas ${cfg.icon}" style="color:${cfg.color}"></i>
      <div class="toast-body">
        <span class="toast-title">${title || titles[type]}</span>
        <span class="toast-msg">${msg}</span>
      </div>`;
    DOM.toastWrap.prepend(el);
    setTimeout(() => {
      el.classList.add('fade-out');
      setTimeout(() => el.remove(), 350);
    }, 3500);
  };

  // ─── CLIPBOARD ───
  const copyText = async (text, btn) => {
    if (!navigator.clipboard) return showToast('Browser tidak mendukung clipboard.', 'error');
    try {
      await navigator.clipboard.writeText(text);
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i>';
      btn.classList.add('copied');
      showToast('Tersalin ke clipboard!', 'success');
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 1500);
    } catch (e) {
      showToast('Gagal menyalin: ' + e.message, 'error');
    }
  };

  // ─── LOADING ───
  const hideLoading = () => {
    if (!DOM.loadingScreen) return;
    DOM.loadingScreen.classList.add('fade-out');
    setTimeout(() => { DOM.loadingScreen.style.display = 'none'; DOM.body.classList.remove('no-scroll'); }, 500);
  };

  (() => {
    const dots = DOM.loadingScreen?.querySelector('.loading-dots');
    if (!dots) return;
    dots._id = setInterval(() => {
      dots.textContent = dots.textContent.length >= 3 ? '.' : dots.textContent + '.';
    }, 450);
  })();

  // ─── THEME ───
  const applyTheme = (dark) => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    DOM.body.classList.toggle('dark-mode', dark);
    if (DOM.themeIcon) DOM.themeIcon.className = dark ? 'fas fa-sun' : 'fas fa-moon';
  };
  const initTheme = () => {
    const saved = localStorage.getItem('theme');
    applyTheme(saved ? saved === 'dark' : false);
  };
  const toggleTheme = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(!isDark);
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    showToast(`Mode ${isDark ? 'terang' : 'gelap'} aktif`, 'success');
  };

  // ─── SIDENAV ───
  const initSideNav = () => {
    const collapsed = localStorage.getItem('navCollapsed') === 'true';
    if (collapsed) {
      DOM.sideNav?.classList.add('collapsed');
      DOM.mainWrapper?.classList.add('nav-collapsed');
    }
  };
  const toggleNavCollapse = () => {
    DOM.sideNav?.classList.toggle('collapsed');
    DOM.mainWrapper?.classList.toggle('nav-collapsed');
    localStorage.setItem('navCollapsed', DOM.sideNav?.classList.contains('collapsed'));
  };
  const toggleNavMobile = () => DOM.sideNav?.classList.toggle('active');
  const closeNavOutside = (e) => {
    if (window.innerWidth >= 992) return;
    if (!DOM.sideNav?.contains(e.target) && !DOM.menuToggle?.contains(e.target))
      DOM.sideNav?.classList.remove('active');
  };

  // ─── SCROLL ACTIVE NAV ───
  const handleScroll = () => {
    const scrollY = window.scrollY;
    const headerH = DOM.mainWrapper?.querySelector('.main-header')?.offsetHeight || 64;
    $$('section[id]').forEach(sec => {
      const top = sec.offsetTop - headerH - 20;
      const link = document.querySelector(`.side-nav-link[href="#${sec.id}"]`);
      if (!link) return;
      const active = scrollY >= top && scrollY < top + sec.offsetHeight;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  };

  // ─── NOTIFICATIONS ───
  const loadNotifs = async () => {
    try {
      const r = await fetch('/notifications.json');
      if (!r.ok) return;
      allNotifs = await r.json();
      updateNotifBadge();
    } catch {}
  };
  const getReadIds = () => {
    try { return JSON.parse(sessionStorage.getItem('readNotifIds') || '[]'); } catch { return []; }
  };
  const markRead = (id) => {
    const ids = getReadIds();
    if (!ids.includes(id)) { ids.push(id); sessionStorage.setItem('readNotifIds', JSON.stringify(ids)); }
  };
  const getUnread = () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const readIds = getReadIds();
    return allNotifs.filter(n => {
      const d = new Date(n.date); d.setHours(0,0,0,0);
      return !n.read && d <= today && !readIds.includes(n.id);
    });
  };
  const updateNotifBadge = () => {
    DOM.notifBadge?.classList.toggle('active', getUnread().length > 0);
  };
  const handleNotifClick = () => {
    const unread = getUnread();
    if (unread.length) {
      unread.forEach(n => {
        const d = new Date(n.date).toLocaleDateString('id-ID');
        showToast(n.message, 'notification', `Notifikasi · ${d}`);
        markRead(n.id);
      });
      updateNotifBadge();
    } else {
      showToast('Tidak ada notifikasi baru.', 'info');
    }
  };

  // ─── POPULATE PAGE ───
  const populatePage = () => {
    if (!settings || !Object.keys(settings).length) return;
    const year = new Date().getFullYear();
    const creator = settings.apiSettings?.creator || 'zyraa';

    setText(DOM.appName, settings.name, 'Zyrä API');
    setText(DOM.sideNavName, settings.name, 'Zyrä API');
    setText(DOM.versionBadge, settings.version, 'v1.0');
    setText(DOM.appDesc, settings.description, 'Dokumentasi API modern.');
    setText(DOM.wm, `© ${year} ${creator}. All rights reserved.`);

    // ─── BANNER: support video (.mp4, .webm) atau image ───
    const bannerWrap = DOM.dynamicImage?.parentElement;
    if (bannerWrap) {
      const bannerSrc = settings.bannerImage || '/src/banner.jpg';
      const isVideo = /\.(mp4|webm|ogg)$/i.test(bannerSrc);
      if (isVideo) {
        const vid = document.createElement('video');
        vid.src = bannerSrc;
        vid.className = 'hero-banner';
        vid.autoplay = true;
        vid.loop = true;
        vid.muted = true;
        vid.playsInline = true;
        vid.setAttribute('playsinline', '');
        if (DOM.dynamicImage) DOM.dynamicImage.replaceWith(vid);
      } else {
        if (DOM.dynamicImage) {
          DOM.dynamicImage.src = bannerSrc;
          DOM.dynamicImage.onerror = () => { DOM.dynamicImage.src = '/src/banner.jpg'; };
        }
      }
    }

    if (DOM.apiLinksContainer && settings.links?.length) {
      DOM.apiLinksContainer.innerHTML = '';
      settings.links.forEach(({ url, name, icon }, i) => {
        const a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.className = i === 0 ? 'btn-primary' : 'btn-ghost';
        a.style.animationDelay = `${i * 0.1}s`;
        a.setAttribute('aria-label', name);
        a.innerHTML = `<i class="${icon || 'fas fa-external-link-alt'}"></i> ${name}`;
        DOM.apiLinksContainer.appendChild(a);
      });
    }
  };

  // ─── DETECT METHOD ───
  const detectMethod = (item) => {
    if (item.method) return item.method.toUpperCase();
    return 'GET';
  };

  // ─── RENDER CATEGORIES ───
  const renderCategories = () => {
    if (!DOM.apiContent || !settings.categories?.length) {
      renderError('Tidak ada kategori API ditemukan.');
      return;
    }
    DOM.apiContent.innerHTML = '';
    settings.categories.forEach((cat, ci) => {
      const sorted = [...cat.items].sort((a, b) => a.name.localeCompare(b.name));
      const section = document.createElement('section');
      section.className = 'category-section';
      section.id = `cat-${cat.name.toLowerCase().replace(/\s+/g, '-')}`;
      section.setAttribute('aria-labelledby', `cat-title-${ci}`);
      const header = document.createElement('h3');
      header.className = 'category-header';
      header.id = `cat-title-${ci}`;
      header.innerHTML = `<i class="${cat.icon || 'fas fa-layer-group'}"></i>`;
      header.appendChild(document.createTextNode(cat.name));
      section.appendChild(header);
      const grid = document.createElement('div');
      grid.className = 'cards-grid';
      sorted.forEach((item, ii) => {
        const method = detectMethod(item);
        const status = item.status || 'ready';
        const statusMap = {
          ready:  { cls: 'status-ready',  dot: 'active', label: 'Ready' },
          error:  { cls: 'status-error',  dot: 'error',  label: 'Error' },
          update: { cls: 'status-update', dot: 'update', label: 'Update' },
        };
        const st = statusMap[status] || statusMap.ready;
        const isDisabled = status !== 'ready';
        const pathClean = item.path?.split('?')[0] || '';
        const wrapper = document.createElement('div');
        wrapper.className = 'api-item';
        wrapper.dataset.name = item.name;
        wrapper.dataset.desc = item.desc;
        wrapper.dataset.category = cat.name;
        wrapper.style.animationDelay = `${ii * 0.05}s`;
        const card = document.createElement('article');
        card.className = `api-card${isDisabled ? ' unavailable' : ''}`;
        card.innerHTML = `
          <div class="card-top">
            <span class="card-method method-${method.toLowerCase()}">${method}</span>
            <div class="card-status ${st.cls}">
              <span class="dot"></span>
              <span>${st.label}</span>
            </div>
          </div>
          <h5 class="card-name">${item.name}</h5>
          <p class="card-desc">${item.desc}</p>
          <div class="card-path"><i class="fas fa-link" style="font-size:10px;opacity:0.5;margin-right:4px"></i>${pathClean}</div>
          <div class="card-footer">
            <button class="get-api-btn"
              data-path="${item.path || ''}"
              data-name="${item.name}"
              data-desc="${item.desc}"
              data-method="${method}"
              ${item.params ? `data-params='${JSON.stringify(item.params)}'` : ''}
              ${item.paramTypes ? `data-paramtypes='${JSON.stringify(item.paramTypes)}'` : ''}
              ${item.innerDesc ? `data-inner="${encodeURIComponent(item.innerDesc)}"` : ''}
              ${isDisabled ? 'disabled' : ''}
              aria-label="Coba ${item.name}"
            >
              <i class="fas fa-play"></i> Coba
            </button>
          </div>
        `;
        wrapper.appendChild(card);
        grid.appendChild(wrapper);
      });
      section.appendChild(grid);
      DOM.apiContent.appendChild(section);
    });
    observeItems();
  };

  const renderError = (msg) => {
    if (!DOM.apiContent) return;
    DOM.apiContent.innerHTML = `
      <div class="no-results">
        <i class="fas fa-triangle-exclamation"></i>
        <h5>${msg}</h5>
        <p>Coba muat ulang halaman atau hubungi admin.</p>
        <button class="btn-retry" onclick="location.reload()"><i class="fas fa-rotate-right"></i> Muat Ulang</button>
      </div>`;
  };

  // ─── SEARCH ───
  const handleSearch = () => {
    const term = DOM.searchInput?.value.toLowerCase().trim() || '';
    DOM.clearSearch?.classList.toggle('visible', term.length > 0);
    const items = $$('.api-item');
    const visibleSections = new Set();
    items.forEach(item => {
      const matches =
        (item.dataset.name || '').toLowerCase().includes(term) ||
        (item.dataset.desc || '').toLowerCase().includes(term) ||
        (item.dataset.category || '').toLowerCase().includes(term);
      item.style.display = matches ? '' : 'none';
      if (matches) visibleSections.add(item.closest('.category-section'));
    });
    $$('.category-section').forEach(s => {
      s.style.display = visibleSections.has(s) ? '' : 'none';
    });
    const total = Array.from(items).filter(i => i.style.display !== 'none').length;
    const rc = document.getElementById('resultCount');
    if (rc) rc.textContent = term ? `${total} hasil` : '';
    let noRes = document.getElementById('noResultsMsg');
    if (!noRes) {
      noRes = document.createElement('div');
      noRes.id = 'noResultsMsg';
      noRes.className = 'no-results';
      noRes.innerHTML = `
        <i class="fas fa-magnifying-glass"></i>
        <h5>Tidak ada hasil untuk "<span id="noResTerm"></span>"</h5>
        <p>Coba kata kunci lain.</p>
        <button class="btn-retry" id="clearFromEmpty"><i class="fas fa-xmark"></i> Hapus Pencarian</button>`;
      DOM.apiContent.appendChild(noRes);
      document.getElementById('clearFromEmpty')?.addEventListener('click', clearSearch);
    }
    noRes.style.display = total === 0 && term.length > 0 ? 'flex' : 'none';
    const termEl = document.getElementById('noResTerm');
    if (termEl) termEl.textContent = term;
  };

  const clearSearch = () => {
    if (!DOM.searchInput) return;
    DOM.searchInput.value = '';
    DOM.searchInput.focus();
    DOM.searchInput.classList.add('shake');
    setTimeout(() => DOM.searchInput.classList.remove('shake'), 400);
    handleSearch();
  };

  // ─── INTERSECTION OBSERVER ───
  const observeItems = () => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in-view'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    $$('.api-item:not(.in-view)').forEach(el => obs.observe(el));
  };

  // ─── MODAL ───
  const openModal = () => {
    DOM.modalBackdrop?.classList.add('active');
    DOM.apiModal?.classList.add('open');
    DOM.body.classList.add('no-scroll');
  };
  const closeModal = () => {
    DOM.modalBackdrop?.classList.remove('active');
    DOM.apiModal?.classList.remove('open');
    DOM.body.classList.remove('no-scroll');
    currentApi = null;
  };
  const resetModal = () => {
    if (DOM.queryContainer) DOM.queryContainer.innerHTML = '';
    if (DOM.respLoading) DOM.respLoading.classList.add('hidden');
    if (DOM.respContainer) DOM.respContainer.classList.add('hidden');
    if (DOM.respContent) { DOM.respContent.innerHTML = ''; DOM.respContent.classList.add('hidden'); }
    if (DOM.respStatus) DOM.respStatus.textContent = '';
    if (DOM.submitBtn) {
      DOM.submitBtn.disabled = true;
      DOM.submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim';
    }
    const helperContainer = document.getElementById('helperContainer');
    if (helperContainer) {
      helperContainer.classList.add('hidden');
      helperContainer.querySelectorAll('.helper-panel').forEach(p => p.classList.remove('active'));
      helperContainer.querySelectorAll('.helper-tab').forEach(t => t.classList.remove('active'));
      helperContainer.querySelector('.helper-tab')?.classList.add('active');
      helperContainer.querySelector('.helper-panel')?.classList.add('active');
    }
  };

  const setupModal = (api) => {
    resetModal();
    const method = api.method || 'GET';
    if (DOM.modalMethod) {
      DOM.modalMethod.textContent = method;
      DOM.modalMethod.className = `modal-method${method === 'POST' ? ' post' : ''}`;
    }
    setText(DOM.modalTitle, api.name);
    setText(DOM.modalSubtitle, api.desc);
    const basePath = api.path?.split('?')[0] || '';
    if (DOM.apiEndpoint) DOM.apiEndpoint.textContent = `${window.location.origin}${basePath}`;
    const paramKeys = api.path?.includes('?')
      ? Array.from(new URLSearchParams(api.path.split('?')[1]).keys()).filter(k => k.trim())
      : [];
    if (paramKeys.length > 0) {
      buildParamForm(paramKeys, api);
      DOM.submitBtn?.classList.remove('hidden');
    } else {
      fetchApi(`${window.location.origin}${api.path}`, api.name, method);
    }
  };

  const buildParamForm = (keys, api) => {
    const container = document.createElement('div');
    container.className = 'param-container';
    const title = document.createElement('div');
    title.className = 'param-section-title';
    title.innerHTML = '<i class="fas fa-sliders"></i> Parameter';
    container.appendChild(title);
    keys.forEach(key => {
      const group = document.createElement('div');
      group.className = 'param-group';
      const typeInfo = api.paramTypes?.[key];
      const hint = api.params?.[key];
      const isOptional = hint && /optional/i.test(hint);
      const label = document.createElement('label');
      label.className = 'param-label';
      label.htmlFor = `param-${key}`;
      const optBadge = isOptional
        ? '<span class="param-optional">optional</span>'
        : '<span class="param-required">*</span>';
      label.innerHTML = `${key} ${optBadge}`;
      if (hint) {
        const info = document.createElement('span');
        info.className = 'param-info';
        info.title = hint.replace(/\s*\(optional\)/i, '').trim();
        info.innerHTML = ' <i class="fas fa-circle-info"></i>';
        label.appendChild(info);
      }
      group.appendChild(label);
      if (typeInfo && typeof typeInfo === 'object' && typeInfo.type === 'select') {
        const options = typeInfo.options || [];
        const defaultOpt = options.find(o => typeof o === 'object' && o.default);
        const hidden = document.createElement('input');
        hidden.type = 'hidden'; hidden.id = `param-${key}`;
        hidden.dataset.param = key; hidden.required = !isOptional;
        if (defaultOpt) hidden.value = defaultOpt.value;
        group.appendChild(hidden);
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'cd-trigger' + (defaultOpt ? '' : ' cd-placeholder');
        trigger.innerHTML = `<span class="cd-value">${defaultOpt ? defaultOpt.label : (typeInfo.placeholder || `Pilih ${key}...`)}</span><i class="fas fa-chevron-down cd-arrow"></i>`;
        group.appendChild(trigger);
        const list = document.createElement('div');
        list.className = 'cd-list hidden';
        options.forEach(opt => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? opt.label : opt;
          const isDefault = defaultOpt && val === defaultOpt.value;
          const item = document.createElement('div');
          item.className = 'cd-item' + (isDefault ? ' cd-item-active' : '');
          item.dataset.value = val;
          item.innerHTML = `<span>${optLabel}</span>${isDefault ? '<i class="fas fa-check cd-check"></i>' : ''}`;
          item.addEventListener('click', () => {
            hidden.value = val;
            trigger.querySelector('.cd-value').textContent = optLabel;
            trigger.classList.remove('cd-placeholder');
            list.querySelectorAll('.cd-item').forEach(i => {
              i.classList.remove('cd-item-active');
              i.querySelector('.cd-check')?.remove();
            });
            item.classList.add('cd-item-active');
            const chk = document.createElement('i');
            chk.className = 'fas fa-check cd-check';
            item.appendChild(chk);
            list.classList.add('hidden');
            trigger.querySelector('.cd-arrow').style.transform = '';
            validateInputs();
          });
          list.appendChild(item);
        });
        group.appendChild(list);
        trigger.addEventListener('click', e => {
          e.stopPropagation();
          const isOpen = !list.classList.contains('hidden');
          document.querySelectorAll('.cd-list:not(.hidden)').forEach(l => {
            l.classList.add('hidden');
            const arr = l.closest('.param-group')?.querySelector('.cd-arrow');
            if (arr) arr.style.transform = '';
          });
          if (!isOpen) {
            list.classList.remove('hidden');
            trigger.querySelector('.cd-arrow').style.transform = 'rotate(180deg)';
          }
        });
      } else if (typeInfo && typeof typeInfo === 'object' && typeInfo.type === 'file') {
        const input = document.createElement('input');
        input.type = 'file'; input.className = 'param-input param-file';
        input.id = `param-${key}`; input.dataset.param = key;
        input.dataset.paramFile = 'true'; input.required = !isOptional;
        if (typeInfo.accept) input.accept = typeInfo.accept;
        input.addEventListener('change', validateInputs);
        group.appendChild(input);
      } else if (typeInfo === 'textarea') {
        const ta = document.createElement('textarea');
        ta.className = 'param-input param-textarea';
        ta.id = `param-${key}`; ta.placeholder = hint || `Masukkan ${key}...`;
        ta.dataset.param = key; ta.required = !isOptional; ta.rows = 4;
        ta.autocomplete = 'off';
        ta.addEventListener('input', validateInputs);
        group.appendChild(ta);
      } else {
        const input = document.createElement('input');
        input.type = 'text'; input.className = 'param-input';
        input.id = `param-${key}`; input.placeholder = hint || `Masukkan ${key}...`;
        input.dataset.param = key; input.required = !isOptional;
        input.autocomplete = 'off';
        input.addEventListener('input', validateInputs);
        group.appendChild(input);
      }
      container.appendChild(group);
    });
    if (api.innerDesc) {
      const box = document.createElement('div');
      box.className = 'inner-desc-box';
      box.innerHTML = `<i class="fas fa-circle-info"></i> <span>${decodeURIComponent(api.innerDesc).replace(/\n/g, '<br>')}</span>`;
      container.appendChild(box);
    }
    DOM.queryContainer.appendChild(container);
    DOM.submitBtn?.classList.remove('hidden');
  };

  const validateInputs = () => {
    const fields = DOM.queryContainer?.querySelectorAll('input[required], select[required], textarea[required]');
    const allFilled = Array.from(fields || []).every(f => {
      if (f.type === 'file') return f.files && f.files.length > 0;
      return f.value.trim() !== '';
    });
    if (DOM.submitBtn) DOM.submitBtn.disabled = !allFilled;
    fields?.forEach(f => {
      if (f.type === 'file') { if (f.files?.length) f.classList.remove('is-invalid'); }
      else if (f.value.trim()) f.classList.remove('is-invalid');
    });
  };

  const handleSubmit = async () => {
    if (!currentApi) return;
    const fields = DOM.queryContainer?.querySelectorAll('input, select, textarea');
    const hasFileField = Array.from(fields || []).some(f => f.type === 'file');
    let valid = true;

    if (hasFileField) {
      const formData = new FormData();
      fields?.forEach(field => {
        if (field.type === 'file') {
          if (field.required && (!field.files || !field.files.length)) {
            valid = false;
            field.classList.add('is-invalid');
            field.closest('.param-group')?.classList.add('shake');
            setTimeout(() => field.closest('.param-group')?.classList.remove('shake'), 400);
          } else if (field.files?.length && field.dataset.param) {
            formData.append(field.dataset.param, field.files[0]);
            field.classList.remove('is-invalid');
          }
        } else if (field.required && !field.value.trim()) {
          valid = false;
          field.classList.add('is-invalid');
          field.closest('.param-group')?.classList.add('shake');
          setTimeout(() => field.closest('.param-group')?.classList.remove('shake'), 400);
        } else if (field.value.trim() && field.dataset.param) {
          formData.append(field.dataset.param, field.value.trim());
          field.classList.remove('is-invalid');
        }
      });
      if (!valid) { showToast('Harap isi semua field yang wajib diisi.', 'error'); return; }
      const basePath = currentApi.path?.split('?')[0] || '';
      const fullUrl = `${window.location.origin}${basePath}`;
      if (DOM.apiEndpoint) DOM.apiEndpoint.textContent = fullUrl;
      const form = DOM.queryContainer?.querySelector('.param-container');
      if (form) { form.style.opacity = '0.4'; form.style.pointerEvents = 'none'; }
      DOM.submitBtn.disabled = true;
      DOM.submitBtn.innerHTML = '<span class="spinner-sm"></span> Memproses...';
      await fetchApi(fullUrl, currentApi.name, 'POST', formData);
      if (form) { form.style.opacity = '1'; form.style.pointerEvents = ''; }
      DOM.submitBtn.disabled = false;
      DOM.submitBtn.innerHTML = '<i class="fas fa-rotate-right"></i> Kirim Ulang';
      return;
    }

    const params = new URLSearchParams();
    fields?.forEach(field => {
      if (field.required && !field.value.trim()) {
        valid = false;
        field.classList.add('is-invalid');
        field.closest('.param-group')?.classList.add('shake');
        setTimeout(() => field.closest('.param-group')?.classList.remove('shake'), 400);
      } else if (field.value.trim() && field.dataset.param) {
        params.append(field.dataset.param, field.value.trim());
        field.classList.remove('is-invalid');
      }
    });
    if (!valid) { showToast('Harap isi semua field yang wajib diisi.', 'error'); return; }
    const basePath = currentApi.path?.split('?')[0] || '';
    const fullUrl = `${window.location.origin}${basePath}?${params.toString()}`;
    if (DOM.apiEndpoint) DOM.apiEndpoint.textContent = fullUrl;
    const form = DOM.queryContainer?.querySelector('.param-container');
    if (form) { form.style.opacity = '0.4'; form.style.pointerEvents = 'none'; }
    DOM.submitBtn.disabled = true;
    DOM.submitBtn.innerHTML = '<span class="spinner-sm"></span> Memproses...';
    await fetchApi(fullUrl, currentApi.name, currentApi.method || 'GET');
    if (form) { form.style.opacity = '1'; form.style.pointerEvents = ''; }
    DOM.submitBtn.disabled = false;
    DOM.submitBtn.innerHTML = '<i class="fas fa-rotate-right"></i> Kirim Ulang';
  };

  // ─── DETECT VIDEO URL ───
  const isVideoUrl = (url) => /\.(mp4|webm|ogg|mkv|mov)(\?.*)?$/i.test(url);
  const isImageUrl = (url) => /\.(jpe?g|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
  const isVideyUrl = (url) => typeof url === 'string' && /^https?:\/\/(www\.)?videy\.co\//i.test(url);

  // ─── FETCH API ───
  const fetchApi = async (url, name, method = 'GET', body = null) => {
    if (DOM.respLoading) DOM.respLoading.classList.remove('hidden');
    if (DOM.respContainer) DOM.respContainer.classList.add('hidden');
    if (DOM.respContent) { DOM.respContent.innerHTML = ''; DOM.respContent.classList.add('hidden'); }

    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 20000);
      const options = { method, signal: ctrl.signal };
      if (body) options.body = body; // FormData — jangan set Content-Type manual, browser yang isi boundary
      const resp = await fetch(url, options);
      clearTimeout(tid);

      if (DOM.respStatus) {
        DOM.respStatus.textContent = `${resp.status} ${resp.statusText}`;
        DOM.respStatus.className = `status-pill ${resp.ok ? 'ok' : 'err'}`;
      }

      const ct = resp.headers.get('Content-Type') || '';

      // ── AUDIO — jangan interrupt music player yang lagi main ──
      if (ct.includes('audio/')) {
        const isPlaying = globalAudio && !globalAudio.paused;
        if (DOM.respContent) {
          DOM.respContent.classList.remove('hidden');
          DOM.respContent.style.whiteSpace = 'normal';
          DOM.respContent.innerHTML = '';
          const audioEl = document.createElement('audio');
          audioEl.src = url; audioEl.controls = true;
          audioEl.style.cssText = 'width:100%;margin-top:4px;border-radius:8px;';
          if (!isPlaying) audioEl.autoplay = true;
          DOM.respContent.appendChild(audioEl);
          if (isPlaying) {
            const note = document.createElement('div');
            note.style.cssText = 'font-size:11px;opacity:0.5;margin-top:6px;';
            note.innerHTML = '<i class="fas fa-music"></i> Music player sedang aktif — autoplay dinonaktifkan.';
            DOM.respContent.appendChild(note);
          }
        }
        showHelper(url, method, false, false);
        if (DOM.respContainer) DOM.respContainer.classList.remove('hidden');
        if (DOM.respLoading) DOM.respLoading.classList.add('hidden');
        showToast('Data berhasil diambil!', 'success');
        return;
      }

      // ── VIDEO (binary stream) ──
      if (ct.includes('video/')) {
        const blob = await resp.blob();
        const burl = URL.createObjectURL(blob);
        renderVideoResponse(burl, name, blob.type.split('/')[1] || 'mp4');
        showHelper(url, method, false, true);

      // ── IMAGE (binary stream) ──
      } else if (ct.includes('image/')) {
        const blob = await resp.blob();
        const burl = URL.createObjectURL(blob);
        const img = document.createElement('img');
        img.src = burl; img.alt = name; img.className = 'response-image';
        const ext = blob.type.split('/')[1] || 'png';
        const dl = document.createElement('a');
        dl.href = burl; dl.download = `${name.toLowerCase().replace(/\s+/g, '-')}.${ext}`;
        dl.className = 'btn-download';
        dl.innerHTML = '<i class="fas fa-download"></i> Unduh Gambar';
        if (DOM.respContent) {
          DOM.respContent.classList.remove('hidden');
          DOM.respContent.style.whiteSpace = 'normal';
          DOM.respContent.innerHTML = '';
          DOM.respContent.appendChild(img);
          DOM.respContent.appendChild(dl);
        }
        showHelper(url, method, true, false);

      // ── JSON ──
      } else if (ct.includes('application/json') || ct.includes('text/json')) {
        const data = await resp.json();
        const total = data?.result?.total ?? data?.total ?? data?.data?.length ?? null;
        if (total !== null && DOM.respStatus)
          DOM.respStatus.textContent = `${resp.status} ${resp.statusText} · ${total} hasil`;

        // Cek apakah value di dalam JSON adalah URL video/image
        const flatVals = extractStringValues(data);
        const videyVal = flatVals.find(v => isVideyUrl(v));
        const videoVal = !videyVal && flatVals.find(v => isVideoUrl(v));
        const imageVal = !videyVal && !videoVal && flatVals.find(v => isImageUrl(v));

        if (videyVal) {
          renderJsonResponse(data);
          renderVideyLink(videyVal);
          showHelper(url, method, false, false);
        } else if (videoVal) {
          // Render JSON dulu, lalu preview video di bawah — tapi endpoint-nya tetap JSON
          renderJsonResponse(data);
          renderVideoPreview(videoVal, name);
          showHelper(url, method, false, false);
        } else if (imageVal) {
          renderJsonResponse(data);
          const img = document.createElement('img');
          img.src = imageVal; img.alt = name;
          img.className = 'response-image'; img.style.marginTop = '12px';
          DOM.respContent.appendChild(img);
          showHelper(url, method, false, false);
        } else {
          renderJsonResponse(data);
          showHelper(url, method, false, false);
        }

      // ── TEXT ──
      } else {
        const text = await resp.text();
        // Cek kalau text adalah URL video
        const trimmed = text.trim();
        if (isVideoUrl(trimmed)) {
          renderVideoResponse(trimmed, name, 'mp4');
          showHelper(trimmed, method, false, true);
        } else {
          if (DOM.respContent) {
            DOM.respContent.textContent = trimmed || '(Respons kosong)';
            DOM.respContent.style.whiteSpace = 'pre-wrap';
            DOM.respContent.classList.remove('hidden');
          }
          showHelper(url, method, false, false);
        }
      }

      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      if (DOM.respContainer) DOM.respContainer.classList.remove('hidden');
      showToast('Data berhasil diambil!', 'success');

    } catch (err) {
      if (DOM.respContent) {
        DOM.respContent.style.whiteSpace = 'normal';
        DOM.respContent.innerHTML = `
          <div class="error-box">
            <i class="fas fa-triangle-exclamation"></i>
            <h6>Gagal mengambil data</h6>
            <p>${err.name === 'AbortError' ? 'Request timeout (>20 detik).' : err.message}</p>
            <button class="btn-retry" id="retryBtn"><i class="fas fa-rotate-right"></i> Coba Lagi</button>
          </div>`;
        DOM.respContent.classList.remove('hidden');
        document.getElementById('retryBtn')?.addEventListener('click', () => setupModal(currentApi));
      }
      if (DOM.respStatus) { DOM.respStatus.textContent = 'Error'; DOM.respStatus.className = 'status-pill err'; }
      if (DOM.respContainer) DOM.respContainer.classList.remove('hidden');
      showToast(err.name === 'AbortError' ? 'Request timeout.' : 'Gagal mengambil data.', 'error');
    } finally {
      if (DOM.respLoading) DOM.respLoading.classList.add('hidden');
    }
  };

  // ─── RENDER HELPERS ───
  const renderJsonResponse = (data) => {
    const highlighted = syntaxHighlight(JSON.stringify(data, null, 2));
    if (DOM.respContent) {
      DOM.respContent.innerHTML = highlighted;
      DOM.respContent.style.whiteSpace = 'pre';
      DOM.respContent.classList.remove('hidden');
    }
  };

  const renderVideyLink = (videyUrl) => {
    if (!DOM.respContent) return;
    const card = document.createElement('div');
    card.className = 'videy-link-card';
    card.style.cssText = 'margin-top:12px;padding:14px;border:1px solid rgba(0,0,0,0.1);border-radius:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;';
    card.innerHTML = `
      <i class="fas fa-circle-play" style="font-size:18px;opacity:0.6;"></i>
      <a href="${videyUrl}" target="_blank" rel="noopener" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;">${videyUrl}</a>
      <button type="button" class="btn-copy-videy" style="border:none;background:rgba(0,0,0,0.06);padding:6px 10px;border-radius:6px;cursor:pointer;font-size:12px;">
        <i class="fas fa-copy"></i> Copy
      </button>
    `;
    card.querySelector('.btn-copy-videy')?.addEventListener('click', () => {
      navigator.clipboard.writeText(videyUrl).then(() => showToast('Link videy disalin!', 'success'));
    });
    DOM.respContent.appendChild(card);
  };

  const renderVideoResponse = (src, name, ext = 'mp4') => {
    const vid = document.createElement('video');
    vid.src = src; vid.controls = true; vid.className = 'response-image';
    vid.style.cssText = 'max-width:100%;border-radius:8px;margin-bottom:10px;';
    const dl = document.createElement('a');
    dl.href = src; dl.download = `${name.toLowerCase().replace(/\s+/g, '-')}.${ext}`;
    dl.className = 'btn-download';
    dl.innerHTML = '<i class="fas fa-download"></i> Unduh Video';
    if (DOM.respContent) {
      DOM.respContent.classList.remove('hidden');
      DOM.respContent.style.whiteSpace = 'normal';
      DOM.respContent.innerHTML = '';
      DOM.respContent.appendChild(vid);
      DOM.respContent.appendChild(dl);
    }
  };

  const renderVideoPreview = (src, name) => {
    const wrap = document.createElement('div');
    wrap.style.marginTop = '12px';
    const label = document.createElement('div');
    label.style.cssText = 'font-size:11px;opacity:0.5;margin-bottom:6px;';
    label.textContent = '▶ Preview Video';
    const vid = document.createElement('video');
    vid.src = src; vid.controls = true;
    vid.style.cssText = 'max-width:100%;border-radius:8px;display:block;';
    const dl = document.createElement('a');
    dl.href = src; dl.download = `${name.toLowerCase().replace(/\s+/g, '-')}.mp4`;
    dl.className = 'btn-download'; dl.style.marginTop = '8px';
    dl.innerHTML = '<i class="fas fa-download"></i> Unduh Video';
    wrap.appendChild(label); wrap.appendChild(vid); wrap.appendChild(dl);
    DOM.respContent?.appendChild(wrap);
  };

  // Ekstrak semua string dari JSON object (flat)
  const extractStringValues = (obj, depth = 0) => {
    if (depth > 4) return [];
    if (typeof obj === 'string') return [obj];
    if (Array.isArray(obj)) return obj.flatMap(v => extractStringValues(v, depth + 1));
    if (obj && typeof obj === 'object') return Object.values(obj).flatMap(v => extractStringValues(v, depth + 1));
    return [];
  };

  // ─── SYNTAX HIGHLIGHT ───
  const syntaxHighlight = (json) => {
    json = json.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      match => {
        let cls = 'json-number';
        if (/^"/.test(match)) cls = /:$/.test(match) ? 'json-key' : 'json-string';
        else if (/true|false/.test(match)) cls = 'json-boolean';
        else if (/null/.test(match)) cls = 'json-null';
        return `<span class="${cls}">${match}</span>`;
      }
    );
  };

  // ─── HELPER GENERATOR ───
  const showHelper = (url, method = 'GET', isImage = false, isVideo = false) => {
    const helperContainer = document.getElementById('helperContainer');
    if (!helperContainer) return;
    const encUrl = url.replace(/'/g, "\\'");

    const fetchCode = isVideo
      ? `const res = await (async () => {\n  const r = await fetch('${encUrl}');\n  return Buffer.from(await r.arrayBuffer());\n})();\nconsole.log(res);`
      : isImage
        ? `const res = await (async () => {\n  const r = await fetch('${encUrl}');\n  return Buffer.from(await r.arrayBuffer());\n})();\nconsole.log(res);`
        : method === 'POST'
          ? `const res = await (async () => {\n  const r = await fetch('${encUrl}', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' }\n  });\n  return r.json();\n})();\nconsole.log(res);`
          : `const res = await (async () => {\n  const r = await fetch('${encUrl}');\n  return r.json();\n})();\nconsole.log(res);`;

    const waCode = isVideo
      ? `await (async () => {\n  const { default: axios } = await import('axios');\n  const r = await axios.get('${encUrl}', { responseType: 'arraybuffer' });\n  const buf = Buffer.from(r.data);\n  await ZyraHtEE.sendMessage(m.chat, { video: buf, caption: '🎬' }, { quoted: m });\n})();`
      : isImage
        ? `await (async () => {\n  const { default: axios } = await import('axios');\n  const r = await axios.get('${encUrl}', { responseType: 'arraybuffer' });\n  const buf = Buffer.from(r.data);\n  await ZyraHtEE.sendMessage(m.chat, { image: buf, caption: '✨' }, { quoted: m });\n})();`
        : method === 'POST'
          ? `await (async () => {\n  const { default: axios } = await import('axios');\n  const { data } = await axios.post('${encUrl}');\n  await ZyraHtEE.sendMessage(m.chat, { text: JSON.stringify(data, null, 2) }, { quoted: m });\n})();`
          : `await (async () => {\n  const { default: axios } = await import('axios');\n  const { data } = await axios.get('${encUrl}');\n  await ZyraHtEE.sendMessage(m.chat, { text: JSON.stringify(data, null, 2) }, { quoted: m });\n})();`;

    const tgCode = isVideo
      ? `await (async () => {\n  const { default: axios } = await import('axios');\n  const r = await axios.get('${encUrl}', { responseType: 'arraybuffer' });\n  const buf = Buffer.from(r.data);\n  await bot.sendVideo(msg.chat.id, buf, { caption: '🎬' });\n})();`
      : isImage
        ? `await (async () => {\n  const { default: axios } = await import('axios');\n  const r = await axios.get('${encUrl}', { responseType: 'arraybuffer' });\n  const buf = Buffer.from(r.data);\n  await bot.sendPhoto(msg.chat.id, buf, { caption: '✨' });\n})();`
        : method === 'POST'
          ? `await (async () => {\n  const { default: axios } = await import('axios');\n  const { data } = await axios.post('${encUrl}');\n  await bot.sendMessage(msg.chat.id, JSON.stringify(data, null, 2));\n})();`
          : `await (async () => {\n  const { default: axios } = await import('axios');\n  const { data } = await axios.get('${encUrl}');\n  await bot.sendMessage(msg.chat.id, JSON.stringify(data, null, 2));\n})();`;

    const curlCode = isVideo
      ? `curl -s '${url}' --output video.mp4`
      : isImage
        ? `curl -s '${url}' --output image.png`
        : method === 'POST'
          ? `curl -X POST '${url}' \\\n  -H 'Content-Type: application/json' \\\n  -H 'Accept: application/json'`
          : `curl -s -X GET '${url}' \\\n  -H 'Accept: application/json'`;

    const codes = { fetch: fetchCode, wa: waCode, tg: tgCode, curl: curlCode };
    const escHtml = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const panels = { fetch: 'helperFetch', wa: 'helperWa', tg: 'helperTg', curl: 'helperCurl' };
    Object.entries(panels).forEach(([k, id]) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<pre class="helper-code">${escHtml(codes[k])}</pre>`;
    });

    helperContainer.classList.remove('hidden');
    helperContainer.querySelectorAll('.helper-tab').forEach(t => t.classList.remove('active'));
    helperContainer.querySelectorAll('.helper-panel').forEach(p => p.classList.remove('active'));
    helperContainer.querySelector('.helper-tab[data-tab="fetch"]')?.classList.add('active');
    document.getElementById('helperFetch')?.classList.add('active');

    helperContainer.querySelectorAll('.helper-tab').forEach(tab => {
      tab.onclick = () => {
        helperContainer.querySelectorAll('.helper-tab').forEach(t => t.classList.remove('active'));
        helperContainer.querySelectorAll('.helper-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const pid = 'helper' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1);
        document.getElementById(pid)?.classList.add('active');
        const labelMap = {
          fetch: '<i class="fab fa-js"></i> Fetch',
          wa:    '<i class="fab fa-whatsapp"></i> WhatsApp',
          tg:    '<i class="fab fa-telegram"></i> Telegram',
          curl:  '<i class="fas fa-terminal"></i> cURL'
        };
        const lbl = document.getElementById('helperActiveLabel');
        if (lbl) lbl.innerHTML = labelMap[tab.dataset.tab] || tab.dataset.tab;
      };
    });

    const copyHelperBtn = document.getElementById('copyHelper');
    if (copyHelperBtn) {
      copyHelperBtn.onclick = () => {
        const activeTab = helperContainer.querySelector('.helper-tab.active')?.dataset.tab || 'fetch';
        copyText(codes[activeTab], copyHelperBtn);
      };
    }
  };

  // ─── EVENT: CARD CLICK ───
  DOM.apiContent?.addEventListener('click', e => {
    const btn = e.target.closest('.get-api-btn');
    if (!btn || btn.disabled) return;
    currentApi = {
      path:       btn.dataset.path,
      name:       btn.dataset.name,
      desc:       btn.dataset.desc,
      method:     btn.dataset.method || 'GET',
      params:     btn.dataset.params ? JSON.parse(btn.dataset.params) : null,
      paramTypes: btn.dataset.paramtypes ? JSON.parse(btn.dataset.paramtypes) : null,
      innerDesc:  btn.dataset.inner || null,
    };
    setupModal(currentApi);
    openModal();
  });

  // ─── EVENT LISTENERS ───
  const setupEvents = () => {
    DOM.navCollapseBtn?.addEventListener('click', toggleNavCollapse);
    DOM.menuToggle?.addEventListener('click', toggleNavMobile);
    DOM.themeToggleBtn?.addEventListener('click', toggleTheme);
    DOM.searchInput?.addEventListener('input', debounce(handleSearch, 280));
    DOM.clearSearch?.addEventListener('click', clearSearch);
    DOM.notifBell?.addEventListener('click', handleNotifClick);
    DOM.modalClose?.addEventListener('click', closeModal);
    DOM.modalBackdrop?.addEventListener('click', closeModal);
    DOM.copyEndpoint?.addEventListener('click', () => copyText(DOM.apiEndpoint?.textContent || '', DOM.copyEndpoint));
    DOM.copyResponse?.addEventListener('click', () => copyText(DOM.respContent?.textContent || '', DOM.copyResponse));
    DOM.submitBtn?.addEventListener('click', handleSubmit);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    document.addEventListener('click', () => {
      document.querySelectorAll('.cd-list:not(.hidden)').forEach(l => {
        l.classList.add('hidden');
        const arr = l.closest('.param-group')?.querySelector('.cd-arrow');
        if (arr) arr.style.transform = '';
      });
    });
    document.addEventListener('click', closeNavOutside);
    window.addEventListener('scroll', debounce(handleScroll, 60));
  };

  // ─── INIT ───
  const init = async () => {
    setupEvents();
    initTheme();
    initSideNav();
    await loadNotifs();
    try {
      const r = await fetch('/src/settings.json');
      if (!r.ok) throw new Error(`Gagal memuat settings: ${r.status}`);
      settings = await r.json();
      populatePage();
      renderCategories();
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat konfigurasi API.', 'error');
      renderError('Tidak dapat memuat konfigurasi API.');
    } finally {
      hideLoading();
    }
  };

  init();

});
