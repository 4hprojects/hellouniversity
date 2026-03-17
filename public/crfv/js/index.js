// index.js
console.log("[CRFV] index.js loaded");

const sidePanel = document.getElementById("sidePanel");
const menuSignInOut = document.getElementById("menuSignInOut");
const headerNav = document.getElementById("headerNav");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const menuBackdrop = document.getElementById("menuBackdrop");
const protectedMenuLinks = Array.from(
  document.querySelectorAll('.menu-grid a[data-role]')
);

window.addEventListener("DOMContentLoaded", async () => {
  await ensureAuthClient();
  wireMenuToggle();
  wireMenuAuthAction();
  await checkAuth();
});

async function ensureAuthClient() {
  if (window.authClient) return;

  await new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "/js/authClient.js";
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

async function checkAuth() {
  const isAuth = await authClient.isAuthenticated();
  console.log(`[CRFV] Auth state: ${isAuth ? "authenticated" : "anonymous"}`);

  if (!isAuth) {
    renderLoginPanel();
    setAuditTrailVisibility(null);
    updateMenuAuthLabel(false);
    setProtectedMenuDisabled(true);
    return;
  }

  const user = await authClient.getCurrentUser();
  setAuditTrailVisibility(user);
  renderAuthenticatedPanel(user);
  updateMenuAuthLabel(true);
  setProtectedMenuDisabled(false);
  loadCRFVContent();
}

function setAuditTrailVisibility(user) {
  const auditLink = document.querySelector('.menu-grid a[href="/crfv/audittrail"]');
  if (!auditLink) return;

  const role = String(user?.role || '').toLowerCase();
  const allowed = role === 'admin' || role === 'manager';

  auditLink.style.display = allowed ? '' : 'none';
}

function renderLoginPanel() {
  if (!sidePanel) return;

  sidePanel.innerHTML = `
    <div class="login-card" aria-live="polite">
      <div class="login-card-header">
        <i class="material-icons" aria-hidden="true">lock</i>
        <span>Sign In</span>
      </div>
      <p style="text-align:center;color:#6B7280;margin-bottom:1rem;">
        Sign in to access CRFV operations.
      </p>
      <form id="crfvLoginForm" class="login-card-body">
        <div class="form-group">
          <input
            id="crfvStudentID"
            class="form-control"
            type="text"
            placeholder="ID Number"
            autocomplete="username"
            required
          />
        </div>
        <div class="form-group" style="position:relative;">
          <input
            id="crfvPassword"
            class="form-control"
            type="password"
            placeholder="Password"
            autocomplete="current-password"
            required
            style="padding-right:2.5rem;"
          />
          <button
            type="button"
            id="crfvTogglePassword"
            aria-label="Show or hide password"
            style="position:absolute;right:10px;top:50%;transform:translateY(-50%);width:32px;height:32px;display:flex;align-items:center;justify-content:center;padding:0;background:none;border:none;cursor:pointer;"
          ><i class="material-icons" aria-hidden="true" style="display:block;line-height:1;font-size:20px;">visibility</i></button>
        </div>
        <div id="crfvError" class="error-message" style="display:none;" aria-live="polite"></div>
        <div id="crfvSuccess" style="display:none;color:#166534;text-align:center;min-height:1.2rem;" aria-live="polite"></div>
        <button type="submit" id="crfvLoginBtn" class="btn btn-primary">Login</button>
        <a href="/reset-password" class="forgot-link" style="text-align:center;margin-top:0.6rem;">Forgot password?</a>
      </form>
    </div>
  `;

  const form = document.getElementById("crfvLoginForm");
  const toggle = document.getElementById("crfvTogglePassword");
  const pwdInput = document.getElementById("crfvPassword");

  if (form) form.addEventListener("submit", handleCRFVLogin);
  if (toggle && pwdInput) {
    toggle.addEventListener("click", () => {
      const isPassword = pwdInput.type === "password";
      pwdInput.type = isPassword ? "text" : "password";
      const icon = toggle.querySelector(".material-icons");
      if (icon) icon.textContent = isPassword ? "visibility_off" : "visibility";
    });
  }
}

function renderAuthenticatedPanel(user) {
  if (!sidePanel) return;

  const fullName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
    : "";
  const role = user?.role ? String(user.role).toUpperCase() : "USER";
  const id = user?.studentIDNumber || "";

  sidePanel.innerHTML = `
    <div class="login-card">
      <div class="login-card-header">
        <i class="material-icons" aria-hidden="true">verified_user</i>
        <span>Signed In</span>
      </div>
      <div class="login-card-body">
        <div style="text-align:center;color:#1F2937;">
          <div style="font-weight:600;">${escapeHtml(fullName || "CRFV User")}</div>
          <div style="font-size:0.92rem;color:#6B7280;">${escapeHtml(role)}</div>
          <div style="font-size:0.9rem;color:#6B7280;">${escapeHtml(id)}</div>
        </div>
        <a class="btn btn-primary" href="/crfv/account-settings" style="text-align:center;text-decoration:none;">
          Account Settings
        </a>
        <button id="panelLogoutBtn" type="button" class="btn btn-danger">Logout</button>
      </div>
    </div>
  `;

  const panelLogoutBtn = document.getElementById("panelLogoutBtn");
  if (panelLogoutBtn) {
    panelLogoutBtn.addEventListener("click", handleCRFVLogout);
  }
}

function setPanelMessage(targetEl, message, mode) {
  if (!targetEl) return;
  if (!message) {
    targetEl.textContent = "";
    targetEl.style.display = "none";
    return;
  }

  targetEl.textContent = message;
  targetEl.style.display = mode === "error" ? "flex" : "block";
}

async function handleCRFVLogin(e) {
  e.preventDefault();

  const studentID = (document.getElementById("crfvStudentID")?.value || "").trim();
  const password = document.getElementById("crfvPassword")?.value || "";
  const errorEl = document.getElementById("crfvError");
  const successEl = document.getElementById("crfvSuccess");
  const loginBtn = document.getElementById("crfvLoginBtn");

  setPanelMessage(errorEl, "", "error");
  setPanelMessage(successEl, "", "success");

  if (!studentID || !password) {
    setPanelMessage(errorEl, "Please enter both Student ID and password.", "error");
    return;
  }

  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";
  }

  try {
    const result = await authClient.login(studentID, password);
    if (result.success) {
      setPanelMessage(successEl, "Login successful. Loading your panel...", "success");
      await checkAuth();
      return;
    }

    setPanelMessage(errorEl, result.message || "Login failed. Please try again.", "error");
  } catch (_err) {
    setPanelMessage(errorEl, "Network error. Please try again.", "error");
  } finally {
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = "Login";
    }
  }
}

