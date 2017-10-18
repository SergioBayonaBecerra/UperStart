/**
 * created on 10/2/2012, on hospital, with my father
 */
"use strict";
(function() {
var engines = Cc['@mozilla.org/browser/search-service;1'].getService(Ci.nsIBrowserSearchService);
var id4ShowHide = { // use "onNavbarItemOnoff" to handle the events
	'navbar-recently-closed': 'nbb-recently-closed',
	'navbar-add-site': 'nbb-add-site',
	'navbar-themes': 'nbc-themes-pointer',
	'navbar-todo': 'nbc-notes-onoff',
	'navbar': 'navbar',
	'navbar-search': 'nb-search'
};

evtMgr.ready(function() {
	initPopupButton([
		{bid: 'nbb-recently-closed', mid: 'superstart-recently-closed-list', title: getString('ssRecentlyClosed')},
		{bid: 'nbc-themes-pointer', mid: 'superstart-themes-list-menu', title: getString('ssThemes')},
		{bid: 'nb-search-switcher', mid: 'superstart-search-engines-menu', title: ''},
		{bid: 'nb-search-favicon', mid: 'superstart-search-engines-menu', title: ''}
	]);
	initSearchBox();
	for (var k in id4ShowHide) {
		ob.subscribe(k, onNavbarItemOnoff);
		onNavbarItemOnoff(k);
	}
	ob.subscribe('searchengine', onSearchEngineChanged);
	onSearchEngineChanged();

});
evtMgr.clear(function() {
	engines = null;
	for (var k in id4ShowHide) {
		ob.unsubscribe(k, onNavbarItemOnoff);
	}
	ob.unsubscribe('searchengine', onSearchEngineChanged);
});

function initPopupButton(pops) {
	function onMouseDown(evt) {
		if (evt.button != 0) {
			return;
		}
		evt.preventDefault();
		evt.stopPropagation();

		var doc = $.getMainWindow().document;
		var b = evt.target;
		var m = doc.getElementById(b.mid);
		if (m) {
			if (m.state == 'closed') {
				var obj = doc.getElementById('browser').boxObject;
				var rc = b.getBoundingClientRect();
				var x = rc.left + obj.screenX, y = rc.top + obj.screenY;
				y += rc.height + 2;
				m.openPopupAtScreen(x, y, false);
				$.addClass(b, 'opened');
				m.addEventListener('popuphiding', onPopupHiding, true);
				m.bid = b.id;
			} else {
				m.hidePopup();
			}
		}
	}

	function onPopupHiding(evt) {
		var m = evt.target;
		var b = $$(m.bid);
		delete m.bid;
		$.removeClass(b, 'opened');
		m.removeEventListener('popuphiding', onPopupHiding, true);
	}

	for (var i = 0; i < pops.length; ++ i) {
		var p = pops[i];
		var b = $$(p.bid);
		b.mid = p.mid;
		if (p.title != '') {
			b.setAttribute('title', p.title);
		}
		b.addEventListener('mousedown', onMouseDown, true);
	}
	evtMgr.clear(function() {
		for (var i = 0; i < pops.length; ++ i) {
			var b = $$(p.bid);
			b.removeEventListener('mousedown', onMouseDown, true);
		}
	});
}

function initSearchBox() {
	var blurWhenMouseOut = true;
	var mouseIn = false;
	var sbar = $$('nb-search');
	var input = $$('nb-search-text');
	var focus = null;
	var map = [
		[sbar, 'mouseover', onMouseOver],
		[sbar, 'mouseout', onMouseOut],
		[input, 'focus', onFocus],
		[input, 'blur', onBlur],
		[input, 'keypress', onKeyPress],
		[input, 'click', onClick],
		[input, 'contextmenu', onContextMenu]
	];

	for (var i = 0; i < map.length; ++ i) {
		var m = map[i];
		m[0].addEventListener(m[1], m[2], false);
	}

	evtMgr.clear(function() {
		for (var i = 0; i < map.length; ++ i) {
			var m = map[i];
			m[0].removeEventListener(m[1], m[2], false);
		}
		sbar = input = focus = null;
	});

	function onMouseOver(evt) {
		if (mouseIn) {
			return;
		}

		mouseIn = true;
		if (document.activeElement == input) {
			blurWhenMouseOut = false;
		} else {
			blurWhenMouseOut = true;
		}

		focus = null;
		try {
			var f = $.getMainWindow().document.activeElement;
			if (f && f.tagName == 'html:input') {
				focus = f;
			}
		} catch (e) {
		}

		input.focus();
	}

	function onMouseOut(evt) {
		if (!mouseIn) {
			return;
		}

		if (evt.relatedTarget && sbar.contains(evt.relatedTarget)) {
			return;
		}

		mouseIn = false;
		if (blurWhenMouseOut) {
			input.blur();
			if (focus) {
				focus.focus();
			}
		}
		focus = null;
	}

	function onFocus(evt) {
		this.select();
		$.addClass(sbar, 'focus');
	}

	function onBlur() {
		this.setSelectionRange(0, 0);
		$.removeClass(sbar, 'focus');
	}

	function onKeyPress(evt) {
		blurWhenMouseOut = false;
		if (evt.keyCode == 13) {
			var text = this.value;
			if (text == '') {
				return;
			}
			this.select();

			var engine = cfg.getSearchEngine();
			var submission = engine.getSubmission(text);
			var url = submission.uri.spec;

			var wm = $.getMainWindow();
			var tb = wm.getBrowser();
			if (evt.shiftKey) {
				tb.selectedTab = tb.addTab(url);
			} else if (evt.ctrlKey || evt.metaKey) {
				tb.addTab(url);
			} else {
				if (cfg.getConfig('multiprocess') && wm.openUILinkIn) {
					wm.openUILinkIn(url, 'current');
				} else {
					document.location.href = url;
				}
			}
		} else if (evt.keyCode == 27) { // esc
			if (!mouseIn) {
				input.blur();
			} else {
				input.select();
			}
		}
	}

	function onClick(evt) {
		blurWhenMouseOut = false;
	}

	function onContextMenu(evt) {
		blurWhenMouseOut = false;
	}
}

function onNavbarItemOnoff(evt, onoff) {
	onoff = cfg.getConfig(evt);
	var id = id4ShowHide[evt];
	if (id !== undefined) {
		var b = $$(id);
		onoff ? $.removeClass(b, 'hidden') : $.addClass(b, 'hidden');
	}
}

function onSearchEngineChanged() {
	var engine = cfg.getSearchEngine();
	var favicon = $$('nb-search-favicon');
	if (engine.iconURI && engine.iconURI.spec) {
		favicon.setAttribute('src', engine.iconURI.spec);
	} else {
		favicon.setAttribute('src', '');
	}
	favicon.setAttribute('title', engine.name + ' - ' + getString('ssEnterToSearch'));
}

})();

