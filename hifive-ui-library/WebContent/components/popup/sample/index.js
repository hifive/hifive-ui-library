/*
 * Copyright (C) 2013-2014 NS Solutions Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
 (function($) {
	 var count = 0;

	h5.u.obj.expose('sample', {
		showPopup: function(modal) {
			var content = h5.core.view.get('multi-popup', {
				modal: modal
			});
			var popup = h5.ui.popupManager.createPopup('sample' + count, '複数階層ポップアップ' + count, content, sample.popupController, {
				draggable: true
			});
			count++;
			popup.setContentsSize(250, 100);
			popup.show({
				overlay: modal
			});
			popup.setPosition(null, {
				top: count * 50,
				left: count * 50
			});
			return popup;
		}
	});
})(jQuery);
(function($) {
	var popupController = {
		__name: 'sample.popupController',

		'.modal click': function() {
			sample.showPopup(true);
		},
		'.modeless click': function() {
			sample.showPopup(false);
		}
	};
	h5.core.expose(popupController);
})(jQuery);
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
		},

		'button.multi-popup click': function(context, $el) {
			sample.showPopup(true);
		}
	};
	h5.core.expose(pageController);
})(jQuery);
$(function() {
	h5.core.controller('body', sample.PageController);
});