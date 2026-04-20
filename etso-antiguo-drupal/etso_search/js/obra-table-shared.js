/**
 * @file
 * Shared interactions for obra tables (search + informe).
 */

(function (Drupal, once) {
  'use strict';

  function normalizeSearch(value) {
    return (value || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function setRowExpanded(row, expanded) {
    if (!row) {
      return;
    }

    var detailRow = row.nextElementSibling;
    var hasDetailRow = detailRow && detailRow.classList.contains('detail-row');
    var expandIcon = row.querySelector('.expand-icon');
    var toggle = row.querySelector('.toggle-detail');

    row.classList.toggle('expanded', expanded);

    if (hasDetailRow) {
      detailRow.classList.toggle('show', expanded);
      detailRow.hidden = !expanded;
    }

    if (expandIcon) {
      expandIcon.classList.toggle('fa-chevron-right', !expanded);
      expandIcon.classList.toggle('fa-chevron-down', expanded);
    }

    if (toggle) {
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }
  }

  Drupal.behaviors.etsoObraTableShared = {
    attach: function (context) {
      once('etso-obra-row-shared', '.obra-table-shared-container .obra-row', context).forEach(function (row) {
        row.addEventListener('click', function (e) {
          if (e.target.tagName === 'A' || e.target.closest('a') || e.target.closest('button') || e.target.closest('.textos-dropdown-wrapper')) {
            return;
          }

          setRowExpanded(this, !this.classList.contains('expanded'));
        });
      });

      once('etso-toggle-detail-shared', '.obra-table-shared-container .toggle-detail', context).forEach(function (ctrl) {
        ctrl.addEventListener('click', function (e) {
          if (e && e.preventDefault) e.preventDefault();
          if (e && e.stopPropagation) e.stopPropagation();

          var row = this.closest('tr.obra-row');
          if (!row) {
            return;
          }

          setRowExpanded(row, !row.classList.contains('expanded'));
        });

        ctrl.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            this.click();
          }
        });
      });

      once('etso-textos-toggle-shared', '.obra-table-shared-container .textos-toggle', context).forEach(function (button) {
        var wrapper = button.closest('.textos-dropdown-wrapper');
        if (!wrapper) {
          return;
        }

        var dropdown = wrapper.querySelector('.textos-dropdown');
        if (!dropdown) {
          return;
        }

        var arrow = button.querySelector('.btn-arrow');
        document.body.appendChild(dropdown);
        dropdown.classList.add('textos-dropdown-portal');

        function closeDropdown() {
          dropdown.setAttribute('hidden', '');
          button.setAttribute('aria-expanded', 'false');
          if (arrow) {
            arrow.classList.remove('fa-chevron-down');
            arrow.classList.add('fa-chevron-right');
          }
        }

        function openDropdown() {
          document.querySelectorAll('.textos-dropdown-portal:not([hidden])').forEach(function (other) {
            other.setAttribute('hidden', '');
          });

          document.querySelectorAll('.obra-table-shared-container .textos-toggle[aria-expanded="true"]').forEach(function (otherBtn) {
            otherBtn.setAttribute('aria-expanded', 'false');
            var otherArrow = otherBtn.querySelector('.btn-arrow');
            if (otherArrow) {
              otherArrow.classList.remove('fa-chevron-down');
              otherArrow.classList.add('fa-chevron-right');
            }
          });

          var rect = button.getBoundingClientRect();
          var width = Math.max(rect.width, 220);
          var left = Math.max(10, Math.min(rect.left, window.innerWidth - width - 10));
          var top = rect.bottom + 4;

          dropdown.style.left = left + 'px';
          dropdown.style.top = top + 'px';
          dropdown.style.width = width + 'px';

          dropdown.removeAttribute('hidden');
          button.setAttribute('aria-expanded', 'true');
          if (arrow) {
            arrow.classList.remove('fa-chevron-right');
            arrow.classList.add('fa-chevron-down');
          }
        }

        button.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (dropdown.hasAttribute('hidden')) {
            openDropdown();
          } else {
            closeDropdown();
          }
        });

        button.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            button.click();
          } else if (e.key === 'Escape') {
            closeDropdown();
            button.focus();
          }
        });

        document.addEventListener('click', function (e) {
          if (!wrapper.contains(e.target) && !dropdown.contains(e.target)) {
            closeDropdown();
          }
        });

        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && !dropdown.hasAttribute('hidden')) {
            closeDropdown();
          }
        });
      });

      once('etso-autor-table-filters', '.autor-view-wrapper', context).forEach(function (wrapper) {
        var tableContainer = wrapper.querySelector('.obra-table-shared-container');
        var searchInput = wrapper.querySelector('.autor-search-input');
        var generoSelect = wrapper.querySelector('.autor-genero-select');
        var filterButtons = wrapper.querySelectorAll('.autor-stat-card[data-filter]');
        var emptyState = wrapper.querySelector('.autor-table-empty-state');

        if (!tableContainer || !filterButtons.length) {
          return;
        }

        var activeFilter = 'related_any';
        var searchTerm = '';
        var activeGenero = '';
        var rows = Array.prototype.slice.call(tableContainer.querySelectorAll('tr.obra-row'));

        function collapseRow(row) {
          setRowExpanded(row, false);
        }

        function applyFilters() {
          var visibleCount = 0;

          rows.forEach(function (row) {
            var titleSearch = normalizeSearch(row.getAttribute('data-title-search'));
            var rowGenero = normalizeSearch(row.getAttribute('data-genero'));
            var filterAttr = 'data-filter-' + activeFilter.replace(/_/g, '-');
            var matchesFilter = row.getAttribute(filterAttr) === '1';
            var matchesGenero = !activeGenero || rowGenero === activeGenero;
            var matchesSearch = !searchTerm || titleSearch.indexOf(searchTerm) !== -1;
            var isVisible = matchesFilter && matchesGenero && matchesSearch;
            var detailRow = row.nextElementSibling;

            row.hidden = !isVisible;
            if (!isVisible) {
              collapseRow(row);
            }
            else {
              visibleCount += 1;
            }

            if (detailRow && detailRow.classList.contains('detail-row')) {
              setRowExpanded(row, row.classList.contains('expanded'));
              detailRow.hidden = !isVisible || !row.classList.contains('expanded');
            }
          });

          if (emptyState) {
            emptyState.hidden = visibleCount !== 0;
          }
        }

        filterButtons.forEach(function (button) {
          button.addEventListener('click', function () {
            activeFilter = button.getAttribute('data-filter') || 'all';
            filterButtons.forEach(function (item) {
              var isActive = item === button;
              item.classList.toggle('is-active', isActive);
              item.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
            applyFilters();
          });
        });

        if (searchInput) {
          searchInput.addEventListener('input', function () {
            searchTerm = normalizeSearch(searchInput.value);
            applyFilters();
          });
        }

        if (generoSelect) {
          generoSelect.addEventListener('change', function () {
            activeGenero = normalizeSearch(generoSelect.value);
            applyFilters();
          });
        }

        applyFilters();
      });
    }
  };
})(Drupal, once);
