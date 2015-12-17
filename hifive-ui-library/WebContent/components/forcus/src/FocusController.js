(function() {
	var controller = {
		__name: 'h5.ui.components.focus.FocusController',
		__ready: function() {
			if (!$(this.rootElement).find(document.activeElement).length) {
				// バインド時に、外の要素にフォーカスが当たっていたら外す
				$(document.activeElement).blur();
			}
		},
		'{document} keydown': function(ctx, $doc) {
			// tabキー以外は何もしない
			if (ctx.event.keyCode !== 9) {
				return;
			}
			ctx.event.preventDefault();
			var doc = $doc[0];
			// ルートエレメント及びルートエレメント以下の要素でtabでフォーカスを当てられる要素を列挙
			// body要素はtabIndex===-1だが対象とする
			var $focusable = this.$find('*').filter(function(i, element) {
				return element.tabIndex !== -1;
			}).add(doc.body);

			// タブインデックス順にソート
			$focusable.sort(function(a, b) {
				var aIndex = a.tabIndex;
				var bIndex = b.tabIndex;
				return aIndex - bIndex;
			});
			var index = $focusable.index(doc.activeElement);
			if (index === -1) {
				// タブキーでフォーカスを当てられない要素にあたっていた場合は、
				// タブキーでフォーカスを当て垂れる要素のうち最初の要素にフォーカス
				index = 0;
			}
			var next = $focusable[index + 1];
			if (next) {
				$(next).focus();
			} else {
				doc.activeElement.blur();
			}
		}
	};
	h5.core.expose(controller);
})();