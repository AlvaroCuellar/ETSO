/**
 * @file
 * Global utilities.
 *
 */
(function($, Drupal) {

  'use strict';

  Drupal.behaviors.bootstrap_barrio_subtheme = {
    attach: function(context, settings) {
      var position = $(window).scrollTop();
      $(window).scroll(function () {
        if ($(this).scrollTop() > 50) {
          $('body').addClass("scrolled");
        }
        else {
          $('body').removeClass("scrolled");
        }
        var scroll = $(window).scrollTop();
        if (scroll > position) {
          $('body').addClass("scrolldown");
          $('body').removeClass("scrollup");
        } else {
          $('body').addClass("scrollup");
          $('body').removeClass("scrolldown");
        }
        position = scroll;
      });

    }
  };

  Drupal.behaviors.etso = {
    attach: function(context, settings) {

      // Image Gallery
      $('.simplelightbox a').simpleLightbox({showCounter:true,navText:['<i class=\"fa fa-chevron-left\" aria-hidden=\"true\"></i>','<i class=\"fa fa-chevron-right\" aria-hidden=\"true\"></i>']});

    }
  };

})(jQuery, Drupal);