(() => {
  "use strict";
  const q = id => document.getElementById(id);
  const login = q("loginForm");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "light";
  button.textContent = "Forgot / Change Password";
  login.append(button);

  const dialog = document.createElement("dialog");
  dialog.style.cssText = "width:min(420px, calc(100% - 32px));border:0;border-radius:14px;padding:24px";
  dialog.innerHTML = `<form>
    <h2>Change Employee Password</h2>
    <p>Use your current password to change it. If you forgot it, ask your admin to reset it.</p>
    <label>Employee User ID<input name="employee" autocomplete="username" maxlength="200" required></label>
    <label>Current password<input name="current" type="password" autocomplete="current-password" maxlength="1024" required></label>
    <label>New password<input name="next" type="password" autocomplete="new-password" minlength="4" maxlength="72" required></label>
    <label>Confirm new password<input name="confirm" type="password" autocomplete="new-password" minlength="4" maxlength="72" required></label>
    <p role="status" aria-live="polite"></p>
    <button type="submit">Save Password</button>
    <button type="button" class="light" data-close>Cancel</button>
  </form>`;
  document.body.append(dialog);
  const form = dialog.querySelector("form");
  const status = form.querySelector('[role="status"]');
  const submit = form.querySelector('[type="submit"]');
  const cancel = form.querySelector("[data-close]");

  button.onclick = () => {
    form.reset();
    status.textContent = "";
    form.elements.employee.value = q("loginId").value.trim();
    dialog.showModal();
    (form.elements.employee.value ? form.elements.current : form.elements.employee).focus();
  };
  cancel.onclick = () => dialog.close();
  dialog.addEventListener("cancel", event => { if (submit.disabled) event.preventDefault(); });
  dialog.addEventListener("close", () => { form.reset(); status.textContent = ""; });

  form.onsubmit = async event => {
    event.preventDefault();
    if (submit.disabled) return;
    const { employee, current, next, confirm } = form.elements;
    if (next.value !== confirm.value) {
      status.textContent = "New passwords do not match.";
      confirm.focus();
      return;
    }
    if (new TextEncoder().encode(next.value).length > 72) {
      status.textContent = "New password is too long. Use a shorter password.";
      return;
    }

    submit.disabled = cancel.disabled = true;
    status.textContent = "Saving password…";
    try {
      const id = employee.value.trim();
      const endpoint = MMA_CONFIG.employeeGateway.replace(
        /\/functions\/v1\/employee-gateway$/, "/rest/v1/rpc/mma667_employee_change_password"
      );
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: MMA_CONFIG.publicKey },
        body: JSON.stringify({ p_login: id, p_current_password: current.value, p_new_password: next.value })
      });
      const data = await response.json();
      if (!response.ok) throw Object.assign(Error("Password change request failed."), { code: data?.code });
      if (!data?.ok) {
        status.textContent = data?.error || "Password could not be changed.";
        return;
      }
      q("loginId").value = id;
      q("loginPassword").value = "";
      dialog.close();
      q("loginMessage").textContent = "Password changed. Sign in with your new password.";
      q("loginPassword").focus();
    } catch (error) {
      status.textContent = error.code === "PGRST202"
        ? "Change Password has not been installed on the server yet."
        : "Password could not be changed. Please try again.";
    } finally {
      current.value = next.value = confirm.value = "";
      submit.disabled = cancel.disabled = false;
    }
  };

})();
