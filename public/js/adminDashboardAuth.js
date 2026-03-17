(function attachAdminDashboardAuth(global) {
    function init() {
        initializeSession();
        initializeLogout();
    }

    async function initializeSession() {
        try {
            const sessionResponse = await fetch('/session-check', { credentials: 'include' });
            const sessionData = await sessionResponse.json();

            if (!sessionData.authenticated || sessionData.role !== 'admin') {
                window.location.href = '/login';
                return;
            }

            const userDetailsResponse = await fetch('/user-details', { credentials: 'include' });
            const userDetails = await userDetailsResponse.json();

            if (userDetails.success) {
                document.getElementById('userName').textContent =
                    `${userDetails.user.firstName} ${userDetails.user.lastName}`;
                document.getElementById('userID').textContent =
                    `Admin ID: ${userDetails.user.studentIDNumber}`;
            }
        } catch (error) {
            console.error('Admin session initialization failed:', error);
            window.location.href = '/login';
        }
    }

    function initializeLogout() {
        const logoutLink = document.getElementById('logoutLink');
        if (!logoutLink) return;

        logoutLink.addEventListener('click', async (event) => {
            event.preventDefault();
            try {
                const response = await fetch('/logout', {
                    method: 'POST',
                    credentials: 'include'
                });

                if (response.ok) {
                    window.location.href = '/login';
                }
            } catch (error) {
                console.error('Admin logout failed:', error);
            }
        });
    }

    global.adminDashboardAuth = {
        init
    };
})(window);
