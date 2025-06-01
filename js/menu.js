const menuOpen = document.getElementById('menu-open');
const menuPopup = document.getElementById('menu-popup');
const menuClose = document.getElementById('menu-close');

menuOpen.addEventListener('click', () => {
  menuPopup.classList.remove('hidden');
});

menuClose.addEventListener('click', () => {
  menuPopup.classList.add('hidden');
});
