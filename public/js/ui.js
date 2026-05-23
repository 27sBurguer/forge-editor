let refs = null;
let confirmResolver = null;

export function setupUi(elements) {
	refs = elements;
}

export function setStatus(message, type) {
	if (!refs) return;

	refs.statusEl.textContent = message;
	refs.statusEl.className = "status";

	if (type) {
		refs.statusEl.classList.add(type);
	}

	refs.footerLeft.textContent = message;
}

export function showToast(message, type) {
	if (!refs) return;

	const item = document.createElement("div");
	item.className = "toast" + (type ? " " + type : "");
	item.textContent = message;
	refs.toastStack.appendChild(item);

	setTimeout(() => {
		item.style.opacity = "0";
		item.style.transform = "translateY(8px)";
	}, 2600);

	setTimeout(() => {
		if (item.parentNode) {
			item.parentNode.removeChild(item);
		}
	}, 3050);
}

export function requestConfirm(options) {
	refs.confirmTitle.textContent = options.title || "Confirm";
	refs.confirmMessage.textContent = options.message || "Are you sure?";
	refs.acceptConfirmButton.textContent = options.acceptText || "Confirm";
	refs.confirmModal.classList.add("open");

	return new Promise(resolve => {
		confirmResolver = resolve;
	});
}

export function closeConfirm(value) {
	if (!refs) return;

	refs.confirmModal.classList.remove("open");

	if (confirmResolver) {
		const resolver = confirmResolver;
		confirmResolver = null;
		resolver(value);
	}
}
