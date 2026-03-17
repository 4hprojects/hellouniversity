        // Logout Functionality
        document.getElementById('logoutLink').addEventListener('click', function (event) {
            event.preventDefault();

            fetch('/logout', {
                method: 'POST',
                credentials: 'include',
            })
                .then(response => {
                    if (response.ok) {
                        window.location.href = 'index';
                    } else {
                        console.error('Logout failed');
                    }
                })
                .catch(error => {
                    console.error('Error during logout:', error);
                });
        });