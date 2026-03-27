document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Auth elements
  const authBtn = document.getElementById("auth-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loggedInLabel = document.getElementById("logged-in-label");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const cancelLogin = document.getElementById("cancel-login");
  const signupContainer = document.getElementById("signup-container");

  // --- Auth state ---
  function getToken() { return sessionStorage.getItem("teacherToken"); }
  function getUsername() { return sessionStorage.getItem("teacherUsername"); }
  function isLoggedIn() { return !!getToken(); }

  function applyAuthState() {
    const loggedIn = isLoggedIn();
    authBtn.classList.toggle("hidden", loggedIn);
    logoutBtn.classList.toggle("hidden", !loggedIn);
    loggedInLabel.classList.toggle("hidden", !loggedIn);
    if (loggedIn) loggedInLabel.textContent = `👤 ${getUsername()}`;
    signupContainer.classList.toggle("hidden", !loggedIn);
    // Show/hide delete buttons
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.classList.toggle("hidden", !loggedIn);
    });
  }

  // Open login modal
  authBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    loginError.classList.add("hidden");
    loginForm.reset();
  });

  // Close login modal
  cancelLogin.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  // Close modal when clicking the backdrop
  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) loginModal.classList.add("hidden");
  });

  // Handle login form submit
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    try {
      const response = await fetch(
        `/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );
      if (response.ok) {
        const data = await response.json();
        sessionStorage.setItem("teacherToken", data.token);
        sessionStorage.setItem("teacherUsername", data.username);
        loginModal.classList.add("hidden");
        applyAuthState();
      } else {
        const err = await response.json();
        loginError.textContent = err.detail || "Login failed";
        loginError.classList.remove("hidden");
      }
    } catch {
      loginError.textContent = "Login failed. Please try again.";
      loginError.classList.remove("hidden");
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", async () => {
    const token = getToken();
    if (token) {
      await fetch("/logout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
    }
    sessionStorage.removeItem("teacherToken");
    sessionStorage.removeItem("teacherUsername");
    applyAuthState();
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn${isLoggedIn() ? "" : " hidden"}" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });

      applyAuthState();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${getToken()}` }
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${getToken()}` }
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  applyAuthState();
  fetchActivities();
});
