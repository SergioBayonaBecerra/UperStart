// dragging
"use strict";
var gDrag = (function() {

const HOVER = 500;

var elem = null;
var dragIdxes = null;
var timeoutId = null;

var mover = (function() {
	var pos = {left: 0, top: 0};
	var _x = 0;
	var _y = 0;
	function _init(se, x, y) {
		var rc = se.getBoundingClientRect();
		pos.left = x - rc.left;
		pos.top = y - rc.top;
	}

	function _onMove(el, x, y) {
		_x = x;
		_y = y;
		var rc = el.parentNode.getBoundingClientRect();
		var left = x - pos.left - rc.left + 'px';
		var top = y - pos.top - rc.top + 'px';
		el.style.transform = 'translate(' + left + ', ' + top + ')';
	}

	function _refresh(el) {
		_onMove(el, _x, _y);
	}

	return {
		init: _init,
		onMove: _onMove,
		refresh: _refresh
	};
})();

const DO_NONE = 0;
const DO_MOVE = 1;
const DO_MOVE_IN = 2;
const DO_MOVE_OUT = 3;
const DO_OPEN_FOLDER = 4;
function DragOperator(type, p1, p2, p3) {
	this.type = type === undefined ? DO_NONE : type;
	this.p1 = p1;
	this.p2 = p2;
	this.p3 = p3;
	if (this.type != DO_NONE) {
		// this.dump();
	}
}
DragOperator.prototype.isEqual = function(rhs) {
	if (this.type != rhs.type) {
		return false;
	}
	switch (this.type) {
	case DO_MOVE:
		return this.p1 == rhs.p1 && this.p2 == rhs.p2 && this.p3 == rhs.p3;
	case DO_MOVE_IN:
	case DO_MOVE_OUT:
		return this.p1 == rhs.p1 && this.p2 == rhs.p2;
	case DO_OPEN_FOLDER:
		return this.p1 == rhs.p1;
	}
	return false;
}
DragOperator.prototype.act = function() {
	switch (this.type) {
	case DO_MOVE:
		sm.simpleMove(this.p1, this.p2, this.p3);
		dragIdxes[1] = this.p3;
		break;
	case DO_MOVE_IN:
		var from = this.p1, to = this.p2;
		var target = sm.getSite(-1, to);
		sm.moveIn(from, to);
		dragIdxes[0] = from < to ? to - 1 : to;
		dragIdxes[1] = target.sites === undefined ? 1 : target.sites.length;
		mover.refresh(elem);
		break;
	case DO_MOVE_OUT:
		var g = this.p1, i = this.p2;
		sm.moveOut(g, i);
		dragIdxes[0] = -1;
		dragIdxes[1] = sm.getTopSiteCount() - 1;
		mover.refresh(elem);
		break;
	case DO_OPEN_FOLDER:
		gSites.openFolder(this.p1);
		// TODO: if the user drop here, whether there will be a problem???
		// that is, onDrop will get called before the timer handler, and elem will be null...
		window.setTimeout(function() {
			var fa = $$('folder');
			elem.parentNode.removeChild(elem);
			fa.appendChild(elem);
			mover.refresh(elem);
		}, 0);
		break;
	default:
		break;
	}
}
DragOperator.prototype.dump = function() {
	log('type: ' + this.type + ' p1, p2, p3: ' + this.p1 + ', ' + this.p2 + ', ' + this.p3);
}

var currOpt = new DragOperator();

function init() {
	elem = null;
	dragIdxes = null;
	clrTimeout();
}

function clrTimeout() {
	if (timeoutId != null) {
		clearTimeout(timeoutId);
		timeoutId = null;
	}
}

function getMoveOpt(x, y, parentArea, inFolder) {
	var ses = $(parentArea, '.site');

	var l = ses.length;
	var prevX = -1;
	var prevY = 0;
	var isPlaceHolder = $.hasClass(elem, 'placeholder');
	for (var i = 0; i < l; ++ i) {
		var se = ses[i];
		if ($.hasClass(se, 'dragging')) { // skip myself
			continue;
		}

		var sn = $$$(se, '.site-snapshot');
		if (!inFolder && !isPlaceHolder && !$.hasClass(elem, 'folder') && !$.hasClass(se, 'placeholder')) {
			if ($.inElem(x, y, sn)) {
				return new DragOperator(DO_MOVE_IN, dragIdxes[1], i);
			}
		}

		var pos = $.getPosition(se);
		if (pos.left < prevX) {
			if (prevY > y && x > prevX + sn.clientWidth / 2) {
				break;
			}
		}

		if ((pos.left + sn.clientWidth / 2) > x && (pos.top + se.clientHeight) > y) {
			break;
		}

		prevX = pos.left;
		prevY = pos.top + se.clientHeight;
	}

	var from = dragIdxes[1];
	var to = i;
	if (from < to) {
		-- to;
	}
	if (from == to) {
		return new DragOperator();
	}

	return new DragOperator(DO_MOVE, dragIdxes[0], from, to);
}

function getOpt(x, y) {
	var sites = $$('sites');
	var fa = $$('folder');
	if (dragIdxes[0] != -1) {
		var p = gSites.at(-1, dragIdxes[0]);
		var sn = $$$(p, '.site-snapshot');
		if (fa == null) {
			if ($.inElem(x, y, sn)) {
				return new DragOperator(DO_OPEN_FOLDER, dragIdxes[0]);
			} else {
				return new DragOperator(DO_MOVE_OUT, dragIdxes[0], dragIdxes[1]);
			}
		} else {
			var rc = $.getPosition(sn);
			if ($.inElem(x, y, sn) || ($.inElem(x, y, p) && y >= rc.top + rc.height)) {
				return new DragOperator();
			} else if ($.inElem(x, y, fa)) {
				var p = fa;
				return getMoveOpt(x, y, p, true);
			} else {
				return new DragOperator(DO_MOVE_OUT, dragIdxes[0], dragIdxes[1]);
			}
		}
	}

	var p = sites;
	return getMoveOpt(x, y, p, false);
}

var dmnsps = {
	'site': '',
	'folder': '',
	'placeholder': ''
};
function enterDraggingMode() {
	tmplMgr.changeElementsClass(dmnsps, '.site', 'add', 'in-dragging');
}

function leaveDraggingMode() {
	tmplMgr.changeElementsClass(dmnsps, '.site', 'remove', 'in-dragging');
}

evtMgr.clear(function() {
	gDrag = null;
});

return {
	inDragging: function() {
		return elem != null;
	},

	onStart: function(evt) {
		init();
	
		var se = gSites.elemFromNode(evt.target);
		if (!se || $.hasClass(se, 'opened') || !$.hasClass(se, 'site')) {
			evt.preventDefault();
			return false;
		}
	
		var idxes = gSites.indexFromNode(se);
		var s = idxes != null ? sm.getSite(idxes[0], idxes[1]) : null;
		if (s != null) {
			elem = se;
			$.addClass(se, 'dragging');
	
			var dt = evt.dataTransfer;
			dt.setData("text/uri-list", s.url);
			dt.setData("text/plain", s.url);
			dt.effectAllowed = 'move';
			var img = document.createElement('div');
			$.addClass(img, 'drag-elem');
			dt.setDragImage(img, 0, 0);
	
			mover.init(se, evt.clientX, evt.clientY);

			dragIdxes = idxes;

			enterDraggingMode();
			evt.stopPropagation();
		}
	},
	
	onEnter: function(evt) {
		if (elem) {
			evt.stopPropagation();
			evt.preventDefault();
			return false;
		}
	},
	
	onLeave: function(evt) {
		if (elem) {
			evt.stopPropagation();
			evt.preventDefault();
			return false;
		}
	},
	
	onOver: function(evt) {
		if (elem) {
			evt.stopPropagation();
			evt.preventDefault();
			evt.dataTransfer.dropEffect = "move";
	
			var x = evt.clientX;
			var y = evt.clientY;
			mover.onMove(elem, x, y);

			var newOpt = getOpt(evt.clientX + window.pageXOffset, evt.clientY + window.pageYOffset);
			if (!newOpt.isEqual(currOpt)) {
				clrTimeout(timeoutId);
				currOpt = newOpt;
				if (currOpt.type != DO_NONE) {
					timeoutId = window.setTimeout(function() {
						timeoutId = null;
						currOpt.act();
						currOpt = new DragOperator();
					}, HOVER);
				}
			}
	
			return false;
		}
	},
	
	onDrop: function(evt) {
		if (elem) {
			evt.stopPropagation();
			evt.preventDefault();
			return false;
		} else {
			var dt = evt.dataTransfer;
			var link = dt.getData("text/uri-list");
			if (link != '') {
				sm.addSite(link, '', 0, false, '');
				evt.stopPropagation();
				evt.preventDefault();
				return false;
			}
		}
	},
	
	onEnd: function(evt) {
		if (elem) {
			clrTimeout(timeoutId);
	
			$.removeClass(elem, 'dragging');
			if (dragIdxes[0] != -1) {
				if ($.hasClass(elem.parentNode, 'site')) {
					elem.parentNode.removeChild(elem);
					var fa = $$('folder');
					if (fa) {
						fa.appendChild(elem);
					}
				}
				if ($$('folder') == null) {
					layout.layoutTopSites();
				}
			}
	
			var [x, y] = elem.pos;
			elem.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
			elem = null;
			leaveDraggingMode();

			evt.stopPropagation();
			evt.preventDefault();
			return false;
		}
	}
};
})();
