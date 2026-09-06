const signupForm = document.querySelector('#signup-form');
const emailInput = document.querySelector('#email');
const submitButton = document.querySelector('#submit-button');
const formMessage = document.querySelector('#form-message');

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  formMessage.className = 'form-message';

  if (!emailInput.checkValidity()) {
    emailInput.reportValidity();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Submitting…';

  try {
    const response = await fetch(signupForm.action, {
      method: 'POST',
      body: new FormData(signupForm),
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) throw new Error('Formspree submission failed');

    signupForm.hidden = true;
    formMessage.textContent = 'Clearance received.';
    formMessage.classList.add('is-success');
  } catch (error) {
    formMessage.textContent = 'Unable to submit right now. Please try again.';
    submitButton.disabled = false;
    submitButton.textContent = 'Sign up';
  }
});
