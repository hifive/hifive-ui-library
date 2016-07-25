/*
 * Copyright (C) 2012-2014 NS Solutions Corporation
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
(function() {
	var fwLogger = h5.log.createLogger('h5.ui.components.arrowbox.ArrowBoxController');

	var MSG_CANNOT_CALL_METHOD_DISPOSED = fwLogger.info('dispose済みのArrowBoxは操作できません');

	/** 吹き出し(三角の部分)の大きさ * */
	var ARROW_SIZE = 34;

	/**
	 * ArrowBoxクラス
	 *
	 * @class
	 */
	function ArrowBox(arrowboxTmpl, content, option) {
		// display:noneで追加する
		this._$arrowbox = $(arrowboxTmpl).css('display', 'none');
		this.setContent(content);
		$(document.body).append(this._$arrowbox);
		// ArrowBoxインスタンスを要素に持たせる
		this._$arrowbox.data('h5arrowbox', this);

		option = option || {};
		// クラスの追加
		if (option.cls) {
			this._$arrowbox.addClass(option.cls);
		}
	}
	$.extend(ArrowBox.prototype, {
		show: function(option) {
			if (this._isDisposed) {
				fwLogger.info(MSG_CANNOT_CALL_METHOD_DISPOSED);
				return;
			}
			var $arrowbox = this._$arrowbox;

			// 吹き出しの消去
			this.hide();

			// 吹き出しの表示(位置調整の前に表示して、offset()で位置とサイズを取得できるようにする)
			$arrowbox.css('display', 'block');

			// optionが指定されていない場合は表示して終わり(前に表示した箇所に表示される)
			if (!option) {
				return;
			}

			// directionが指定されてなければデフォルトは'up'
			var direction = option.direction || 'up';
			$arrowbox.addClass(direction);

			// positionまたはtargetから表示位置を取得する
			// positionまたはtargetはどちらかの指定が必須。
			var position = option.position;
			var $target = $(option.target);
			var targetW = position ? 0 : $target.outerWidth();
			var targetH = position ? 0 : $target.outerHeight();
			var arrowboxPosition = position ? $.extend({}, position) : {
				top: $target.offset().top,
				left: $target.offset().left
			};
			// $targetと$arrowboxの左上の位置を合わせる
			if (direction === 'up' || direction === 'down') {
				// 吹き出しの位置が$targetの真ん中に来るように合わせる
				arrowboxPosition.left += (targetW - $arrowbox.outerWidth()) / 2;
				if (direction === 'up') {
					// 吹き出し分だけ上に移動
					arrowboxPosition.top -= $arrowbox.outerHeight() + ARROW_SIZE;
				} else {
					// $target分だけ下に移動
					arrowboxPosition.top += targetH + ARROW_SIZE;
				}
			} else {
				// 吹き出しの位置が$targetの真ん中に来るように合わせる
				arrowboxPosition.top += (targetH - $arrowbox.outerHeight()) / 2;
				if (direction === 'left') {
					// 吹き出し分だけ左に移動
					arrowboxPosition.left -= $arrowbox.outerWidth() + ARROW_SIZE;
				} else {
					// $target分だけ下に移動
					arrowboxPosition.left += targetW + ARROW_SIZE;
				}
			}

			// 吹き出し位置
			$arrowbox.css(arrowboxPosition);
		},
		hide: function() {
			if (this._isDisposed) {
				fwLogger.info(MSG_CANNOT_CALL_METHOD_DISPOSED);
				return;
			}
			this._$arrowbox.css('display', 'none');
		},
		setContent: function(content) {
			if (this._isDisposed) {
				fwLogger.info(MSG_CANNOT_CALL_METHOD_DISPOSED);
				return;
			}
			this._$arrowbox.children().remove();
			this._$arrowbox.append(content);
		},
		dispose: function() {
			if (this._isDisposed) {
				fwLogger.info(MSG_CANNOT_CALL_METHOD_DISPOSED);
				return;
			}
			// 吹き出しの削除
			this.hide();
			this._$arrowbox.remove();
			this._$arrowbox = null;
		}
	});

	/**
	 * ArrowBoxController定義
	 *
	 * @name h5.ui.components.arrowbox.ArrowBoxController
	 * @namespace
	 */
	var arrowboxController = {

		/**
		 * コントローラ名
		 *
		 * @memberOf h5.ui.components.arrowbox.ArrowBoxController
		 * @type String
		 */
		__name: 'h5.ui.components.arrowbox.ArrowBoxController',

		/**
		 * テンプレート
		 *
		 * @memberOf h5.ui.components.arrowbox.ArrowBoxController
		 * @type String
		 */
		__templates: null,

		/**
		 * ArrowBoxのテンプレート
		 *
		 * @memberOf h5.ui.components.arrowbox.ArrowBoxController
		 */
		_arrowboxTmpl: null,

		/**
		 * ライフサイクルイベント __ready
		 *
		 * @memberOf h5.ui.components.arrowbox.ArrowBoxController
		 * @param context
		 */
		__ready: function(context) {
			try {
				this._arrowboxTmpl = this.view.get('h5arrowbox');
			} catch (e) {
				fwLogger
						.error('h5arrowboxのテンプレートがありません。コントローラの引数でarrowbox.ejsのテンプレートパスを渡すか、親コントローラまたは共通ビュー(h5.core.view)で設定する必要があります');
				throw e;
			}
		},

		/**
		 * ArrowBoxインスタンスを作って返す
		 *
		 * @memberOf h5.ui.components.arrowbox.ArrowBoxController
		 * @param {String|DOM|jQuery} content 吹き出しの中身
		 */
		create: function(content, option) {
			return new ArrowBox(this._arrowboxTmpl, content, option);
		},

		/**
		 * ArrowBoxのDOM要素からArrowBoxインスタンスを取得して返す
		 *
		 * @memberOf h5.ui.components.arrowbox.ArrowBoxController
		 * @param {DOM|jQuery|String} elm 要素またはセレクタ
		 */
		getArrowBoxFromElement: function(elm) {
			var $elm = $(elm);
			if ($elm.length > 1) {
				fwLogger.error('getArrowBoxFromElementには一つの要素または、一つの要素にマッチするセレクタを渡してください。');
			}
			return $elm.data('h5arrowbox');
		}
	};

	h5.core.expose(arrowboxController);
})();