(function () {
    function byId(id) {
        return document.getElementById(id);
    }

    function setMessage(element, message) {
        if (!element) {
            return;
        }

        element.textContent = message || '';
        element.style.display = message ? 'block' : 'none';
    }

    function clearMessages() {
        setMessage(byId('formError'), '');
        setMessage(byId('formSuccess'), '');
    }

    function setLoading(isLoading) {
        const button = byId('loginBtn');
        const spinner = byId('loginSpinner');

        if (button) {
            button.disabled = isLoading;
        }

        if (spinner) {
            spinner.style.display = isLoading ? 'block' : 'none';
        }
    }

    function attachPasswordToggles() {
        document.querySelectorAll('[data-password-toggle]').forEach((button) => {
            button.addEventListener('click', () => {
                const inputId = button.getAttribute('data-password-toggle');
                const input = byId(inputId);
                const icon = button.querySelector('.material-icons');

                if (!input || !icon) {
                    return;
                }

                const isPassword = input.getAttribute('type') === 'password';
                input.setAttribute('type', isPassword ? 'text' : 'password');
                icon.textContent = isPassword ? 'visibility' : 'visibility_off';
                button.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
            });
        });
    }

    function attachIdentifierRules() {
        const input = byId('studentIDNumber');
        if (!input) {
            return;
        }

        input.addEventListener('input', () => {
            const value = String(input.value || '');
            if (/^\d+$/.test(value) && value.length > 8) {
                input.value = value.slice(0, 8);
            }
        });
    }

    function getReturnTo() {
        try {
            const params = new URLSearchParams(window.location.search || '');
            return params.get('returnTo') || '';
        } catch (_error) {
            return '';
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const identifier = String(byId('studentIDNumber')?.value || '').trim();
        const password = String(byId('password')?.value || '');
        const returnTo = getReturnTo();

        clearMessages();

        if (!identifier || !password) {
            setMessage(byId('formError'), 'Please enter your Student ID, Employee ID, or email, and password.');
            return;
        }

        if (/^\d+$/.test(identifier) && !/^\d{7,8}$/.test(identifier)) {
            setMessage(byId('formError'), 'Student ID or Employee ID must be 7 or 8 digits.');
            return;
        }

        setLoading(true);

        try {
            const result = await window.authClient.login(identifier, password, { returnTo });

            if (!result.success) {
                if (result.statusCode === 403) {
                    setMessage(byId('formError'), result.message || 'Login blocked. Please review your account status and try again.');
                } else if (result.statusCode === 401) {
                    setMessage(byId('formError'), 'Invalid Student ID, Employee ID, email, or password. Please try again.');
                } else {
                    setMessage(byId('formError'), result.message || 'Login failed. Please try again.');
                }
                return;
            }

            setMessage(byId('formSuccess'), 'Login successful. Redirecting...');
            window.setTimeout(() => {
                window.location.href = result.redirectPath || '/dashboard';
            }, 700);
        } catch (error) {
            setMessage(byId('formError'), 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    document.addEventListener('DOMContentLoaded', async () => {
        attachPasswordToggles();
        attachIdentifierRules();
        byId('loginForm')?.addEventListener('submit', handleSubmit);

        if (window.authClient && typeof window.authClient.redirectIfAuthenticated === 'function') {
            await window.authClient.redirectIfAuthenticated({ returnTo: getReturnTo() });
        }
    });
}());
