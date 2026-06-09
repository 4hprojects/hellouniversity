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

    function attachFloatingLabels() {
        const fields = document.querySelectorAll('.auth-page-login .auth-field-floating');

        fields.forEach((field) => {
            const input = field.querySelector('input');
            if (!(input instanceof HTMLElement)) {
                return;
            }

            const sync = () => {
                const value = 'value' in input ? String(input.value || '').trim() : '';
                field.classList.toggle('is-filled', value !== '');
            };

            input.addEventListener('focus', () => {
                field.classList.add('is-focused');
            });

            input.addEventListener('blur', () => {
                field.classList.remove('is-focused');
                sync();
            });

            input.addEventListener('input', sync);

            sync();
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

        const email = String(byId('email')?.value || '').trim();
        const password = String(byId('password')?.value || '');
        const returnTo = getReturnTo();

        clearMessages();

        if (!email || !password) {
            setMessage(byId('formError'), 'Please enter your email address and password.');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setMessage(byId('formError'), 'Please enter a valid email address.');
            return;
        }

        setLoading(true);

        try {
            const result = await window.authClient.login(email, password, { returnTo });

            if (!result.success) {
                if (result.statusCode === 403) {
                    setMessage(byId('formError'), result.message || 'Login blocked. Please review your account status and try again.');
                } else if (result.statusCode === 401) {
                    setMessage(byId('formError'), 'Invalid email or password. Please try again.');
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
        attachFloatingLabels();
        byId('loginForm')?.addEventListener('submit', handleSubmit);

        if (window.authClient && typeof window.authClient.redirectIfAuthenticated === 'function') {
            await window.authClient.redirectIfAuthenticated({ returnTo: getReturnTo() });
        }
    });
}());