async function handleCRFVLogout() {
  const confirmed = window.confirm("Are you sure you want to logout?");
  if (!confirmed) return;

  const result = await authClient.logout();
  if (!result.success) {
    window.alert(`Error logging out: ${result.message}`);
    return;
  }

  await checkAuth();
}

function wireMenuAuthAction() {
  if (!menuSignInOut) return;

  menuSignInOut.addEventListener("click", async (e) => {
    e.preventDefault();
    const isAuth = await authClient.isAuthenticated();
    if (isAuth) {
      await handleCRFVLogout();
      return;
    }

    sidePanel?.scrollIntoView({ behavior: "smooth", block: "center" });
    const userField = document.getElementById("crfvStudentID");
    if (userField) userField.focus();
  });
}

function updateMenuAuthLabel(isAuth) {
  if (!menuSignInOut) return;
  const icon = menuSignInOut.querySelector(".material-icons");
  const text = menuSignInOut.querySelector("span");

  if (icon) icon.textContent = isAuth ? "logout" : "login";
  if (text) text.textContent = isAuth ? "Sign Out" : "Sign In";
}

function setProtectedMenuDisabled(isDisabled) {
  protectedMenuLinks.forEach((link) => {
    if (isDisabled) {
      link.classList.add("panel-disabled");
      link.setAttribute("aria-disabled", "true");
      link.addEventListener("click", preventDisabledNavigation);
      return;
    }

    link.classList.remove("panel-disabled");
    link.removeAttribute("aria-disabled");
    link.removeEventListener("click", preventDisabledNavigation);
  });
}

function preventDisabledNavigation(e) {
  e.preventDefault();
  sidePanel?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function loadCRFVContent() {
  console.log("[CRFV] Content ready");
}

function wireMenuToggle() {
  if (!mobileMenuBtn || !headerNav) return;

  mobileMenuBtn.addEventListener("click", () => {
    const isExpanded = mobileMenuBtn.getAttribute("aria-expanded") === "true";
    mobileMenuBtn.setAttribute("aria-expanded", String(!isExpanded));
    headerNav.classList.toggle("active");
    menuBackdrop?.classList.toggle("active");
  });

  menuBackdrop?.addEventListener("click", () => {
    headerNav.classList.remove("active");
    mobileMenuBtn.setAttribute("aria-expanded", "false");
    menuBackdrop.classList.remove("active");
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}




