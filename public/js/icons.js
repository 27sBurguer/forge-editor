const ICONS = {
	chevronRight: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
	chevronDown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
	folder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2.5h6.5A2.5 2.5 0 0 1 21 10v6.5A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z"/></svg>',
	script: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l3 3V20a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5z"/><path d="M14 3.5V7h3.5"/><path d="M9 12l-2 2 2 2"/><path d="M14.5 12l2 2-2 2"/><path d="M12.8 11l-1.6 6"/></svg>',
	localScript: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l3 3V20a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5z"/><path d="M14 3.5V7h3.5"/><path d="M9 15h6"/><path d="M9 11h4"/></svg>',
	module: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 20 8v8l-8 4.5L4 16V8z"/><path d="M12 12.5 20 8"/><path d="M12 12.5 4 8"/><path d="M12 12.5v8"/></svg>',
	root: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 20.5 8v8L12 20.5 3.5 16V8z"/><path d="M12 8v8"/><path d="M8 10.5h8"/><path d="M8 13.5h8"/></svg>',
	instance: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5 19.5 12 12 19.5 4.5 12z"/></svg>',
	plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
	trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/><path d="M8 7l.7 12A1.5 1.5 0 0 0 10.2 20.5h3.6a1.5 1.5 0 0 0 1.5-1.5L16 7"/><path d="M10.5 10.5v6"/><path d="M13.5 10.5v6"/></svg>',
	close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>',
};

export function svgIcon(name) {
	return ICONS[name] || ICONS.instance;
}

export function setIcon(element, name) {
	element.innerHTML = svgIcon(name);
}
