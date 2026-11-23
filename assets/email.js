// Email: assembled at click time so the address never appears verbatim in the markup.
(function () {
  var copy = document.getElementById('copyEmail');
  if (!copy) return;
  copy.addEventListener('click', function () {
    var addr = ['recruiting', 'refractivelabs.com'].join('@');
    var done = function () { copy.textContent = 'copied'; setTimeout(function () { copy.textContent = 'copy'; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(addr).then(done, done); else done();
  });
})();
