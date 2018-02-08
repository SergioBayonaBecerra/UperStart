"use strict";

Cu.import("resource://gre/modules/FileUtils.jsm");
const nsIFilePicker = Ci.nsIFilePicker;
let logger = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);
let exim = Cc['@enjoyfreeware.org/superstart;1'].getService(Ci.ssIExIm);
let defExt = exim.getDefExt();

let boolMap = {
	'import-sites-only': 'import-sites-only'
}

function showPanel(n) {
	let ids = ['main-panel', 'progress-panel', 'result-panel'];
	for (let i = 0; i < ids.length; ++ i) {
		let p = $$(ids[i]);
		i == n ? ($.removeClass(p, 'hidden')) : ($.addClass(p, 'hidden'));
		window.sizeToContent();
	}
}

function formatDate(d) { // format Date to 'yyyy-mm-dd'
	function pad(n) { return n < 10 ? '0' + n : n; }
	return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function getFP() {
	let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.defaultExtension = defExt;
	fp.appendFilter('Super Start backup', '*.' + defExt);
	fp.defaultString = 'superstart_' + formatDate(new Date()) + '.' + defExt;
	return fp;
}

/**
 * @input path name
 * @return path.ext if path is not eneded as '.ext'
 */
function addExtIfNotFound(path, ext) {
	let extPos = path.lastIndexOf('.' + ext);
	if (extPos === -1 || extPos != path.length - ext.length - 1) {
		if (path.length > 0 && path.charAt(path.length - 1) == '.') {
			path += ext;
		} else {
			path += '.' + ext;
		}
	}
	return path;
}


evtMgr.ready(function() {
	try {
		let hideId = 'dropbox-found';
		if (exim.isDropboxInstalled()) {
			hideId = 'dropbox-not-found';
		}
		$.addClass($$(hideId), 'hidden');

		let links = $('.text-link');
		for (let i = 0; i < links.length; ++ i) {
			let l = links[i];
			l.setAttribute('tooltiptext', l.getAttribute('href'));
			l.addEventListener('click', function() {
				$$('superstart-exim-dialog').cancelDialog();
			});
		}

		for (let id in boolMap) {
			let key = boolMap[id];
			let c = $$(id);
			if (c) {
				let enabled = cfg.getConfig(key);
				enabled && c.setAttribute('checked', true);
				c.addEventListener('command', onCheckboxChanged, false);
			}
		}

		$$('export-dropbox').addEventListener('click', function() {
			showPanel(1);
			window.setTimeout(function() {
				let pathName = exim.cloudExport();
				let result = pathName !== '' ? getString('ssExportSuccessfully') : getString('ssExportFailed');
				$$('result').textContent = result.replace('%file%', '"' + pathName + '"');
				showPanel(2);
			}, 0);
		});

		$$('dropbox-items').addEventListener('popupshowing', function(evt) {
			let menu = this;
			while (menu.hasChildNodes()) {
				menu.removeChild(menu.firstChild);
			}
			let items = exim.getCloudItems();
			if (items.length == 0) {
				let m = document.createElement("menuitem");
				m.setAttribute("label", getString('ssEmpty'));
				menu.appendChild(m);
			} else {
				items.forEach(function(item) {
					let m = document.createElement("menuitem");
					m.setAttribute('label', item);
					m.setAttribute('value', item);
					m.addEventListener("command", function() {
						showPanel(1);
						let fileName = this.getAttribute('value');
						window.setTimeout(function() {
							let res = exim.cloudImport(fileName, $$('import-sites-only').checked ? false : true);
							let result = res ? getString('ssImportSuccessfully') : getString('ssImportFailed');
							$$('result').textContent = result.replace('%file%', '"' + fileName + '"');
							showPanel(2);
						}, 0);
					}, false);
					menu.appendChild(m);
				});
			}
		}, false);

		$$('export').addEventListener('click', function() {
			let path = getExportFilePathName();
			if (path != '') {
				showPanel(1);
				window.setTimeout(function() {
					let res = exim.export(path);
					let f = FileUtils.File(path);
					let result = res ? getString('ssExportSuccessfully') : getString('ssExportFailed');
					$$('result').textContent = result.replace('%file%', '"' + f.leafName + '"');
					showPanel(2);
				}, 0);
			}
		});
		$$('import').addEventListener('click', function() {
			let path = getImportFilePathName();
			if (path != '') {
				showPanel(1);
				window.setTimeout(function() {
					let res = exim.import(path, $$('import-sites-only').checked ? false : true);
					let f = FileUtils.File(path);
					let result = res ? getString('ssImportSuccessfully') : getString('ssImportFailed');
					$$('result').textContent = result.replace('%file%', '"' + f.leafName + '"');
					showPanel(2);
				}, 0);
			}
		});
		showPanel(0);
	} catch (e) {
		logger.logStringMessage(e);
	}
});

function onCheckboxChanged(evt) {
	let cb = evt.target;
	let id = cb.id;
	let enabled = cb.checked;
	if (id && boolMap[id]) {
		cfg.setConfig(boolMap[id], enabled);
	}
}

function getExportFilePathName() {
	let fp = getFP();
	fp.init(window, getString('ssExportTo'), nsIFilePicker.modeSave);
	let res = fp.show();
	if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace) {
		return addExtIfNotFound(fp.file.path, defExt);
	}
	return '';
}

function getImportFilePathName() {
	let fp = getFP();
	fp.init(window, getString('ssImportFrom'), nsIFilePicker.modeOpen);
	let res = fp.show();
	if (res == nsIFilePicker.returnOK) {
		return fp.file.path;
	}
	return '';
}
