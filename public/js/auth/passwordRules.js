(function () {
    function evaluate(password) {
        return {
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            length: password.length >= 8,
            special: /^[A-Za-z\d]*$/.test(password)
        };
    }

    function findStrengthMeter(passwordInputId, input) {
        return document.querySelector(`[data-password-strength-for="${passwordInputId}"]`)
            || input.closest('form')?.querySelector('.auth-password-strength')
            || document.querySelector('.auth-password-strength');
    }

    function getStrengthState(score) {
        const states = [
            { width: '20%', color: '#dc2626', text: '1 of 5 password rules met' },
            { width: '40%', color: '#ea580c', text: '2 of 5 password rules met' },
            { width: '60%', color: '#d97706', text: '3 of 5 password rules met' },
            { width: '80%', color: '#2563eb', text: '4 of 5 password rules met' },
            { width: '100%', color: '#16a34a', text: 'All password rules met' }
        ];

        return states[Math.max(0, Math.min(score, states.length) - 1)] || states[0];
    }

    function attach(passwordInputId) {
        const input = document.getElementById(passwordInputId);
        if (!input) {
            return;
        }

        const strengthMeter = findStrengthMeter(passwordInputId, input);
        const strengthFill = strengthMeter?.querySelector('.auth-strength-fill');
        const strengthText = strengthMeter?.querySelector('.auth-strength-text');

        const render = () => {
            if (!strengthMeter) {
                return;
            }

            const password = String(input.value || '');
            if (!password.trim()) {
                strengthMeter.hidden = true;
                return;
            }

            const result = evaluate(password);
            const score = [
                result.uppercase,
                result.lowercase,
                result.number,
                result.length,
                result.special
            ].filter(Boolean).length;
            const state = getStrengthState(score);

            strengthMeter.hidden = false;

            if (strengthFill) {
                strengthFill.style.width = state.width;
                strengthFill.style.backgroundColor = state.color;
            }

            if (strengthText) {
                strengthText.textContent = state.text;
                strengthText.style.color = state.color;
            }
        };

        input.addEventListener('input', render);
        input.addEventListener('focus', render);
        input.addEventListener('blur', render);
        render();
    }

    window.authPasswordRules = {
        attach,
        evaluate
    };
}());
