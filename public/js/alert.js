export const hideAlert = () => {
  const el = document.querySelector('.alert');
  if (el) el.parentElement.removeChild(el);
};

export const show_alert = (type, msg) => {
  hideAlert(); // we first run hide alert if there is any
  // Type is either success or error
  const markup = `<div class ="alert alert--${type}">${msg}</div>`;
  document.querySelector('body').insertAdjacentHTML('afterbegin', markup); // insert in the body but right at the beginning

  window.setTimeout(hideAlert, 5000);
};
