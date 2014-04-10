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
	var controller = {
		/**
		 * @memberOf sample.PageController
		 */
		__name: 'sample.PageController',

		/**
		 * テンプレート。ArrowBoxを使用するので、arrowbox.ejsを読み込む。
		 *
		 * @memberOf sample.PageController
		 */
		__templates: '../src/arrowbox.ejs',

		/**
		 * ArrowBoxControllerを子コントローラとして定義する
		 *
		 * @memberOf sample.PageController
		 */
		_arrowboxController: h5.ui.components.arrowbox.ArrowBoxController,

		/**
		 * @memberOf sample.PageController
		 */
		__ready: function() {
			// 吹き出しに表示するメッセージの設定
			this.view
					.register(
							'message',
							'<div><p>吹き出しサンプル</p><p>吹き出しサンプルです</p><button class="removeArrowBox" style="float:right">OK</button></div>');
		},

		/**
		 * 吹き出し表示ボタンクリック
		 *
		 * @memberOf sample.PageController
		 * @param context
		 */
		'.sampleDiv1 .sample-btn click': function(context, $el) {
			// 吹き出しを表示する方向を取得。up, down, left, rightのいずれか。
			var direction = $el.data('direction');
			// ボタン要素の親要素を吹き出しを表示するターゲットにする
			var $target = $el.parent();
			// createでArrowBoxインスタンスを作成
			var arrowbox = this._arrowboxController.create(this.view.get('message'));
			// 吹き出しの表示
			arrowbox.show({
				target: $target,
				direction: direction
			});
		},

		/**
		 * 吹き出しをクリックした箇所に表示
		 *
		 * @memberOf sample.PageController
		 * @param context
		 */
		'.sampleDiv2 click': function(context) {
			var x = context.event.pageX;
			var y = context.event.pageY;
			// 既にposition-setクラスを持つ吹き出しがあったら削除する
			var $arrowbox = this.$find('.position-set');
			// 吹き出しの要素からArrowBoxインスタンスを取得
			var preArrowbox = this._arrowboxController.getArrowBoxFromElement($arrowbox);
			// 吹き出しをdispose
			preArrowbox && preArrowbox.dispose();

			// 第2引数でクラスを追加する
			var arrowbox = this._arrowboxController.create(this.view.get('message'), {
				cls: 'position-set'
			});
			arrowbox.show({
				position: {
					left: x,
					top: y
				}
			});
		},

		/**
		 * 吹き出し内のOKボタンクリック。吹き出しを削除する。
		 *
		 * @memberOf sample.PageController
		 * @param context
		 */
		'.removeArrowBox click': function(context, $el) {
			// 吹き出し要素の取得
			var $arrowbox = $el.parents('.h5arrowbox');
			// ArrowBoxインスタンスの取り出し
			var arrowbox = this._arrowboxController.getArrowBoxFromElement($arrowbox);
			// 吹き出しの削除
			arrowbox.dispose();
		}
	};
	h5.core.expose(controller);
})();