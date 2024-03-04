const addOfferForm = document.getElementById("addOfferForm");
const addOfferBookId = document.getElementById("bookId");
const addOfferDiscountPercentage = document.getElementById("discountPercentage");
const addOfferErrorElement = document.getElementById("addOfferError");

function hideAddOfferError() {
  addOfferErrorElement.innerHTML = "";
}

function showAddOfferError(message) {
  addOfferErrorElement.innerHTML = `<div class="alert alert-warning border border-warning w-80 d-flex justify-content-center fw-bold py-2" role="alert">${message}</div>`;
  setTimeout(() => {
    addOfferErrorElement.innerHTML = "";
  }, 3000);
}

function validateAddOffer() {
  if (addOfferBookId.value === "") {
    showAddOfferError("Please select a book.");
    return false;
  }

  if (addOfferDiscountPercentage.value === "" || addOfferDiscountPercentage.value.trim() === "") {
    showAddOfferError("Discount Percentage field is empty.");
    return false;
  }

  const discount = parseFloat(addOfferDiscountPercentage.value);
  if (isNaN(discount) || discount < 1 || discount > 100) {
    showAddOfferError("Discount Percentage must be a number between 1 and 100.");
    return false;
  }

  hideAddOfferError();
  return true;
}

addOfferForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (validateAddOffer()) {
      this.submit();
    }
  });