window.onload = function () {
  Particles.init({
    selector: ".background",
  });
};
const particles = Particles.init({
  selector: ".background",
  color: ["#3A77A9", "#CF6F8F", "#006D6F"],
  connectParticles: false,
  speed: 0.2,
  sizeVariations: 6,
  shape: { type: "triangle" },
  responsive: [
    {
      breakpoint: 768,
      options: {
        color: ["#3A77A9", "#CF6F8F", "#006D6F"],
        maxParticles: 43,
        connectParticles: false,
      },
    },
  ],
});
