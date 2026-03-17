(function () {
    function byId(id) {
        return document.getElementById(id);
    }

    const state = {
        email: ''
    };

    function showMessage(id, message) {
        const element = byId(id);
        if (!element) {
            return;
        }

        element.textContent = message || '';
        element.style.display = message ? 'block' : 'none';
    }

    function clearMessages() {
        showMessage('resetStatusMessage', '');
        showMessage('resetErrorMessage', '');
        showMessage('attemptsMessage', '');
    }

    function setStep(step) {
        document.querySelectorAll('[data-reset-step]').forEach((panel) => {
            panel.hidden = panel.getAttribute('data-reset-step') !== step;
        });

        document.querySelectorAll('[data-reset-step-pill]').forEach((pill) => {
            pill.classList.toggle('auth-step-pill-active', pill.getAttribute('data-reset-step-pill') === step);
        });
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
            });
        });
    }

    async function handleEmailSubmit(event) {
        event.preventDefault();
        clearMessages();

        const email = String(byId('email')?.value || '').trim();
        if (!email) {
            showMessage('resetErrorMessage', 'Enter your email address.');
            return;
        }

        try {
            const response = await fetch('/send-password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const result = await response.json();

            if (!response.ok && response.status !== 404) {
                showMessage('resetErrorMessage', result.message || 'Unable to process your request.');
                return;
            }

            state.email = email;
            setStep('code');
            showMessage('resetStatusMessage', 'If that email exists in our database, a reset code has been sent.');
        } catch (error) {
            showMessage('resetErrorMessage', 'Unable to send a reset code right now.');
        }
    }

    async function handleCodeSubmit(event) {
        event.preventDefault();
        clearMessages();

        const resetCode = String(byId('resetCode')?.value || '').trim();
        if (!state.email || !resetCode) {
            showMessage('resetErrorMessage', 'Enter the reset code from your email.');
            return;
        }

        try {
            const response = await fetch('/verify-reset-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: state.email, resetCode })
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                if (typeof result.attemptsLeft === 'number') {
                    showMessage('attemptsMessage', `Invalid reset code. Attempts left: ${result.attemptsLeft}.`);
                } else {
                    showMessage('resetErrorMessage', result.message || 'Unable to verify reset code.');
                }
                return;
            }

            setStep('password');
            showMessage('resetStatusMessage', 'Reset code verified. You can now create a new password.');
        } catch (error) {
            showMessage('resetErrorMessage', 'Unable to verify reset code.');
        }
    }

    async function handlePasswordSubmit(event) {
        event.preventDefault();
        clearMessages();

        const newPassword = String(byId('newPassword')?.value || '');
        const confirmPassword = String(byId('confirmPassword')?.value || '');

        if (!state.email) {
            showMessage('resetErrorMessage', 'Restart the reset process and request a new code.');
            setStep('email');
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage('resetErrorMessage', 'Passwords do not match.');
            return;
        }

        const rules = window.authPasswordRules?.evaluate(newPassword);
        if (!rules || !(rules.uppercase && rules.lowercase && rules.number && rules.length && rules.special)) {
            showMessage('resetErrorMessage', 'Password must meet all listed criteria.');
            return;
        }

        try {
            const response = await fetch('/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: state.email, newPassword })
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                showMessage('resetErrorMessage', result.message || 'Unable to reset password.');
                return;
            }

            showMessage('resetStatusMessage', 'Password reset successful. Redirecting to login...');
            window.setTimeout(() => {
                window.location.href = '/login';
            }, 1200);
        } catch (error) {
            showMessage('resetErrorMessage', 'Unable to reset password.');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        attachPasswordToggles();
        window.authPasswordRules?.attach('newPassword');
        byId('emailForm')?.addEventListener('submit', handleEmailSubmit);
        byId('verifyResetCodeForm')?.addEventListener('submit', handleCodeSubmit);
        byId('resetPasswordForm')?.addEventListener('submit', handlePasswordSubmit);
        setStep('email');
    });
}());
