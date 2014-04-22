(function($) {
	var pageController = {
		/**
		 * @memberOf sample.PageController
		 */
		__name: 'sample.PageController',

		/**
		 * 通常のポップアップ
		 *
		 * @memberOf sample.PageController
		 * @param context
		 * @param $el
		 */
		'button.normal-popup click': function(context, $el) {
			h5.ui.popupManager.createPopup('sample', 'モーダレスダイアログ', 'サンプルです').show();
		},

		/**
		 * モーダレスダイアログ(オーバーレイのないダイアログ)を表示
		 *
		 * @memberOf sample.PageController
		 * @param context
		 * @param $el
		 */
		'button.modeless-popup click': function(context, $el) {
			h5.ui.popupManager.createPopup('sample', 'モーダレスダイアログ', 'サンプルです').show({
				overlay: false
			});
		},

		/**
		 * 動くダイアログ(draggableダイアログ)を表示
		 *
		 * @memberOf sample.PageController
		 * @param context
		 * @param $el
		 */
		'button.draggable-popup click': function(context, $el) {
			// draggable: trueを指定すると動くようになる
			h5.ui.popupManager.createPopup('sample', 'ドラッグ可能ポップアップ', 'サンプルです', null, {
				draggable: true
			}).show();
		},

		/**
		 * ポップアップの位置指定
		 *
		 * @memberOf sample.PageController
		 * @param context
		 * @param $el
		 */
		'button.top-popup click': function(context, $el) {
			var popup = h5.ui.popupManager.createPopup('sample', '位置指定ポップアップ', 'サンプルです');
			popup.setPosition('top');
			popup.setContentsSize(250, 50);
			popup.show();
		},

		/**
		 * ポップアップの位置指定
		 *
		 * @memberOf sample.PageController
		 * @param context
		 * @param $el
		 */
		'button.top-30px-popup click': function(context, $el) {
			var popup = h5.ui.popupManager.createPopup('sample', '位置指定ポップアップ', 'サンプルです');
			popup.setPosition(null, {
				top: 30
			});
			popup.setContentsSize(250, 50);
			popup.show();
		}
	};
	h5.core.expose(pageController);
})(jQuery);
$(function() {
	h5.core.controller('body', sample.PageController);
});