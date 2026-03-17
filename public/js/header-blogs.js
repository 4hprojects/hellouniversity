// Load header HTML and attach menu logic
document.addEventListener('DOMContentLoaded', function () {
    fetch('/header-blogs.html')
        .then(res => res.text())
        .then(html => {
            document.getElementById('header-blog').innerHTML = html;

            // Hamburger menu logic
            const menuToggle = document.getElementById('menuToggle');
            const mobileMenu = document.getElementById('mobileMenu');
            const menuOverlay = document.getElementById('menuOverlay');

            menuToggle.addEventListener('click', () => {
                mobileMenu.classList.toggle('active');
                menuOverlay.classList.toggle('active');
                document.body.classList.toggle('no-scroll');
            });

            menuOverlay.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                menuOverlay.classList.remove('active');
                document.body.classList.remove('no-scroll');
            });
        });
});