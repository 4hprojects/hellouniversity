(function attachHomeJoinClass(global) {
    function init() {
        const form = document.getElementById('homeJoinClassForm');
        const input = document.getElementById('homeJoinClassCode');
        const status = document.getElementById('homeJoinClassStatus');
        const button = form ? form.querySelector('button[type="submit"]') : null;

        if (!form || !input || !status) {
            return;
        }

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            handleSubmit(form, input, status, button);
        });
    }

    function renderStatus(status, message, tone, link) {
        status.textContent = '';
        status.className = `hu-join-status hu-join-status-${tone}`;

        if (!message) {
            return;
        }

        if (link) {
            status.appendChild(document.createTextNode(`${message} `));
            const anchor = document.createElement('a');
            anchor.href = link.href;
            anchor.textContent = link.label;
            status.appendChild(anchor);
        } else {
            status.textContent = message;
        }
    }

    async function handleSubmit(form, input, status, button) {
        const classCode = input.value.trim().toUpperCase();
        if (!classCode) {
            renderStatus(status, 'Enter a class code to join.', 'error');
            input.focus();
            return;
        }

        const isAuthenticated = form.dataset.authenticated === 'true';
        const role = form.dataset.role || '';

        if (!isAuthenticated) {
            renderStatus(status, 'Sign in as a student to join a class.', 'info', {
                href: `/login?returnTo=${encodeURIComponent('/')}`,
                label: 'Log in'
            });
            return;
        }

        if (role !== 'student') {
            renderStatus(status, 'Only student accounts can join a class.', 'info');
            return;
        }

        if (button) {
            button.disabled = true;
            button.setAttribute('aria-busy', 'true');
        }
        renderStatus(status, 'Joining class...', 'info');

        try {
            const response = await fetch('/api/classes/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ classCode })
            });
            const data = await safeParseJson(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to join class.');
            }

            input.value = '';
            renderStatus(
                status,
                data.message || 'Class joined successfully.',
                data.alreadyJoined ? 'info' : 'success',
                { href: '/dashboard', label: 'Go to dashboard' }
            );
        } catch (error) {
            renderStatus(status, error.message || 'Unable to join class right now.', 'error');
        } finally {
            if (button) {
                button.disabled = false;
                button.setAttribute('aria-busy', 'false');
            }
        }
    }

    async function safeParseJson(response) {
        try {
            return await response.json();
        } catch (_error) {
            return {};
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})(window);
