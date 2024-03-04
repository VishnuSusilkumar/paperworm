const editOfferForm = document.getElementById("editOfferForm");
const newDiscountPercentage = document.getElementById("newDiscountPercentage");
const editOfferErrorElement = document.getElementById("editOfferError");

function hideEditOfferError() {
  editOfferErrorElement.innerHTML = "";
}

function showEditOfferError(message) {
  editOfferErrorElement.innerHTML = `<div class="alert alert-warning border border-warning w-80 d-flex justify-content-center fw-bold py-2" role="alert">${message}</div>`;
  setTimeout(() => {
    editOfferErrorElement.innerHTML = "";
  }, 3000);
}

function validateEditOffer() {
  if (newDiscountPercentage.value === "" || newDiscountPercentage.value.trim() === "") {
    showEditOfferError("New Discount Percentage field is empty.");
    return false;
  }

  const discount = parseFloat(newDiscountPercentage.value);
  if (isNaN(discount) || discount < 1 || discount > 100) {
    showEditOfferError("New Discount Percentage must be a number between 1 and 100.");
    return false;
  }

  hideEditOfferError();
  return true;
}

editOfferForm.addEventListener("submit", function (event) {
  event.preventDefault();
  if (validateEditOffer()) {
    this.submit();
  }
});