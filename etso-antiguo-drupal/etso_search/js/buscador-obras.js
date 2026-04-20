/**
 * @file
 * JavaScript para el buscador "Examen de autorías".
 */

(function ($, Drupal, once) {
  'use strict';

  var shellStates = new WeakMap();

  Drupal.behaviors.etsoSearchBuscador = {
    attach: function (context, settings) {
      once('etso-buscador-shell', '.etso-buscador__shell', context).forEach(function (shell) {
        initializeAjaxShell(shell);
        syncAdvancedPanelFromUrl(shell, window.location.href);
      });

      once('etso-buscador-popstate', 'html', document).forEach(function () {
        window.addEventListener('popstate', function () {
          var shell = document.querySelector('.etso-buscador__shell');
          if (!shell) {
            return;
          }

          requestBuscadorUpdate(shell, window.location.href, {
            replace: 'shell',
            history: 'none',
            focus: 'none'
          });
        });
      });

      // Toggle de filtros avanzados
      var advancedToggles = once('etso-advanced-toggle', '.advanced-toggle', context);
      advancedToggles.forEach(function(element) {
        element.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var targetId = this.getAttribute('data-target');
          var shell = this.closest('.etso-buscador__shell');
          var content = shell ? shell.querySelector('#' + targetId) : document.getElementById(targetId);
          if (content) {
            setAdvancedPanelState(content, this, content.classList.contains('hidden'));
          }
        });

        var shell = element.closest('.etso-buscador__shell');
        var targetId = element.getAttribute('data-target');
        var content = shell ? shell.querySelector('#' + targetId) : document.getElementById(targetId);
        if (content) {
          element.setAttribute('aria-expanded', content.classList.contains('hidden') ? 'false' : 'true');
        }
      });

      // La interacción de tabla (expandir fila y dropdown de textos) vive en
      // la librería compartida etso_search/obra_table_shared.

      // Autocompletado multiselección de autores.
      var authorManagers = [];
      once('etso-autor-autocomplete', 'input.js-author-multiselect', context).forEach(function(input) {
        var manager = initAuthorMultiselect(input);
        if (manager) {
          authorManagers.push(manager);
        }
      });

      // Desactivar autor principal cuando hay selección en específicos.
      function syncMainAuthorState() {
        var main = authorManagers.find(function(m) { return m.role === 'main'; });
        var trad = authorManagers.find(function(m) { return m.role === 'trad'; });
        var esto = authorManagers.find(function(m) { return m.role === 'esto'; });
        if (!main) {
          return;
        }

        var hasSpecific = (trad && trad.getIds().length > 0) || (esto && esto.getIds().length > 0);
        main.setDisabled(Boolean(hasSpecific));
      }

      authorManagers.forEach(function(manager) {
        manager.onChange(syncMainAuthorState);
      });
      syncMainAuthorState();

      // Multiselección estática (ej: nivel de confianza).
      once('etso-static-multiselect', 'input.js-static-multiselect', context).forEach(function(input) {
        initStaticMultiselect(input);
      });

      // Coincidencia como switch tipo chip (OR/AND).
      once('etso-match-toggle', '.js-match-toggle', context).forEach(function(fieldset) {
        initMatchToggle(fieldset);
      });

      // Help icon por campo (popover simple).
      once('etso-field-help', '.field-help-trigger', context).forEach(function(trigger) {
        var popoverId = trigger.getAttribute('aria-controls');
        var popover = popoverId ? document.getElementById(popoverId) : null;
        var wrapper = trigger.closest('.field-with-help') || trigger.closest('.has-inline-help');
        if (!popover) {
          return;
        }
        if (!wrapper) {
          wrapper = trigger.parentElement;
        }
        var label = wrapper ? wrapper.querySelector('label, .fieldset-legend') : null;
        if (label && trigger.parentElement !== label) {
          label.classList.add('field-label-with-help');
          var anchor = document.createElement('span');
          anchor.className = 'field-help-anchor';
          label.appendChild(anchor);
          anchor.appendChild(trigger);
          anchor.appendChild(popover);
        }

        var anchorEl = trigger.closest('.field-help-anchor');
        if (!anchorEl) {
          anchorEl = trigger.parentElement;
        }

        function positionPopover() {
          if (!anchorEl || !popover) {
            return;
          }
          anchorEl.classList.remove('help-left', 'help-top', 'help-mobile', 'help-mobile-top', 'help-mobile-bottom');
          popover.style.top = '';
          popover.style.left = '';
          popover.style.right = '';
          popover.style.bottom = '';
          popover.style.width = '';

          var anchorRect = anchorEl.getBoundingClientRect();
          var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
          var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
          var gap = 12;
          var isMobile = viewportWidth <= 768;

          if (isMobile) {
            var mobileWidth = Math.min(360, Math.max(220, viewportWidth - (gap * 2)));

            // Medir alto en modo móvil sin mostrar visualmente el popover al usuario.
            var prevDisplay = popover.style.display;
            var prevVisibility = popover.style.visibility;
            var prevPointerEvents = popover.style.pointerEvents;
            var prevPosition = popover.style.position;
            var prevLeft = popover.style.left;
            var prevRight = popover.style.right;
            var prevTop = popover.style.top;
            var prevBottom = popover.style.bottom;
            var prevTransform = popover.style.transform;
            var prevWidth = popover.style.width;

            popover.style.display = 'block';
            popover.style.visibility = 'hidden';
            popover.style.pointerEvents = 'none';
            popover.style.position = 'fixed';
            popover.style.left = '50%';
            popover.style.right = 'auto';
            popover.style.top = '0';
            popover.style.bottom = 'auto';
            popover.style.transform = 'translateX(-50%)';
            popover.style.width = mobileWidth + 'px';

            var popHeight = popover.getBoundingClientRect().height || 0;
            var spaceAbove = anchorRect.top - gap;
            var showAbove = spaceAbove >= (popHeight + 8);
            var top = showAbove
              ? Math.max(gap, anchorRect.top - popHeight - 8)
              : Math.min(viewportHeight - popHeight - gap, anchorRect.bottom + 8);

            // Restaurar estilos temporales de medida.
            popover.style.display = prevDisplay;
            popover.style.visibility = prevVisibility;
            popover.style.pointerEvents = prevPointerEvents;
            popover.style.position = prevPosition;
            popover.style.left = prevLeft;
            popover.style.right = prevRight;
            popover.style.top = prevTop;
            popover.style.bottom = prevBottom;
            popover.style.transform = prevTransform;
            popover.style.width = prevWidth;

            anchorEl.classList.add('help-mobile');
            anchorEl.classList.add(showAbove ? 'help-mobile-top' : 'help-mobile-bottom');
            popover.style.width = mobileWidth + 'px';
            popover.style.top = top + 'px';
            return;
          }

          var popRect = popover.getBoundingClientRect();

          var overflowRight = (anchorRect.right + 8 + popRect.width) > (viewportWidth - gap);
          if (overflowRight) {
            anchorEl.classList.add('help-left');
          }

          var centeredTop = anchorRect.top + (anchorRect.height / 2) - (popRect.height / 2);
          var overflowTop = centeredTop < gap;
          var overflowBottom = (centeredTop + popRect.height) > (viewportHeight - gap);
          if (overflowTop || overflowBottom) {
            anchorEl.classList.add('help-top');
          }
        }

        function closePopover() {
          if (wrapper) {
            wrapper.classList.remove('is-help-open');
          }
          trigger.setAttribute('aria-expanded', 'false');
          if (anchorEl) {
            anchorEl.classList.remove('help-mobile', 'help-mobile-top', 'help-mobile-bottom');
          }
        }

        trigger.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var isOpen = wrapper && wrapper.classList.contains('is-help-open');
          document.querySelectorAll('.field-with-help.is-help-open').forEach(function(otherWrap) {
            otherWrap.classList.remove('is-help-open');
          });
          document.querySelectorAll('.field-help-trigger[aria-expanded="true"]').forEach(function(other) {
            other.setAttribute('aria-expanded', 'false');
          });
          if (!isOpen) {
            positionPopover();
            if (wrapper) {
              wrapper.classList.add('is-help-open');
            }
            trigger.setAttribute('aria-expanded', 'true');
          } else {
            closePopover();
          }
        });

        trigger.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            trigger.click();
          }
        });

        if (anchorEl) {
          anchorEl.addEventListener('mouseenter', positionPopover);
          anchorEl.addEventListener('focusin', positionPopover);
        }

        window.addEventListener('resize', function() {
          if (wrapper && wrapper.classList.contains('is-help-open')) {
            positionPopover();
          }
        });

        // UX móvil: cerrar tooltip al hacer scroll para que no se quede flotando.
        window.addEventListener('scroll', function() {
          if ((window.innerWidth || document.documentElement.clientWidth) <= 768) {
            closePopover();
          }
        }, { passive: true, capture: true });

        document.addEventListener('click', function(e) {
          if (!popover.contains(e.target) && !trigger.contains(e.target)) {
            closePopover();
          }
        });

        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape') {
            closePopover();
          }
        });
      });
    }
  };

  function initializeAjaxShell(shell) {
    getShellState(shell);

    shell.addEventListener('submit', function (event) {
      var form = event.target;
      if (!form || !form.matches('.buscador-form')) {
        return;
      }

      if (!validateSearchForm(form)) {
        return;
      }

      var url = buildRequestUrlFromForm(form);
      if (!canAjaxNavigate(url)) {
        return;
      }

      event.preventDefault();
      requestBuscadorUpdate(shell, url, {
        replace: 'results',
        history: 'push',
        focus: 'preserve'
      });
    });

    shell.addEventListener('click', function (event) {
      if (event.defaultPrevented) {
        return;
      }

      var resetLink = event.target.closest('.button-group a[href]');
      if (resetLink && shell.contains(resetLink)) {
        if (!shouldInterceptLink(resetLink, event)) {
          return;
        }

        event.preventDefault();
        requestBuscadorUpdate(shell, resetLink.href, {
          replace: 'shell',
          history: 'push',
          focus: 'title'
        });
        return;
      }

      var pagerLink = event.target.closest('.etso-buscador__results .pager a, .etso-buscador__results .pagination a, .etso-buscador__results .pager__item a');
      if (pagerLink && shell.contains(pagerLink)) {
        if (!shouldInterceptLink(pagerLink, event)) {
          return;
        }

        event.preventDefault();
        requestBuscadorUpdate(shell, pagerLink.href, {
          replace: 'results',
          history: 'push',
          focus: 'results'
        });
      }
    });
  }

  function requestBuscadorUpdate(shell, rawUrl, options) {
    var url = toUrl(rawUrl);
    if (!shell || !url || !canAjaxNavigate(url)) {
      fallbackNavigate(rawUrl);
      return Promise.resolve(null);
    }

    var state = getShellState(shell);
    if (state.controller && typeof state.controller.abort === 'function') {
      state.controller.abort();
    }

    var controller = typeof window.AbortController === 'function' ? new window.AbortController() : null;
    state.controller = controller;
    setResultsBusy(shell, true);

    var requestOptions = options || {};
    var fetchOptions = {
      credentials: 'same-origin',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    if (controller) {
      fetchOptions.signal = controller.signal;
    }

    return window.fetch(url.toString(), fetchOptions)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Buscador response failed');
        }

        return response.text().then(function (markup) {
          return {
            markup: markup,
            responseUrl: response.url || url.toString()
          };
        });
      })
      .then(function (payload) {
        var parser = new window.DOMParser();
        var doc = parser.parseFromString(payload.markup, 'text/html');
        var effectiveUrl = toUrl(payload.responseUrl) || url;

        if (requestOptions.replace === 'shell') {
          replaceShellFragment(shell, doc, effectiveUrl, requestOptions);
        }
        else {
          replaceResultsFragment(shell, doc, effectiveUrl, requestOptions);
        }

        updateHistory(effectiveUrl, requestOptions.history);
      })
      .catch(function (error) {
        if (error && error.name === 'AbortError') {
          return;
        }

        fallbackNavigate(url);
      })
      .finally(function () {
        if (!controller || !state.controller || state.controller === controller) {
          state.controller = null;
          setResultsBusy(shell, false);
        }
      });
  }

  function replaceResultsFragment(shell, doc, url, options) {
    var currentResults = shell.querySelector('.etso-buscador__results');
    var nextResults = doc.querySelector('.etso-buscador__results');
    if (!currentResults || !nextResults) {
      throw new Error('Missing results fragment');
    }

    var replacement = nextResults.cloneNode(true);
    currentResults.replaceWith(replacement);
    Drupal.attachBehaviors(replacement);

    if (options && options.focus === 'results') {
      focusWithoutScroll(replacement);
    }

    return replacement;
  }

  function replaceShellFragment(shell, doc, url, options) {
    var nextShell = doc.querySelector('.etso-buscador__shell');
    if (!nextShell) {
      throw new Error('Missing shell fragment');
    }

    var replacement = nextShell.cloneNode(true);
    shell.replaceWith(replacement);
    initializeAjaxShell(replacement);
    syncAdvancedPanelFromUrl(replacement, url);
    Drupal.attachBehaviors(replacement);

    if (options && options.focus === 'title') {
      focusWithoutScroll(replacement.querySelector('input[name="titulo"]'));
    }

    return replacement;
  }

  function buildRequestUrlFromForm(form) {
    var url = toUrl(form.getAttribute('action') || window.location.href) || toUrl(window.location.href);
    var params = new window.URLSearchParams();
    var formData = new window.FormData(form);

    formData.forEach(function (value, name) {
      if (typeof value !== 'string') {
        return;
      }

      var normalizedName = String(name || '');
      var normalizedValue = value.trim();
      if (!normalizedName || !normalizedValue || shouldIgnoreFormField(normalizedName)) {
        return;
      }

      params.append(normalizedName, normalizedValue);
    });

    params.delete('page');
    pruneBuscadorParams(params);
    url.search = params.toString();
    url.hash = '';

    return url;
  }

  function shouldIgnoreFormField(name) {
    return /_ui$/.test(name) || name === 'op';
  }

  function pruneBuscadorParams(params) {
    if (!hasSearchParam(params, 'autor_ids') || params.get('autor_match_main') === 'or') {
      params.delete('autor_match_main');
    }
    if (!hasSearchParam(params, 'autor_trad_ids') || params.get('autor_match_trad') === 'or') {
      params.delete('autor_match_trad');
    }
    if (!hasSearchParam(params, 'autor_esto_ids') || params.get('autor_match_esto') === 'or') {
      params.delete('autor_match_esto');
    }
    if (params.get('page') === '0') {
      params.delete('page');
    }
  }

  function validateSearchForm(form) {
    var startInput = form.querySelector('input[name="fecha_adicion_desde"]');
    var endInput = form.querySelector('input[name="fecha_adicion_hasta"]');

    if (endInput) {
      endInput.setCustomValidity('');
    }

    if (startInput && endInput && startInput.value && endInput.value && startInput.value > endInput.value) {
      endInput.setCustomValidity(Drupal.t('La fecha "hasta" debe ser mayor o igual que la fecha "desde".'));
    }

    if (typeof form.reportValidity === 'function') {
      return form.reportValidity();
    }

    return true;
  }

  function syncAdvancedPanelFromUrl(shell, rawUrl) {
    var content = shell.querySelector('.advanced-content');
    var toggle = shell.querySelector('.advanced-toggle');
    if (!content || !toggle) {
      return;
    }

    setAdvancedPanelState(content, toggle, hasActiveAdvancedFilters(rawUrl));
  }

  function setAdvancedPanelState(content, toggle, isOpen) {
    content.classList.toggle('hidden', !isOpen);
    if (toggle) {
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
  }

  function hasActiveAdvancedFilters(rawUrl) {
    var url = toUrl(rawUrl);
    if (!url) {
      return false;
    }

    var params = url.searchParams;
    return hasSearchParam(params, 'autor_trad_ids') ||
      hasSearchParam(params, 'autor_esto_ids') ||
      hasSearchParam(params, 'tipo_autoria') ||
      hasSearchParam(params, 'estado') ||
      hasSearchParam(params, 'procedencia') ||
      hasSearchParam(params, 'nivel_confianza') ||
      hasSearchParam(params, 'fecha_adicion_desde') ||
      hasSearchParam(params, 'fecha_adicion_hasta');
  }

  function hasSearchParam(params, name) {
    return Boolean((params.get(name) || '').trim());
  }

  function shouldInterceptLink(link, event) {
    if (!link || !canAjaxNavigate(link.href)) {
      return false;
    }

    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return false;
    }

    if (link.hasAttribute('download')) {
      return false;
    }

    if (link.target && link.target !== '_self') {
      return false;
    }

    return true;
  }

  function canAjaxNavigate(rawUrl) {
    var url = toUrl(rawUrl);
    return Boolean(url && url.origin === window.location.origin);
  }

  function updateHistory(url, mode) {
    if (!url || mode === 'none') {
      return;
    }

    var serialized = url.toString();
    var state = { etsoSearchPjax: true };
    if (mode === 'replace') {
      window.history.replaceState(state, '', serialized);
      return;
    }

    if (window.location.href === serialized) {
      window.history.replaceState(state, '', serialized);
      return;
    }

    window.history.pushState(state, '', serialized);
  }

  function setResultsBusy(shell, isBusy) {
    if (!shell || !shell.isConnected) {
      return;
    }

    var results = shell.querySelector('.etso-buscador__results');
    if (!results) {
      return;
    }

    results.classList.toggle('is-loading', isBusy);
    results.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  }

  function focusWithoutScroll(element) {
    if (!element || typeof element.focus !== 'function') {
      return;
    }

    try {
      element.focus({ preventScroll: true });
    }
    catch (e) {
      element.focus();
    }
  }

  function fallbackNavigate(rawUrl) {
    var url = toUrl(rawUrl);
    if (!url) {
      return;
    }

    window.location.assign(url.toString());
  }

  function toUrl(rawUrl) {
    try {
      return new window.URL(String(rawUrl || ''), window.location.href);
    }
    catch (e) {
      return null;
    }
  }

  function getShellState(shell) {
    if (!shellStates.has(shell)) {
      shellStates.set(shell, { controller: null });
    }

    return shellStates.get(shell);
  }

  /**
   * Inicializa un campo de autor con multiselección mediante chips.
   */
  function initAuthorMultiselect(input) {
    var hiddenName = input.getAttribute('data-hidden-name');
    if (!hiddenName) {
      return null;
    }

    var role = input.getAttribute('data-role') || '';
    var hidden = document.querySelector('input[name="' + hiddenName + '"]');
    if (!hidden) {
      return null;
    }

    var selectedMap = new Map();
    var listeners = [];
    var dropdown = null;
    var debounceTimer = null;
    var currentFocus = -1;

    var wrapper = document.createElement('div');
    wrapper.className = 'autocomplete-wrapper author-multiselect-wrapper';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    var chips = document.createElement('div');
    chips.className = 'author-chips';
    wrapper.insertBefore(chips, input);

    try {
      var preloaded = JSON.parse(input.getAttribute('data-selected-labels') || '[]');
      preloaded.forEach(function(item) {
        var id = parseInt(item.id, 10);
        if (id > 0 && item.label) {
          selectedMap.set(id, item.label);
        }
      });
    }
    catch (e) {
      // Ignore invalid preload JSON.
    }

    if (selectedMap.size === 0 && hidden.value) {
      hidden.value.split(',').forEach(function(raw) {
        var id = parseInt(raw, 10);
        if (id > 0) {
          selectedMap.set(id, String(id));
        }
      });
    }

    renderChips();
    syncHidden();

    input.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      var search = this.value.trim();
      if (search.length < 2) {
        closeDropdown();
        return;
      }

      debounceTimer = setTimeout(function() {
        fetchAutores(search);
      }, 250);
    });

    input.addEventListener('keydown', function(e) {
      var items = dropdown ? dropdown.querySelectorAll('.autocomplete-item') : [];

      if (e.key === 'Backspace' && input.value.trim() === '' && selectedMap.size > 0) {
        e.preventDefault();
        removeLastChip();
        return;
      }

      if (!dropdown || items.length === 0) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentFocus = (currentFocus + 1) % items.length;
        setActive(items);
      }
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentFocus = currentFocus <= 0 ? items.length - 1 : currentFocus - 1;
        setActive(items);
      }
      else if (e.key === 'Enter' && currentFocus > -1) {
        e.preventDefault();
        items[currentFocus].click();
      }
      else if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    document.addEventListener('click', function(e) {
      if (!wrapper.contains(e.target)) {
        closeDropdown();
      }
    });

    function fetchAutores(searchTerm) {
      fetch('/etso-search/autocomplete/autor?q=' + encodeURIComponent(searchTerm))
        .then(function(response) { return response.json(); })
        .then(function(data) { showDropdown(data || []); })
        .catch(function() { closeDropdown(); });
    }

    function showDropdown(results) {
      closeDropdown();
      if (!results.length) {
        return;
      }

      dropdown = document.createElement('div');
      dropdown.className = 'autocomplete-dropdown';

      results.forEach(function(item, index) {
        var id = parseInt(item.id, 10);
        if (!(id > 0) || selectedMap.has(id)) {
          return;
        }

        var div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.textContent = item.label;
        div.dataset.id = String(id);
        div.dataset.label = item.label;

        div.addEventListener('click', function() {
          addChip(id, item.label);
          input.value = '';
          closeDropdown();
          input.focus();
        });

        div.addEventListener('mouseenter', function() {
          currentFocus = index;
          setActive(dropdown.querySelectorAll('.autocomplete-item'));
        });

        dropdown.appendChild(div);
      });

      if (!dropdown.children.length) {
        dropdown = null;
        return;
      }

      wrapper.appendChild(dropdown);
      currentFocus = -1;
    }

    function addChip(id, label) {
      if (selectedMap.has(id)) {
        return;
      }
      selectedMap.set(id, label);
      syncHidden();
      renderChips();
      notifyChange();
    }

    function removeChip(id) {
      if (!selectedMap.has(id)) {
        return;
      }
      selectedMap.delete(id);
      syncHidden();
      renderChips();
      notifyChange();
    }

    function removeLastChip() {
      var ids = Array.from(selectedMap.keys());
      if (!ids.length) {
        return;
      }
      removeChip(ids[ids.length - 1]);
    }

    function renderChips() {
      chips.innerHTML = '';
      selectedMap.forEach(function(label, id) {
        var chip = document.createElement('span');
        chip.className = 'author-chip';

        var chipLabel = document.createElement('span');
        chipLabel.className = 'author-chip-label';
        chipLabel.textContent = label;
        chip.appendChild(chipLabel);

        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'author-chip-remove';
        removeBtn.setAttribute('aria-label', Drupal.t('Quitar autor'));
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', function(e) {
          e.preventDefault();
          removeChip(id);
        });
        chip.appendChild(removeBtn);

        chips.appendChild(chip);
      });
    }

    function syncHidden() {
      hidden.value = Array.from(selectedMap.keys()).join(',');
    }

    function setActive(items) {
      items.forEach(function(item, i) {
        item.classList.toggle('active', i === currentFocus);
      });
    }

    function closeDropdown() {
      if (dropdown) {
        dropdown.remove();
        dropdown = null;
      }
      currentFocus = -1;
    }

    function notifyChange() {
      listeners.forEach(function(cb) { cb(); });
    }

    function setDisabled(disabled) {
      input.disabled = disabled;
      wrapper.classList.toggle('is-disabled', disabled);
      if (disabled) {
        closeDropdown();
      }
    }

    return {
      role: role,
      getIds: function() {
        return Array.from(selectedMap.keys());
      },
      setDisabled: setDisabled,
      onChange: function(cb) {
        if (typeof cb === 'function') {
          listeners.push(cb);
        }
      }
    };
  }

  /**
   * Inicializa un multiselección estático con chips (sin endpoint remoto).
   */
  function initStaticMultiselect(input) {
    var hiddenName = input.getAttribute('data-hidden-name');
    if (!hiddenName) {
      return null;
    }

    var hidden = document.querySelector('input[name="' + hiddenName + '"]');
    if (!hidden) {
      return null;
    }

    var options = [];
    try {
      options = JSON.parse(input.getAttribute('data-static-options') || '[]');
    }
    catch (e) {
      options = [];
    }
    if (!Array.isArray(options) || options.length === 0) {
      return null;
    }

    var selectedMap = new Map();
    var dropdown = null;
    var currentFocus = -1;

    var wrapper = document.createElement('div');
    wrapper.className = 'autocomplete-wrapper author-multiselect-wrapper';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    var chips = document.createElement('div');
    chips.className = 'author-chips';
    wrapper.insertBefore(chips, input);

    try {
      var preloaded = JSON.parse(input.getAttribute('data-selected-labels') || '[]');
      preloaded.forEach(function(item) {
        if (item && item.id && item.label) {
          selectedMap.set(String(item.id), item.label);
        }
      });
    }
    catch (e) {
      // ignore invalid preload
    }

    if (selectedMap.size === 0 && hidden.value) {
      hidden.value.split(',').forEach(function(raw) {
        var id = String(raw || '').trim();
        if (!id) {
          return;
        }
        var opt = options.find(function(o) { return String(o.id) === id; });
        if (opt) {
          selectedMap.set(String(opt.id), String(opt.label));
        }
      });
    }

    renderChips();
    syncHidden();

    input.addEventListener('focus', function() {
      showDropdown(this.value.trim());
    });

    input.addEventListener('click', function(e) {
      e.preventDefault();
      showDropdown(this.value.trim());
    });

    input.addEventListener('input', function() {
      showDropdown(this.value.trim());
    });

    input.addEventListener('keydown', function(e) {
      var items = dropdown ? dropdown.querySelectorAll('.autocomplete-item') : [];

      if (e.key === 'Backspace' && input.value.trim() === '' && selectedMap.size > 0) {
        e.preventDefault();
        removeLastChip();
        return;
      }

      if (!dropdown || items.length === 0) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showDropdown(input.value.trim());
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentFocus = (currentFocus + 1) % items.length;
        setActive(items);
      }
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentFocus = currentFocus <= 0 ? items.length - 1 : currentFocus - 1;
        setActive(items);
      }
      else if ((e.key === 'Enter' || e.key === ' ') && currentFocus > -1) {
        e.preventDefault();
        items[currentFocus].click();
      }
      else if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    document.addEventListener('click', function(e) {
      if (!wrapper.contains(e.target)) {
        closeDropdown();
      }
    });

    function showDropdown(searchTerm) {
      closeDropdown();
      dropdown = document.createElement('div');
      dropdown.className = 'autocomplete-dropdown';

      var term = String(searchTerm || '').toLowerCase();
      var filtered = options.filter(function(item) {
        if (!term) {
          return true;
        }
        return String(item.label || '').toLowerCase().indexOf(term) !== -1;
      });

      // Con búsqueda vacía, limitar el desplegable para evitar listas enormes.
      if (!term && filtered.length > 80) {
        filtered = filtered.slice(0, 80);
      }

      filtered.forEach(function(item, index) {
        var id = String(item.id);
        if (selectedMap.has(id)) {
          return;
        }
        var div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.textContent = item.label;
        div.dataset.id = id;

        div.addEventListener('click', function() {
          selectedMap.set(id, item.label);
          syncHidden();
          renderChips();
          closeDropdown();
          input.focus();
        });
        div.addEventListener('mouseenter', function() {
          currentFocus = index;
          setActive(dropdown.querySelectorAll('.autocomplete-item'));
        });
        dropdown.appendChild(div);
      });

      if (!dropdown.children.length) {
        dropdown = null;
        return;
      }

      wrapper.appendChild(dropdown);
      currentFocus = -1;
    }

    function removeLastChip() {
      var ids = Array.from(selectedMap.keys());
      if (!ids.length) {
        return;
      }
      selectedMap.delete(ids[ids.length - 1]);
      syncHidden();
      renderChips();
    }

    function renderChips() {
      chips.innerHTML = '';
      selectedMap.forEach(function(label, id) {
        var chip = document.createElement('span');
        chip.className = 'author-chip';

        var chipLabel = document.createElement('span');
        chipLabel.className = 'author-chip-label';
        chipLabel.textContent = label;
        chip.appendChild(chipLabel);

        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'author-chip-remove';
        removeBtn.setAttribute('aria-label', Drupal.t('Quitar opción'));
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', function(e) {
          e.preventDefault();
          selectedMap.delete(id);
          syncHidden();
          renderChips();
        });
        chip.appendChild(removeBtn);

        chips.appendChild(chip);
      });
    }

    function syncHidden() {
      hidden.value = Array.from(selectedMap.keys()).join(',');
    }

    function setActive(items) {
      items.forEach(function(item, i) {
        item.classList.toggle('active', i === currentFocus);
      });
    }

    function closeDropdown() {
      if (dropdown) {
        dropdown.remove();
        dropdown = null;
      }
      currentFocus = -1;
    }

    return {
      getIds: function() { return Array.from(selectedMap.keys()); }
    };
  }

  /**
   * Turns a radio group (or/and) into a pill switch control.
   */
  function initMatchToggle(fieldset) {
    var radios = fieldset.querySelectorAll('input[type="radio"]');
    if (!radios.length) {
      return;
    }

    var switchWrap = document.createElement('div');
    switchWrap.className = 'match-toggle';

    var options = [
      { value: 'or', label: 'OR' },
      { value: 'and', label: 'AND' }
    ];

    options.forEach(function(opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'match-toggle-btn';
      btn.dataset.value = opt.value;
      btn.textContent = opt.label;
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        radios.forEach(function(radio) {
          radio.checked = radio.value === opt.value;
        });
        updateActive();
      });
      switchWrap.appendChild(btn);
    });

    fieldset.classList.add('match-toggle-hidden');
    fieldset.appendChild(switchWrap);

    function updateActive() {
      var active = 'or';
      radios.forEach(function(radio) {
        if (radio.checked) {
          active = radio.value;
        }
      });
      switchWrap.querySelectorAll('.match-toggle-btn').forEach(function(btn) {
        btn.classList.toggle('is-active', btn.dataset.value === active);
      });
    }

    radios.forEach(function(radio) {
      radio.addEventListener('change', updateActive);
    });
    updateActive();
  }

})(jQuery, Drupal, once);
