document.addEventListener('DOMContentLoaded', () => {
    // Attempt to fetch the session-check endpoint
    fetch('/session-check', { credentials: 'include' })
      .then(response => {
        // If not logged in, we get a 401 status
        if (!response.ok) throw new Error('Not authenticated');
        return response.json();
      })
      .then(data => {
        if (data.authenticated) {
          const redirectPath = data.redirectPath || '/dashboard';
          // User is authenticated; change the Sign In link to Dashboard
          const signinLink = document.getElementById('signinLink');
          const mobileSigninLink = document.getElementById('mobileSigninLink');
          if (signinLink) {
            signinLink.href = redirectPath;
            signinLink.title = 'Dashboard';
  
            const iconSpan = signinLink.querySelector('.material-icons');
            if (iconSpan) {
              iconSpan.textContent = 'dashboard';
            }
          }
          if (mobileSigninLink) {
            mobileSigninLink.href = redirectPath;
            mobileSigninLink.title = 'Dashboard';
            mobileSigninLink.textContent = 'Dashboard';
          }
        }
      })
      .catch(error => {
        // Not logged in or some error; do nothing special
        console.log(error.message);
      });
  });
  
