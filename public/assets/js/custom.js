(function ($) {
  'use strict';

  // Window Resize Mobile Menu Fix
  mobileNav();

  // Scroll animation init
  window.sr = new scrollReveal();

  // Menu Dropdown Toggle
  if ($('.menu-trigger').length) {
    $('.menu-trigger').on('click', function () {
      $(this).toggleClass('active');
      $('.header-area .nav').slideToggle(200);
    });
  }

  // Menu elevator animation
  $('a[href*=\\#]:not([href=\\#])').on('click', function () {
    if (
      location.pathname.replace(/^\//, '') ==
        this.pathname.replace(/^\//, '') &&
      location.hostname == this.hostname
    ) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
      if (target.length) {
        var width = $(window).width();
        if (width < 991) {
          $('.menu-trigger').removeClass('active');
          $('.header-area .nav').slideUp(200);
        }
        $('html,body').animate(
          {
            scrollTop: target.offset().top - 130,
          },
          700
        );
        return false;
      }
    }
  });
  $(document).ready(function () {
    $(document).on('scroll', onScroll);

    //smoothscroll
    $('a[href^="#"]').on('click', function (e) {
      e.preventDefault();
      $(document).off('scroll');

      $('a').each(function () {
        $(this).removeClass('active');
      });
      $(this).addClass('active');

      var target = this.hash,
        menu = target;
      var target = $(this.hash);
      console.log(target);
      $('html, body')
        .stop()
        .animate(
          {
            scrollTop: target.offset().top - 130,
          },
          500,
          'swing',
          function () {
            $(document).on('scroll', onScroll);
            // window.location.hash = target;
          }
        );
    });

    var mouseX, mouseY;
    var traX, traY;
    $(document).mousemove(function (e) {
      mouseX = e.pageX;
      mouseY = e.pageY;
      traX = (4 * mouseX) / 70;
      traY = (4 * mouseY) / 70 + 15;
      $('.background-text').css({
        'background-position': traX + '%' + traY + '%',
      });
    });
  });

  $(window).on('scroll', function () {
    if ($(window).scrollTop() > 50) {
      $('.header-area').addClass('active');
    } else {
      //remove the background property so it comes transparent again (defined in your css)
      $('.header-area').removeClass('active');
    }
  });

  function onScroll(event) {
    var scrollPos = $(document).scrollTop();
    $('.nav a.scrollnav').each(function () {
      var currLink = $(this);
      var refElement = $(currLink.attr('href'));
      if (
        refElement.position().top <= scrollPos &&
        refElement.position().top + refElement.height() > scrollPos
      ) {
        $('.nav ul li a').removeClass('active');
        currLink.addClass('active');
      } else {
        currLink.removeClass('active');
      }
    });
  }

  // Home seperator
  if ($('.home-seperator').length) {
    $('.home-seperator .left-item, .home-seperator .right-item').imgfix();
  }

  // Home number counterup
  if ($('.count-item').length) {
    $('.count-item strong').counterUp({
      delay: 10,
      time: 1000,
    });
  }

  // Page loading animation
  $(window).on('load', function () {
    if (document.getElementById('circle-main'))
      document.getElementById('circle-main').style.height =
        document.getElementById('circle-main').offsetWidth + 'px';
    if ($('.cover').length) {
      $('.cover').parallax({
        imageSrc: $('.cover').data('image'),
        zIndex: '1',
      });
    }

    $('#preloader').animate(
      {
        opacity: '0',
      },
      600,
      function () {
        setTimeout(function () {
          $('#preloader').css('visibility', 'hidden').fadeOut();
        }, 300);
      }
    );
  });

  // Window Resize Mobile Menu Fix
  $(window).on('resize', function () {
    mobileNav();
    if (document.getElementById('circle-main'))
      document.getElementById('circle-main').style.height =
        document.getElementById('circle-main').offsetWidth + 'px';
  });

  // Window Resize Mobile Menu Fix
  function mobileNav() {
    var width = $(window).width();
    $('.submenu').on('click', function () {
      if (width < 992) {
        $('.submenu ul').removeClass('active');
        $(this).find('ul').toggleClass('active');
      }
    });
  }
})(window.jQuery);

let sliderIndex = 1;
let timeout;
const layers = [...document.querySelectorAll('.layer')];
const covers = [...document.querySelectorAll('.photo-frame')];

function changeCoverAnimState(state = 0) {
  const st = state === 1 ? 'running' : 'paused';
  covers.forEach((cover) => {
    // cover.style['animation-play-state'] = st;
    cover.querySelector('.service_cover').style.width = `${state * 100}%`;
  });
}
setInterval(() => {
  switchLayer(1);
}, 4000);

function switchLayer(step = 1) {
  const nextSlide =
    (sliderIndex + step) % 3 === 0 ? 3 : (sliderIndex + step) % 3;

  changeCoverAnimState(1);
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    changeCoverAnimState(0);
  }, 500);

  for (let i of layers) {
    i.classList.remove('layer-displayed');
    i.classList.remove('layer-displayed-exit');
    if (i.dataset.scene == nextSlide) {
      i.classList.add('layer-displayed');
    }
    if (i.dataset.scene == sliderIndex) {
      i.classList.add('layer-displayed-exit');
    }
  }
  sliderIndex = nextSlide;
}

const root = document.documentElement;
const marqueeElementsDisplayed = getComputedStyle(root).getPropertyValue(
  '--marquee-elements-displayed'
);
const marqueeContent = document.querySelector('ul.marquee-content');

root.style.setProperty('--marquee-elements', marqueeContent.children.length);

for (let i = 0; i < marqueeElementsDisplayed; i++) {
  marqueeContent.appendChild(marqueeContent.children[i].cloneNode(true));
}
$('.carousel').carousel({
  interval: 3000,
});
