/**
 * @file
 * Reusable tooltip/popover behavior for ETSO theme components.
 */

(function (Drupal, once) {
  'use strict';

  function getTooltipElements(trigger) {
    var tooltip = trigger.closest('.etso-tooltip');
    var popoverId = trigger.getAttribute('aria-controls');
    var popover = popoverId ? document.getElementById(popoverId) : null;
    var anchor = trigger.closest('.etso-tooltip-anchor') || tooltip;

    if (!tooltip || !popover || !anchor) {
      return null;
    }

    return {
      tooltip: tooltip,
      anchor: anchor,
      popover: popover
    };
  }

  function resetPositionState(anchor, popover) {
    anchor.classList.remove('help-left', 'help-top', 'help-mobile', 'help-mobile-top', 'help-mobile-bottom');
    popover.style.top = '';
    popover.style.left = '';
    popover.style.right = '';
    popover.style.bottom = '';
    popover.style.width = '';
  }

  function positionPopover(anchor, popover) {
    resetPositionState(anchor, popover);

    var anchorRect = anchor.getBoundingClientRect();
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var gap = 12;
    var isMobile = viewportWidth <= 768;

    if (isMobile) {
      var mobileWidth = Math.min(360, Math.max(220, viewportWidth - (gap * 2)));
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

      anchor.classList.add('help-mobile');
      anchor.classList.add(showAbove ? 'help-mobile-top' : 'help-mobile-bottom');
      popover.style.width = mobileWidth + 'px';
      popover.style.top = top + 'px';
      return;
    }

    var popRect = popover.getBoundingClientRect();
    var overflowRight = (anchorRect.right + 8 + popRect.width) > (viewportWidth - gap);
    if (overflowRight) {
      anchor.classList.add('help-left');
    }

    var centeredTop = anchorRect.top + (anchorRect.height / 2) - (popRect.height / 2);
    var overflowTop = centeredTop < gap;
    var overflowBottom = (centeredTop + popRect.height) > (viewportHeight - gap);
    if (overflowTop || overflowBottom) {
      anchor.classList.add('help-top');
    }
  }

  function closeTooltip(trigger) {
    var elements = getTooltipElements(trigger);
    if (!elements) {
      return;
    }

    elements.tooltip.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    resetPositionState(elements.anchor, elements.popover);
  }

  function closeAllTooltips(exceptTrigger) {
    document.querySelectorAll('.etso-tooltip.is-open .etso-tooltip-trigger[aria-expanded="true"]').forEach(function (otherTrigger) {
      if (otherTrigger !== exceptTrigger) {
        closeTooltip(otherTrigger);
      }
    });
  }

  Drupal.behaviors.etsoTooltip = {
    attach: function (context) {
      once('etso-tooltip', '.etso-tooltip-trigger', context).forEach(function (trigger) {
        var elements = getTooltipElements(trigger);
        if (!elements) {
          return;
        }

        var tooltip = elements.tooltip;
        var anchor = elements.anchor;
        var popover = elements.popover;

        function openTooltip() {
          closeAllTooltips(trigger);
          positionPopover(anchor, popover);
          tooltip.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
        }

        function toggleTooltip(event) {
          if (event) {
            event.preventDefault();
            event.stopPropagation();
          }

          if (tooltip.classList.contains('is-open')) {
            closeTooltip(trigger);
          }
          else {
            openTooltip();
          }
        }

        trigger.addEventListener('click', toggleTooltip);

        trigger.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
            toggleTooltip(event);
          }
          else if (event.key === 'Escape') {
            closeTooltip(trigger);
            trigger.focus();
          }
        });

        anchor.addEventListener('mouseenter', function () {
          positionPopover(anchor, popover);
        });

        anchor.addEventListener('focusin', function () {
          positionPopover(anchor, popover);
        });

        window.addEventListener('resize', function () {
          if (tooltip.classList.contains('is-open')) {
            positionPopover(anchor, popover);
          }
        });

        window.addEventListener('scroll', function () {
          if ((window.innerWidth || document.documentElement.clientWidth) <= 768) {
            closeTooltip(trigger);
          }
        }, { passive: true, capture: true });

        document.addEventListener('click', function (event) {
          if (!popover.contains(event.target) && !trigger.contains(event.target)) {
            closeTooltip(trigger);
          }
        });

        document.addEventListener('keydown', function (event) {
          if (event.key === 'Escape') {
            closeTooltip(trigger);
          }
        });
      });
    }
  };
})(Drupal, once);
