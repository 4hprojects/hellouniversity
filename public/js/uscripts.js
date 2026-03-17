document.addEventListener("DOMContentLoaded", function () {
    const appNavRoot = document.querySelector(".app-nav");
    const appNavInner = document.querySelector(".app-nav-inner");
    const appNavToggle = document.getElementById("appNavToggle");
    const appNavMenu = document.getElementById("appNavMenu");
    const appBrand = document.querySelector(".app-brand");

    function pathRequiresAuth(pathname) {
        const value = String(pathname || "");
        return [
            /^\/dashboard(?:\/|$)/,
            /^\/attendance(?:\/|$)/,
            /^\/activities(?:\/|$)/,
            /^\/admin_dashboard(?:\/|$)/,
            /^\/teacher(?:\/|$)/,
            /^\/account(?:\/|$)/,
            /^\/classes(?:\/|$)/,
            /^\/class-quiz(?:\/|$)/,
            /^\/quizzes(?:\/|$)/
        ].some((pattern) => pattern.test(value));
    }

    async function redirectIfLoggedOutOnProtectedPage() {
        if (!pathRequiresAuth(window.location.pathname)) {
            return;
        }

        try {
            const response = await fetch("/session-check", {
                credentials: "include",
                cache: "no-store",
                headers: {
                    Accept: "application/json"
                }
            });

            if (!response.ok) {
                window.location.replace("/login");
            }
        } catch (_error) {
            window.location.replace("/login");
        }
    }

    function updateAdaptiveNavMode() {
        if (!appNavRoot || !appNavInner || !appNavMenu || !appBrand) return;

        if (window.innerWidth > 900) {
            appNavRoot.classList.remove("app-nav-mobile-inline");
            return;
        }

        appNavRoot.classList.add("app-nav-mobile-inline");
        const availableWidth = appNavInner.clientWidth - appBrand.getBoundingClientRect().width - 12;
        const fitsInline = appNavMenu.scrollWidth <= availableWidth;
        appNavRoot.classList.toggle("app-nav-mobile-inline", fitsInline);

        if (fitsInline) {
            closeAppNavMenu();
        }
    }

    function closeAppNavMenu() {
        if (!appNavToggle || !appNavMenu) return;
        appNavMenu.classList.remove("app-nav-menu-open");
        appNavToggle.setAttribute("aria-expanded", "false");
        const icon = appNavToggle.querySelector(".material-icons");
        if (icon) icon.textContent = "menu";
    }

    if (appNavToggle && appNavMenu) {
        appNavToggle.addEventListener("click", function () {
            const isOpen = appNavMenu.classList.toggle("app-nav-menu-open");
            appNavToggle.setAttribute("aria-expanded", String(isOpen));
            const icon = appNavToggle.querySelector(".material-icons");
            if (icon) icon.textContent = isOpen ? "close" : "menu";
        });

        appNavMenu.querySelectorAll("a, button").forEach((element) => {
            element.addEventListener("click", function () {
                if (window.innerWidth <= 900) {
                    closeAppNavMenu();
                }
            });
        });

        document.addEventListener("click", function (event) {
            if (window.innerWidth > 900) return;
            if (!appNavMenu.classList.contains("app-nav-menu-open")) return;
            if (appNavMenu.contains(event.target) || appNavToggle.contains(event.target)) return;
            closeAppNavMenu();
        });

        window.addEventListener("resize", function () {
            updateAdaptiveNavMode();
            if (window.innerWidth > 900) closeAppNavMenu();
        });

        updateAdaptiveNavMode();
        window.addEventListener("load", updateAdaptiveNavMode);
    }

    window.addEventListener("pageshow", function () {
        redirectIfLoggedOutOnProtectedPage();
    });

    document.querySelectorAll(".js-logout-form").forEach((form) => {
        if (form.dataset.logoutBound === "true") {
            return;
        }

        form.dataset.logoutBound = "true";

        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const button = form.querySelector(".app-logout-btn");
            const redirectTarget = form.getAttribute("data-logout-redirect") || "/login";

            if (button) {
                button.disabled = true;
                button.setAttribute("aria-busy", "true");
            }

            try {
                const response = await fetch(form.action || "/logout", {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Accept": "application/json"
                    }
                });

                if (response.ok || response.status === 400 || response.status === 401) {
                    window.location.href = redirectTarget;
                    return;
                }

                console.error("Logout failed with status:", response.status);
            } catch (error) {
                console.error("Error during logout:", error);
            }

            if (button) {
                button.disabled = false;
                button.removeAttribute("aria-busy");
            }
        });
    });

    // Scroll to Top Button functionality
    const scrollButtons = Array.from(new Set([
        ...document.querySelectorAll(".js-scroll-top-button"),
        ...document.querySelectorAll("#scrollToTopBtn")
    ]));

    if (scrollButtons.length) {
        const updateScrollButtons = function () {
            const shouldShow = document.documentElement.scrollTop > 120;

            scrollButtons.forEach((button) => {
                if (button.classList.contains("js-scroll-top-button")) {
                    button.classList.toggle("is-visible", shouldShow);
                    button.setAttribute("aria-hidden", shouldShow ? "false" : "true");
                    return;
                }

                button.style.display = shouldShow ? "flex" : "none";
            });
        };

        window.addEventListener("scroll", updateScrollButtons, { passive: true });
        updateScrollButtons();

        scrollButtons.forEach((button) => {
            button.addEventListener("click", function () {
                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            });
        });
    }

    // Load the shared footer fragment for legacy static pages.
    const footerContainer = document.getElementById("footerContainer");
    if (footerContainer) {
        fetch("/footer-fragment")
            .then(response => response.text())
            .then(data => {
                footerContainer.innerHTML = data;
            })
            .catch(error => console.error("Error loading footer:", error));
    }
});

// Toggle the search overlay
function toggleSearchOverlay() {
    const overlay = document.getElementById('searchOverlay');
    overlay.classList.toggle('hidden');
    // Focus on the input if overlay is shown
    if (!overlay.classList.contains('hidden')) {
        setTimeout(() => {
            const input = document.getElementById('overlaySearchInput');
            if (input) input.focus();
        }, 100);
    }
}

// Redirect to the shared search page with the query
function goToSearchPage() {
    const query = document.getElementById('overlaySearchInput').value.trim();
    if (query) {
        window.location.href = '/search?q=' + encodeURIComponent(query);
    } else {
        window.location.href = '/search';
    }
    return false; // Prevent normal form submission
}
