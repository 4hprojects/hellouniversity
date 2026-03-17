// validation.js

// Function to validate password strength
function isValidPassword(password) {
    // Requires at least one uppercase letter, one lowercase letter, one number, and at least 8 characters
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
    return passwordRegex.test(password);
}
