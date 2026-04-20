/**
 * Funcionalidades JavaScript para la vista de Obra
 */
(function ($, Drupal) {
  'use strict';

  Drupal.behaviors.obraView = {
    attach: function (context, settings) {

      // === TABS DE RESÚMENES ===
      // Usar event delegation para evitar problemas con .once()
      $(context).find('.resumen-tab').each(function() {
        if (!$(this).hasClass('tab-initialized')) {
          $(this).addClass('tab-initialized');
          $(this).on('click', function(e) {
            e.preventDefault();
            
            var targetId = $(this).data('target');
            
            // Remover active de todos los tabs y panels
            $('.resumen-tab').removeClass('active');
            $('.resumen-panel').removeClass('active');
            
            // Añadir active al tab clickeado y su panel correspondiente
            $(this).addClass('active');
            $('#' + targetId).addClass('active');
          });
        }
      });

      // === COPIAR CITA ===
      $(context).find('.copy-citation-btn').each(function() {
        if (!$(this).hasClass('copy-initialized')) {
          $(this).addClass('copy-initialized').on('click', function(e) {
            e.preventDefault();
            
            const $button = $(this);
            const citationText = $('.citar-content').text().trim();
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(citationText).then(function() {
                const originalHtml = $button.html();
                $button.html('<i class="fas fa-check"></i> Copiado');
                $button.addClass('btn-success').removeClass('btn-outline-primary');
                
                setTimeout(function() {
                  $button.html(originalHtml);
                  $button.removeClass('btn-success').addClass('btn-outline-primary');
                }, 2000);
              });
            }
          });
        }
      });

      // === ANIMACIÓN DE ENTRADA ===
      $(context).find('.obra-card').each(function(index) {
        if (!$(this).hasClass('animated')) {
          $(this).addClass('animated');
          $(this).css({
            'opacity': '0',
            'transform': 'translateY(20px)'
          }).delay(index * 100).animate({
            'opacity': '1'
          }, 600, function() {
            $(this).css('transform', 'translateY(0)');
          });
        }
      });

    }
  };

})(jQuery, Drupal);
